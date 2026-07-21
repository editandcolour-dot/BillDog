/**
 * POST /api/autofetch/worker/analyse
 *
 * The analysis step of the recurring autofetch pipeline. QStash-triggered
 * (signature-verified) by fetch-latest after it stores a new bill:
 *
 *   parse PDF -> analyseBill (deterministic parser + validator + Claude) ->
 *   persist per-bill results -> aggregate the case -> email the user the
 *   ACTUAL audit outcome (findings/overcharge total, or an explicit clean bill).
 *
 * FAIL-CLOSED: any failure (download, parse, audit, email) marks the
 * case_bills row failed, flips the originating fetch job to 'failed', logs an
 * autofetch_analysis_failed case_event, and returns 500 so QStash retries.
 * The job is never left 'completed' when the audit did not run to the end.
 *
 * Idempotent: a QStash retry against an already-complete bill no-ops with 200.
 *
 * SECURITY: admin client (no user session in a worker); never log credentials.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyQStashSignature } from '@/lib/qstash/verify';
import { parseBillFile } from '@/lib/pdf/parse';
import { analyseBill } from '@/lib/claude/analyse-bill';
import { classifyMunicipality } from '@/lib/tiers/tierClassifier';
import { round2, roundErrors, aggregateCaseFromBills } from '@/lib/analysis/case-aggregation';
import { sendAutofetchResultEmail } from '@/lib/resend/autofetch-result';

export const maxDuration = 120;

// Same set analyse-multi gates on: only these case statuses may be moved by an
// automated aggregation. A case mid-dispute (sent/acknowledged/…) keeps its
// status — bill-level results still persist, the lifecycle is not disturbed.
const RETRYABLE_CASE_STATUSES = ['uploading', 'analysing', 'closed', 'letter_ready'];

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient();
  let jobId: string | undefined;
  let caseBillId: string | undefined;
  let caseIdForEvent: string | undefined;

  try {
    const isValid = await verifyQStashSignature(request);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 });
    }

    const body = await request.clone().json();
    const { case_bill_id, job_id } = body;
    if (!case_bill_id) {
      return NextResponse.json({ error: 'case_bill_id is required' }, { status: 400 });
    }
    caseBillId = case_bill_id as string;
    jobId = typeof job_id === 'string' ? job_id : undefined;

    // Load the bill row
    const { data: caseBill, error: caseBillError } = await supabaseAdmin
      .from('case_bills')
      .select('id, case_id, bill_url, mime_type, original_filename, analysis_status')
      .eq('id', caseBillId)
      .single();

    if (caseBillError || !caseBill) {
      throw new Error(`case_bills row ${caseBillId} not found`);
    }
    caseIdForEvent = caseBill.case_id as string;

    // Idempotency: QStash retries must not re-audit (or re-email) a completed bill.
    if (caseBill.analysis_status === 'complete') {
      return NextResponse.json({ success: true, already_complete: true, case_bill_id: caseBillId });
    }

    // Load the case: municipality display name, owner, lifecycle status.
    // Admin client bypasses RLS: refuse to audit/email a soft-deleted case.
    const { data: caseRecord, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, user_id, municipality, status')
      .eq('id', caseBill.case_id)
      .is('deleted_at', null)
      .single();

    if (caseError || !caseRecord) {
      throw new Error(`Case ${caseBill.case_id} not found (or deleted) for bill ${caseBillId}`);
    }

    // 1. Download the stored PDF
    const { data: fileData, error: dlError } = await supabaseAdmin.storage
      .from('bills')
      .download(caseBill.bill_url);

    if (dlError || !fileData) {
      throw new Error(`Failed to download ${caseBill.original_filename || caseBill.bill_url}: ${dlError?.message}`);
    }

    // 2. Parse text
    await supabaseAdmin.from('case_bills')
      .update({ parse_status: 'parsing', updated_at: new Date().toISOString() })
      .eq('id', caseBillId);

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const billText = await parseBillFile(buffer, caseBill.mime_type || 'application/pdf');

    await supabaseAdmin.from('case_bills')
      .update({
        bill_text: billText,
        parse_status: 'parsed',
        analysis_status: 'analysing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseBillId);

    // 3. Full audit. The municipality display name resolves the deterministic
    // parser (registry normalises aliases) and the coverage tier.
    const analysis = await analyseBill(billText, caseRecord.municipality);
    const tier = classifyMunicipality(caseRecord.municipality);
    console.log(`[autofetch/analyse] Bill ${caseBillId}: errors=${analysis.errors.length}, recoverable=${analysis.total_recoverable}, tier=${tier}`);

    // 4. Persist per-bill results (same shape as analyse-multi)
    await supabaseAdmin.from('case_bills')
      .update({
        bill_period: analysis.bill_period,
        total_billed: round2(analysis.total_billed),
        errors_found: roundErrors(analysis.errors),
        recoverable: round2(analysis.total_recoverable),
        analysis_status: 'complete',
        coverage_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseBillId);

    // 5. Aggregate every complete bill of this case via the shared helper —
    // identical maths to analyse-multi. Status only moves on RETRYABLE cases.
    const { data: completeBills } = await supabaseAdmin
      .from('case_bills')
      .select('bill_period, errors_found, total_billed, recoverable')
      .eq('case_id', caseRecord.id)
      .eq('analysis_status', 'complete');

    const agg = aggregateCaseFromBills((completeBills || []).map((b) => ({
      bill_period: b.bill_period as string | null,
      errors: (b.errors_found as Array<Record<string, unknown>>) || [],
      total_billed: Number(b.total_billed) || 0,
      total_recoverable: Number(b.recoverable) || 0,
    })));

    if (RETRYABLE_CASE_STATUSES.includes(caseRecord.status)) {
      await supabaseAdmin.from('cases')
        .update({
          status: agg.status,
          errors_found: agg.errors_found,
          recoverable: agg.recoverable,
          total_billed: agg.total_billed,
          total_recoverable_all: agg.total_recoverable_all,
          bill_period: agg.bill_period,
          date_range_start: agg.date_range_start,
          date_range_end: agg.date_range_end,
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseRecord.id);
    } else {
      console.log(`[autofetch/analyse] Case ${caseRecord.id} status "${caseRecord.status}" is mid-dispute — bill results persisted, case status untouched`);
    }

    // 6. Email the user the audit outcome. sendAutofetchResultEmail THROWS on
    // failure — an unsent result is a pipeline failure, not a footnote.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', caseRecord.user_id)
      .single();

    if (!profile?.email) {
      throw new Error(`No profile email for user ${caseRecord.user_id} — cannot deliver audit result`);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await sendAutofetchResultEmail({
      userEmail: profile.email,
      userName: profile.full_name || 'User',
      municipalityName: caseRecord.municipality,
      billPeriod: analysis.bill_period || null,
      totalRecoverable: round2(analysis.total_recoverable),
      findings: (analysis.errors || []).map((e) => ({
        title: e.line_item || 'Billing issue',
        issue: e.issue || '',
        amount: typeof e.overchargeZar === 'number' ? round2(e.overchargeZar) : null,
      })),
      caseUrl: `${appUrl}/case/${caseRecord.id}`,
    });

    // 7. Event trail
    await supabaseAdmin.from('case_events').insert({
      case_id: caseRecord.id,
      event_type: 'autofetch_analysis_complete',
      note: `Auto-fetched bill "${analysis.bill_period}" audited: ${analysis.errors.length} issue(s), R${round2(analysis.total_recoverable).toFixed(2)} recoverable. Result email sent.`,
      metadata: { case_bill_id: caseBillId, job_id: jobId ?? null, coverage_tier: tier },
    });

    return NextResponse.json({
      success: true,
      case_bill_id: caseBillId,
      errors_found: analysis.errors.length,
      recoverable: round2(analysis.total_recoverable),
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[autofetch/analyse] Analysis pipeline failed:', msg);

    // FAIL-CLOSED bookkeeping — each write best-effort so one failure doesn't
    // mask the root cause; the 500 below makes QStash retry regardless.
    if (caseBillId) {
      try {
        await supabaseAdmin.from('case_bills')
          .update({
            analysis_status: 'failed',
            error_message: msg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', caseBillId);
      } catch { /* keep going */ }
    }

    if (jobId) {
      try {
        await supabaseAdmin.from('scrape_jobs')
          .update({
            status: 'failed',
            error_message: `Analysis failed: ${msg}`,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      } catch { /* keep going */ }
    }

    if (caseIdForEvent) {
      try {
        await supabaseAdmin.from('case_events').insert({
          case_id: caseIdForEvent,
          event_type: 'autofetch_analysis_failed',
          note: `Automated audit failed: ${msg}`,
          metadata: { case_bill_id: caseBillId ?? null, job_id: jobId ?? null },
        });
      } catch { /* keep going */ }
    }

    return NextResponse.json({ error: 'Analysis pipeline failed' }, { status: 500 });
  }
}
