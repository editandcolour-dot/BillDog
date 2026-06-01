// app/api/cron/cleanup-storage/route.ts
//
// Daily POPIA enforcement cron — implements the privacy policy promise:
// "Bill documents — Automatically removed 90 days after the case is resolved
// or closed". Walks resolved/closed cases past the 90-day window, removes
// the underlying bill files from Supabase Storage, and records a
// `bills_purged` event on each case for audit trail.
//
// The case row itself is preserved (so the dispute history remains visible)
// — only the source bill PDFs are removed.
//
// Auth: Bearer ${CRON_SECRET}. Recommended schedule:
//   0 4 * * *  Africa/Johannesburg  (daily at 04:00 SAST)

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

    console.log(`[cron/cleanup-storage] purged ${purgedFiles} file(s) across ${purgedCases} case(s)`);
    return NextResponse.json({ success: true, purgedCases, purgedFiles });
  } catch (err) {
    console.error('[cron/cleanup-storage] unexpected error', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
