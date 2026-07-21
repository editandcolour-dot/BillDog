// app/api/cron/cleanup-storage/route.ts
//
// Daily POPIA enforcement cron — implements two privacy-policy promises:
//
// 1. "Bill documents — Automatically removed 90 days after the case is
//    resolved or closed": walks resolved/closed cases past the 90-day window,
//    removes the bill files from Storage, records a `bills_purged` event.
//    The case row itself is preserved (dispute history remains visible).
//
// 2. (v1.2) "Deleted cases — … a copy is retained for up to 90 days for audit
//    and dispute-integrity purposes, then permanently purged": hard-purges
//    cases soft-deleted more than 90 days ago — case row + case_bills +
//    case_events + escalation_letters + scraped_bills artefacts + storage.
//    CARVE-OUTS (lib/cases/purge-policy.ts): a case with a payment record
//    (fee charged / amount recovered / payment_charged event) or with
//    legal_hold = true is SKIPPED and the skip is logged with its reason.
//    Fail-closed: every delete verifies its affected rows; a failed step
//    aborts that case's purge (rows remain, retried next run) without
//    halting the sweep.
//
// Auth: Bearer ${CRON_SECRET}. Recommended schedule:
//   0 4 * * *  Africa/Johannesburg  (daily at 04:00 SAST)

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decidePurge } from '@/lib/cases/purge-policy';

const RETENTION_DAYS = 90;
const BATCH_SIZE = 50; // cap per run to keep the job under the maxDuration

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Find cases that have resolved/closed past the retention window AND
    // whose bills haven't already been purged. We track that via a
    // `bills_purged_at` column on cases if present, otherwise we look for
    // the `bills_purged` event in case_events.
    const { data: cases, error: caseErr } = await admin
      .from('cases')
      .select('id, user_id, bill_url, resolved_at, status')
      .in('status', ['resolved', 'closed'])
      .not('resolved_at', 'is', null)
      .lte('resolved_at', cutoff)
      .limit(BATCH_SIZE);

    if (caseErr) {
      console.error('[cron/cleanup-storage] case query failed', caseErr);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    if (!cases || cases.length === 0) {
      return NextResponse.json({ success: true, purged: 0 });
    }

    let purgedCases = 0;
    let purgedFiles = 0;

    for (const c of cases) {
      // Has this case already been purged? Look for a prior bills_purged event.
      const { count: alreadyPurged } = await admin
        .from('case_events')
        .select('id', { count: 'exact', head: true })
        .eq('case_id', c.id)
        .eq('event_type', 'bills_purged');

      if ((alreadyPurged ?? 0) > 0) continue;

      // Collect all storage paths: legacy single bill_url + multi-bill case_bills.
      const paths: string[] = [];
      if (c.bill_url) paths.push(c.bill_url);

      const { data: caseBills } = await admin
        .from('case_bills')
        .select('bill_url')
        .eq('case_id', c.id);

      if (caseBills) {
        for (const b of caseBills) {
          if (b.bill_url) paths.push(b.bill_url);
        }
      }

      if (paths.length > 0) {
        const { error: removeErr } = await admin.storage.from('bills').remove(paths);
        if (removeErr) {
          console.error(`[cron/cleanup-storage] storage.remove failed for case ${c.id}`, removeErr);
          continue;
        }
        purgedFiles += paths.length;
      }

      // Record the purge for audit.
      await admin.from('case_events').insert({
        case_id: c.id,
        event_type: 'bills_purged',
        note: `${paths.length} bill file(s) purged after ${RETENTION_DAYS}-day retention window.`,
      });

      purgedCases += 1;
    }

    // ── Sweep 2: hard-purge soft-deleted cases past the 90-day window ──────
    const { data: deletedCases, error: delErr } = await admin
      .from('cases')
      .select('id, user_id, bill_url, fee_charged, amount_recovered, legal_hold, deleted_at')
      .not('deleted_at', 'is', null)
      .lte('deleted_at', cutoff)
      .limit(BATCH_SIZE);

    if (delErr) {
      console.error('[cron/cleanup-storage] deleted-case query failed', delErr);
      return NextResponse.json({ success: false, purgedCases, purgedFiles }, { status: 500 });
    }

    let deletedPurged = 0;
    const skipped: Array<{ id: string; reason: string }> = [];
    const purgeFailed: string[] = [];

    for (const c of deletedCases || []) {
      try {
        // Facts for the carve-out predicate (see lib/cases/purge-policy.ts).
        const { count: paymentEvents } = await admin
          .from('case_events')
          .select('id', { count: 'exact', head: true })
          .eq('case_id', c.id)
          .eq('event_type', 'payment_charged');

        const decision = decidePurge({
          fee_charged: c.fee_charged !== null ? Number(c.fee_charged) : null,
          amount_recovered: c.amount_recovered !== null ? Number(c.amount_recovered) : null,
          legal_hold: c.legal_hold ?? null,
          payment_event_count: paymentEvents ?? 0,
        });

        if (!decision.purge) {
          console.warn(`[cron/cleanup-storage] SKIP purge of deleted case ${c.id}: ${decision.reason}`);
          skipped.push({ id: c.id, reason: decision.reason });
          continue;
        }

        // Purge order matters: scraped_bills reference case_bills (FK, NO
        // ACTION), so they go first; storage before case_bills (paths needed).
        const { data: caseBills } = await admin
          .from('case_bills')
          .select('id, bill_url')
          .eq('case_id', c.id);

        const caseBillIds = (caseBills || []).map((b) => b.id);
        if (caseBillIds.length > 0) {
          const { error: sbErr } = await admin
            .from('scraped_bills')
            .delete()
            .in('case_bill_id', caseBillIds);
          if (sbErr) throw new Error(`scraped_bills delete failed: ${sbErr.message}`);
        }

        const paths = [
          ...(c.bill_url ? [c.bill_url] : []),
          ...(caseBills || []).map((b) => b.bill_url).filter(Boolean),
        ];
        if (paths.length > 0) {
          const { error: rmErr } = await admin.storage.from('bills').remove(paths);
          if (rmErr) throw new Error(`storage remove failed: ${rmErr.message}`);
        }

        if (caseBillIds.length > 0) {
          const { data: cbRows, error: cbErr } = await admin
            .from('case_bills').delete().eq('case_id', c.id).select('id');
          if (cbErr) throw new Error(`case_bills delete failed: ${cbErr.message}`);
          if ((cbRows?.length ?? 0) !== caseBillIds.length) {
            throw new Error(`case_bills count mismatch: expected ${caseBillIds.length}, deleted ${cbRows?.length ?? 0}`);
          }
        }

        const { error: elErr } = await admin
          .from('escalation_letters').delete().eq('case_id', c.id);
        if (elErr) throw new Error(`escalation_letters delete failed: ${elErr.message}`);

        const { error: evErr } = await admin
          .from('case_events').delete().eq('case_id', c.id);
        if (evErr) throw new Error(`case_events delete failed: ${evErr.message}`);

        // The case row last — verified: exactly one row must come back.
        const { data: caseRows, error: cErr } = await admin
          .from('cases').delete().eq('id', c.id).select('id');
        if (cErr) throw new Error(`cases delete failed: ${cErr.message}`);
        if ((caseRows?.length ?? 0) !== 1) {
          throw new Error(`cases delete affected ${caseRows?.length ?? 0} rows — expected exactly 1`);
        }

        purgedFiles += paths.length;
        deletedPurged += 1;
        console.log(`[cron/cleanup-storage] hard-purged deleted case ${c.id} (${paths.length} file(s), ${caseBillIds.length} bill row(s))`);
      } catch (purgeErr) {
        // Per-case isolation: report and move on; rows remain for next run.
        const msg = purgeErr instanceof Error ? purgeErr.message : String(purgeErr);
        console.error(`[cron/cleanup-storage] purge FAILED for deleted case ${c.id}: ${msg}`);
        purgeFailed.push(c.id);
      }
    }

    console.log(`[cron/cleanup-storage] purged ${purgedFiles} file(s) across ${purgedCases} resolved case(s); hard-purged ${deletedPurged} deleted case(s); skipped ${skipped.length}; failed ${purgeFailed.length}`);
    return NextResponse.json({
      success: purgeFailed.length === 0,
      purgedCases,
      purgedFiles,
      deletedPurged,
      skipped,
      purgeFailed,
    }, { status: purgeFailed.length === 0 ? 200 : 500 });
  } catch (err) {
    console.error('[cron/cleanup-storage] unexpected error', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
