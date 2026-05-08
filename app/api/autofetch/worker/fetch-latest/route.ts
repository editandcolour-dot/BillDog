/**
 * POST /api/autofetch/worker/fetch-latest
 *
 * Worker route for single-bill fetch. In Phase 2, manually triggerable via auth.
 * Phase 3 adds QStash signature validation.
 *
 * Flow:
 * 1. Auth check (Phase 2: Supabase cookie. Phase 3: QStash signature)
 * 2. Load credential row, decrypt
 * 3. Resolve scraper from registry
 * 4. Call scraper.fetchLatestBill()
 * 5. On success: dedup check → upload PDF → find/create case → insert rows → update job
 * 6. On failure: update job status to 'failed'
 *
 * SECURITY:
 * - Never log plaintext credentials
 * - Error messages in DB never contain credentials
 *
 * Source of truth: implementation_plan Phase 2.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { getScraper } from '@/lib/scrapers/registry';

export async function POST(request: NextRequest) {
  let jobId: string | undefined;

  try {
    const supabase = await createClient();

    // 1. Authenticate user (Phase 2: Supabase cookie)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { credential_id } = body;

    if (!credential_id) {
      return NextResponse.json(
        { error: 'credential_id is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 3. Load credential row and verify ownership + active status
    const { data: credential, error: credError } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id, user_id, municipality_id, encrypted_credentials, encryption_iv, revoked_at')
      .eq('id', credential_id)
      .single();

    if (credError || !credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    if (credential.user_id !== user.id) {
      console.error(`[autofetch/worker] Ownership violation: user ${user.id} attempted to use credential ${credential_id}`);
      return NextResponse.json({ error: 'Unauthorised access' }, { status: 403 });
    }

    if (credential.revoked_at) {
      return NextResponse.json({ error: 'Credentials have been revoked' }, { status: 400 });
    }

    if (!credential.encrypted_credentials || !credential.encryption_iv) {
      return NextResponse.json({ error: 'Credential data is missing' }, { status: 400 });
    }

    // 4. Create a scrape_jobs row to track this fetch
    const { data: job, error: jobError } = await supabaseAdmin
      .from('scrape_jobs')
      .insert({
        user_id: user.id,
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
    console.log(`[autofetch/worker] Job ${jobId} created for user ${user.id}`);

    // 5. Look up municipality to resolve scraper
    const { data: municipality } = await supabaseAdmin
      .from('municipalities')
      .select('id, name')
      .eq('id', credential.municipality_id)
      .single();

    if (!municipality) {
      await markJobFailed(supabaseAdmin, jobId, 'Municipality not found for credential');
      return NextResponse.json({ error: 'Municipality not found' }, { status: 404 });
    }

    const slug = municipality.name.toLowerCase().replace(/\s+/g, '-');
    const scraper = getScraper(slug);

    if (!scraper) {
      await markJobFailed(supabaseAdmin, jobId, `No scraper available for ${municipality.name}`);
      return NextResponse.json(
        { error: `Auto-fetch not supported for ${municipality.name}` },
        { status: 400 }
      );
    }

    // 6. Decrypt credentials (in-memory only)
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

    // 7. Execute scraper
    console.log(`[autofetch/worker] Starting fetchLatestBill for ${municipality.name}`);
    const result = await scraper.fetchLatestBill(username, password);

    // Clear credentials from memory ASAP
    username = '';
    password = '';

    if (!result.success) {
      console.log(`[autofetch/worker] Scrape failed: ${result.errorCode}`);

      // Update credential's last_login_error
      await supabaseAdmin
        .from('municipal_credentials')
        .update({
          last_login_error: result.errorCode || 'UNKNOWN',
          updated_at: new Date().toISOString(),
        })
        .eq('id', credential.id);

      await markJobFailed(supabaseAdmin, jobId, result.error || 'Scrape failed');
      return NextResponse.json(
        {
          job_id: jobId,
          success: false,
          error: result.error,
          errorCode: result.errorCode,
        },
        { status: 422 }
      );
    }

    // 8. No bill found (empty result but not an error)
    if (!result.data) {
      console.log('[autofetch/worker] No bill available — completing job');
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
        message: 'No new bill found in the search period',
        bill_downloaded: false,
      });
    }

    // Update credential's last_login_at (successful login)
    await supabaseAdmin
      .from('municipal_credentials')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', credential.id);

    const bill = result.data;

    // 9. Dedup check — does this user already have a case_bill for this period?
    // First get the user's case IDs, then check for matching bill periods
    const { data: userCases } = await supabaseAdmin
      .from('cases')
      .select('id')
      .eq('user_id', user.id);

    const userCaseIds = userCases?.map(c => c.id) || [];

    let existingBills: { id: string }[] | null = null;
    if (userCaseIds.length > 0) {
      const result = await supabaseAdmin
        .from('case_bills')
        .select('id')
        .eq('bill_period', bill.period)
        .in('case_id', userCaseIds);
      existingBills = result.data;
    }

    // Alternative dedup: check scraped_bills for this user + period
    const { data: existingScraped } = await supabaseAdmin
      .from('scraped_bills')
      .select('id')
      .eq('user_id', user.id)
      .eq('bill_period', bill.period);

    const isDuplicate = (existingBills && existingBills.length > 0) ||
                        (existingScraped && existingScraped.length > 0);

    if (isDuplicate) {
      console.log(`[autofetch/worker] Dedup: bill for period "${bill.period}" already exists`);

      // Record as skipped
      await supabaseAdmin
        .from('scraped_bills')
        .insert({
          job_id: jobId,
          user_id: user.id,
          credential_id: credential.id,
          bill_period: bill.period,
          status: 'skipped',
        });

      await supabaseAdmin
        .from('scrape_jobs')
        .update({
          status: 'completed',
          processed_bills: 1,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return NextResponse.json({
        job_id: jobId,
        success: true,
        message: `Bill for period "${bill.period}" already exists — skipped`,
        bill_downloaded: false,
        skipped: true,
      });
    }

    // 10. Upload PDF to Supabase Storage
    const storagePath = `${user.id}/autofetch/${credential.id}/${bill.period.replace(/\s+/g, '_')}.pdf`;

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

    // 11. Find or create a case for this user + municipality
    const { data: existingCase } = await supabaseAdmin
      .from('cases')
      .select('id')
      .eq('user_id', user.id)
      .eq('municipality', municipality.name)
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
          user_id: user.id,
          municipality: municipality.name,
          account_number: 'auto-fetch',  // Placeholder — will be updated after analysis
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

    // 12. Insert case_bills row
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

    // 13. Insert scraped_bills row
    await supabaseAdmin
      .from('scraped_bills')
      .insert({
        job_id: jobId,
        user_id: user.id,
        credential_id: credential.id,
        bill_period: bill.period,
        bill_url: storagePath,
        case_bill_id: caseBill.id,
        status: 'downloaded',
      });

    // 14. Mark job as completed
    await supabaseAdmin
      .from('scrape_jobs')
      .update({
        status: 'completed',
        processed_bills: 1,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[autofetch/worker] Job ${jobId} completed — bill "${bill.period}" downloaded and stored`);

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
        // Best-effort — don't mask the original error
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
