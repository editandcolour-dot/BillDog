/**
 * POST /api/autofetch/worker/fetch-latest
 *
 * Worker route for single-bill fetch. QStash-triggered (signature-verified).
 *
 * Flow:
 * 1. Verify QStash signature
 * 2. Load credential row, decrypt
 * 3. Resolve scraper from registry
 * 4. Call scraper.fetchLatestBill()
 * 5. Route the result through one decision table (lib/autofetch/fetchOutcome):
 *    ERROR             -> job failed, next_check_at untouched
 *    NOT_YET_PUBLISHED -> updateCycleAfterMiss (daily hunt, +14 cap)
 *    FOUND_NEW         -> upload PDF -> find/create case -> insert rows ->
 *                         update job -> updateCycleAfterFound (dormant to next cycle)
 *
 * SECURITY:
 * - Never log plaintext credentials
 * - Error messages in DB never contain credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { getScraper } from '@/lib/scrapers/registry';
import { verifyQStashSignature } from '@/lib/qstash/verify';
import { getQstashClient } from '@/lib/qstash/client';
import { parseBillFile } from '@/lib/pdf/parse';
import { classifyFetchOutcome } from '@/lib/autofetch/fetchOutcome';
import {
  extractIssueDate,
  rollEstimate,
  computeNextCheckAt,
  lastDayOfMonth,
  type CycleConfidence,
} from '@/lib/autofetch/cycleEstimator';

export const maxDuration = 120; // 2 minutes for single scrape

export async function POST(request: NextRequest) {
  let jobId: string | undefined;

  try {
    const isValid = await verifyQStashSignature(request);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 });
    }

    const clonedReq = request.clone();
    const body = await clonedReq.json();
    const { credential_id } = body;

    if (!credential_id) {
      return NextResponse.json(
        { error: 'credential_id is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 2. Load credential row and verify ownership + active status
    const { data: credential, error: credError } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id, user_id, municipality_id, encrypted_credentials, encryption_iv, revoked_at, expected_issue_day, cycle_confidence, last_known_period')
      .eq('id', credential_id)
      .single();

    if (credError || !credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    if (credential.revoked_at) {
      return NextResponse.json({ error: 'Credentials have been revoked' }, { status: 400 });
    }

    if (!credential.encrypted_credentials || !credential.encryption_iv) {
      return NextResponse.json({ error: 'Credential data is missing' }, { status: 400 });
    }

    // Create a scrape_jobs row to track this fetch
    const { data: job, error: jobError } = await supabaseAdmin
      .from('scrape_jobs')
      .insert({
        user_id: credential.user_id,
        credential_id: credential.id,
        job_type: 'monthly',
        status: 'running',
        started_at: new Date().toISOString(),
        total_bills: 1,
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('[autofetch/worker] Failed to create job:', jobError?.message);
      return NextResponse.json({ error: 'Failed to create scrape job' }, { status: 500 });
    }

    jobId = job.id as string;
    console.log(`[autofetch/worker] Job ${jobId} created for user ${credential.user_id}`);

    // 3. Look up municipality to resolve scraper
    const { data: municipality } = await supabaseAdmin
      .from('municipalities')
      .select('id, name, slug')
      .eq('id', credential.municipality_id)
      .single();

    if (!municipality) {
      await markJobFailed(supabaseAdmin, jobId, 'Municipality not found for credential');
      return NextResponse.json({ error: 'Municipality not found' }, { status: 404 });
    }

    const slug = municipality.slug;
    const scraper = getScraper(slug);

    if (!scraper) {
      await markJobFailed(supabaseAdmin, jobId, `No scraper available for ${municipality.name}`);
      return NextResponse.json(
        { error: `Auto-fetch not supported for ${municipality.name}` },
        { status: 400 }
      );
    }

    // Decrypt credentials (in-memory only)
    let username: string;
    let password: string;
    try {
      const decrypted = decryptCredentials(
        credential.encrypted_credentials,
        credential.encryption_iv
      );
      username = decrypted.username;
      password = decrypted.password;
    } catch (decryptErr) {
      const msg = decryptErr instanceof Error ? decryptErr.message : 'Decryption failed';
      console.error('[autofetch/worker] Credential decryption failed:', msg);
      await markJobFailed(supabaseAdmin, jobId, 'Credential decryption failed');
      return NextResponse.json({ error: 'Failed to decrypt credentials' }, { status: 500 });
    }

    // 4. Execute scraper
    console.log(`[autofetch/worker] Starting fetchLatestBill for ${municipality.name}`);
    const result = await scraper.fetchLatestBill(username, password);

    // Clear credentials from memory ASAP
    username = '';
    password = '';

    // 5. Route the result through one decision table: ERROR | NOT_YET_PUBLISHED
    // | FOUND_NEW. stale_latest -- the portal still showing a period we already
    // hold -- means the new bill isn't published yet: keep hunting daily, never
    // sleep a month on a stale sighting.
    const alreadyStored = result.success && result.data
      ? await periodAlreadyStored(supabaseAdmin, credential.user_id, result.data.period)
      : false;
    const outcome = classifyFetchOutcome(result, alreadyStored);

    if (outcome.kind === 'ERROR') {
      console.log(`[autofetch/worker] Scrape failed: ${outcome.errorCode}`);

      // Update credential's last_login_error
      await supabaseAdmin
        .from('municipal_credentials')
        .update({
          last_login_error: outcome.errorCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', credential.id);

      await markJobFailed(supabaseAdmin, jobId, outcome.error);

      if (outcome.errorCode === 'INVALID_CREDENTIALS' || outcome.errorCode === 'MFA_REQUIRED') {
        // DO NOT revoke. The user's wishes (and POPIA-aware design) say: keep
        // the saved login row, flag it stale via `last_login_error`, and email
        // a transactional notice so the user can come back and re-enter the
        // current password. The encrypted password stays put -- if the user
        // never reconnects, account deletion (in /account) clears it.
        const { sendAutofetchStaleEmail } = await import('@/lib/resend/autofetch-stale');

        const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', credential.user_id).single();
        if (profile?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          await sendAutofetchStaleEmail({
            userEmail: profile.email,
            userName: profile.full_name || 'User',
            municipalityName: municipality.name,
            reason: outcome.errorCode === 'MFA_REQUIRED' ? 'mfa_required' : 'invalid_credentials',
            reconnectUrl: `${appUrl}/account`
          });
        }
        return NextResponse.json({ success: false, error: outcome.error, errorCode: outcome.errorCode }, { status: 200 });
      }

      return NextResponse.json({ success: false, error: outcome.error, errorCode: outcome.errorCode }, { status: 500 });
    }

    // Successful login + navigation -- record it whatever the outcome.
    await supabaseAdmin
      .from('municipal_credentials')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', credential.id);

    // 6. The current period's bill isn't on the portal yet -- either the
    // statement list was empty, or its newest row is a period we already hold.
    // Re-check tomorrow (weekend-skipped, +14-day cap in cycleEstimator).
    if (outcome.kind === 'NOT_YET_PUBLISHED') {
      console.log(`[autofetch/worker] Not yet published (${outcome.reason}) -- hunt continues`);

      await updateCycleAfterMiss(supabaseAdmin, credential);

      await supabaseAdmin
        .from('scrape_jobs')
        .update({
          status: 'completed',
          processed_bills: 0,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return NextResponse.json({
        job_id: jobId,
        success: true,
        message: outcome.reason === 'stale_latest'
          ? `Latest bill on portal ("${outcome.stalePeriod}") is already stored -- new bill not yet published`
          : 'No bill rows on portal -- new bill not yet published',
        bill_downloaded: false,
        not_yet_published: true,
      });
    }

    const bill = outcome.bill;

    // 7. Upload PDF to Supabase Storage
    const storagePath = `${credential.user_id}/autofetch/${credential.id}/${bill.period.replace(/\s+/g, '_')}.pdf`;

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('bills')
      .upload(storagePath, bill.pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists (safety net)
      });

    if (uploadError) {
      console.error('[autofetch/worker] Storage upload failed:', uploadError.message);
      await markJobFailed(supabaseAdmin, jobId, `PDF upload failed: ${uploadError.message}`);
      return NextResponse.json({ error: 'Failed to upload bill PDF' }, { status: 500 });
    }

    console.log(`[autofetch/worker] PDF uploaded to: ${storagePath}`);

    // 8. Find or create a case for this user + municipality. Admin client
    // bypasses RLS: exclude soft-deleted cases so a new bill never attaches
    // to a case the user deleted (a fresh case is created instead).
    const { data: existingCase } = await supabaseAdmin
      .from('cases')
      .select('id')
      .eq('user_id', credential.user_id)
      .eq('municipality', municipality.name)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let caseId: string;

    if (existingCase) {
      caseId = existingCase.id;
    } else {
      // Create a new case
      const { data: newCase, error: caseError } = await supabaseAdmin
        .from('cases')
        .insert({
          user_id: credential.user_id,
          municipality: municipality.name,
          account_number: 'auto-fetch',  // Placeholder -- will be updated after analysis
          status: 'analysing',
        })
        .select('id')
        .single();

      if (caseError || !newCase) {
        console.error('[autofetch/worker] Case creation failed:', caseError?.message);
        await markJobFailed(supabaseAdmin, jobId, 'Failed to create case');
        return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });
      }

      caseId = newCase.id;
      console.log(`[autofetch/worker] Created new case ${caseId}`);
    }

    // 9. Insert case_bills row
    const { data: caseBill, error: caseBillError } = await supabaseAdmin
      .from('case_bills')
      .insert({
        case_id: caseId,
        bill_url: storagePath,
        bill_period: bill.period,
        parse_status: 'pending',
        analysis_status: 'pending',
        original_filename: bill.filename,
        file_size_bytes: bill.pdfBuffer.length,
        mime_type: 'application/pdf',
      })
      .select('id')
      .single();

    if (caseBillError || !caseBill) {
      console.error('[autofetch/worker] case_bills insert failed:', caseBillError?.message);
      await markJobFailed(supabaseAdmin, jobId, 'Failed to create case_bills row');
      return NextResponse.json({ error: 'Failed to record bill' }, { status: 500 });
    }

    // 10. Insert scraped_bills row
    await supabaseAdmin
      .from('scraped_bills')
      .insert({
        job_id: jobId,
        user_id: credential.user_id,
        credential_id: credential.id,
        bill_period: bill.period,
        bill_url: storagePath,
        case_bill_id: caseBill.id,
        status: 'downloaded',
      });

    // 11. Mark job as completed
    await supabaseAdmin
      .from('scrape_jobs')
      .update({
        status: 'completed',
        processed_bills: 1,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[autofetch/worker] Job ${jobId} completed -- bill "${bill.period}" downloaded and stored`);

    // 11b. Roll the cycle estimate forward and schedule the next check.
    // Best-effort -- the bill is already stored, so cycle bookkeeping must not
    // fail the response. We parse the PDF here (light, ~1s) to mine an issue
    // date; falls back to today if extraction fails.
    try {
      let issueDate: Date | null = null;
      try {
        const text = await parseBillFile(bill.pdfBuffer, 'application/pdf');
        issueDate = extractIssueDate(text);
      } catch (parseErr) {
        console.warn('[autofetch/worker] PDF parse for issue date failed:', parseErr);
      }
      await updateCycleAfterFound(supabaseAdmin, credential, {
        issueDate: issueDate ?? new Date(),
        billPeriod: bill.period,
      });
    } catch (cycleErr) {
      console.error('[autofetch/worker] Cycle update failed:', cycleErr);
    }

    // 12. Record the download event
    await supabaseAdmin.from('case_events').insert({
      case_id: caseId,
      event_type: 'autofetch_bill_downloaded',
      note: `Auto-fetched bill for period "${bill.period}" ready for analysis.`,
      metadata: { job_id: jobId, case_bill_id: caseBill.id, storage_path: storagePath },
    });

    // 13. Hand off to the analysis worker (parse -> audit -> result email).
    // Fail-closed: if the hand-off cannot be enqueued, the fetch job is marked
    // failed so a stored-but-never-audited bill can never read as success.
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await getQstashClient().publish({
        url: `${appUrl}/api/autofetch/worker/analyse`,
        body: JSON.stringify({ case_bill_id: caseBill.id, job_id: jobId }),
        retries: 3,
      });
      console.log(`[autofetch/worker] Analysis enqueued for case_bill ${caseBill.id}`);
    } catch (enqueueErr) {
      console.error('[autofetch/worker] Failed to enqueue analysis:', enqueueErr);
      await markJobFailed(supabaseAdmin, jobId, 'Bill stored but analysis enqueue failed');
      return NextResponse.json(
        { error: 'Bill stored but analysis could not be enqueued' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      job_id: jobId,
      success: true,
      bill_downloaded: true,
      bill_period: bill.period,
      case_id: caseId,
      case_bill_id: caseBill.id,
      storage_path: storagePath,
    });

  } catch (error) {
    console.error('[autofetch/worker] Unexpected error:', error);

    // Attempt to mark job as failed if we have a job ID
    if (jobId) {
      try {
        const supabaseAdmin = createAdminClient();
        await markJobFailed(supabaseAdmin, jobId, 'Unexpected server error');
      } catch {
        // Best-effort -- don't mask the original error
      }
    }

    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Helper to mark a job as failed with an error message.
 * Error messages never contain credentials.
 */
async function markJobFailed(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  jobId: string,
  errorMessage: string
): Promise<void> {
  await supabaseAdmin
    .from('scrape_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

/**
 * Does this user already hold a bill for `period` (as a case_bill or a
 * scraped_bill)? Feeds classifyFetchOutcome: an already-stored "latest" bill
 * means the new period's bill is NOT_YET_PUBLISHED.
 */
async function periodAlreadyStored(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  period: string
): Promise<boolean> {
  const { data: userCases } = await supabaseAdmin
    .from('cases')
    .select('id')
    .eq('user_id', userId);

  const userCaseIds = userCases?.map((c: { id: string }) => c.id) || [];

  if (userCaseIds.length > 0) {
    const { data: existingBills } = await supabaseAdmin
      .from('case_bills')
      .select('id')
      .eq('bill_period', period)
      .in('case_id', userCaseIds);
    if (existingBills && existingBills.length > 0) return true;
  }

  const { data: existingScraped } = await supabaseAdmin
    .from('scraped_bills')
    .select('id')
    .eq('user_id', userId)
    .eq('bill_period', period);

  return !!(existingScraped && existingScraped.length > 0);
}

/**
 * Cycle row shape we read off `municipal_credentials` in this route.
 */
type CycleCredentialRow = {
  id: string;
  expected_issue_day: number | null;
  cycle_confidence: CycleConfidence | null;
  last_known_period: string | null;
};

/**
 * Called ONLY after a genuinely new bill was fetched and stored: roll the cycle
 * estimate forward by one observation and schedule next_check_at for the next
 * billing cycle. A stale/duplicate sighting is NOT a find -- that routes to
 * updateCycleAfterMiss so the daily hunt stays alive.
 */
async function updateCycleAfterFound(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cred: CycleCredentialRow,
  found: { issueDate: Date; billPeriod: string }
): Promise<void> {
  const currentDay = cred.expected_issue_day;
  const currentConf: CycleConfidence = cred.cycle_confidence ?? 'unknown';

  let nextDay: number | null;
  let nextConf: CycleConfidence;

  if (currentDay !== null) {
    const rolled = rollEstimate(
      { day: currentDay, confidence: currentConf, sampleSize: currentConf === 'unknown' ? 1 : 4 },
      found.issueDate
    );
    nextDay = rolled.day;
    nextConf = rolled.confidence;
  } else {
    // Seed estimate from the very first observation.
    nextDay = found.issueDate.getUTCDate();
    nextConf = 'unknown';
  }

  const payload: Record<string, unknown> = {
    cycle_confidence: nextConf,
    last_known_period: found.billPeriod,
    updated_at: new Date().toISOString(),
  };
  if (nextDay !== null) {
    payload.expected_issue_day = nextDay;
    payload.next_check_at = computeNextCheckAt({
      expectedDay: nextDay,
      confidence: nextConf,
      fromDate: new Date(),
      justFoundBill: true,
    }).toISOString();
  } else {
    // No estimate yet -- re-check tomorrow.
    payload.next_check_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  await supabaseAdmin
    .from('municipal_credentials')
    .update(payload)
    .eq('id', cred.id);
}

/**
 * Called when the current period's bill is not yet published (empty statement
 * list OR the portal's latest row is already stored). Schedule a re-check for
 * tomorrow (weekend-skipped), capped at expected_issue_day + 14 -- past that we
 * let the dispatcher fall back to next month and the failure-rate alerter takes
 * over.
 */
async function updateCycleAfterMiss(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cred: CycleCredentialRow
): Promise<void> {
  if (cred.expected_issue_day === null) {
    // No estimate yet -- just re-poll tomorrow.
    await supabaseAdmin
      .from('municipal_credentials')
      .update({
        next_check_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cred.id);
    return;
  }

  // chasingSince = this month's expected issue day (or last month's, if we're
  // before this month's day). Used by computeNextCheckAt to enforce the +14 cap.
  // Clamp to each month's REAL length so late-month billers (29th-31st) anchor
  // on their actual expected day, consistent with computeNextCheckAt.
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const thisMonthExpected = new Date(Date.UTC(
    y, m, Math.min(cred.expected_issue_day, lastDayOfMonth(y, m))
  ));
  const chasingSince = thisMonthExpected <= now
    ? thisMonthExpected
    : new Date(Date.UTC(y, m - 1, Math.min(cred.expected_issue_day, lastDayOfMonth(y, m - 1))));

  const nextCheck = computeNextCheckAt({
    expectedDay: cred.expected_issue_day,
    confidence: cred.cycle_confidence ?? 'unknown',
    fromDate: now,
    justFoundBill: false,
    chasingSince,
  });

  await supabaseAdmin
    .from('municipal_credentials')
    .update({
      next_check_at: nextCheck.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', cred.id);
}
