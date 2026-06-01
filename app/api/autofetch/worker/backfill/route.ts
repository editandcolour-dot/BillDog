import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyQStashSignature } from '@/lib/qstash/verify';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { getScraper } from '@/lib/scrapers/registry';
import { parseBillFile } from '@/lib/pdf/parse';
import { analyseBill } from '@/lib/claude/analyse-bill';
import { analyseCrossBill } from '@/lib/claude/analyse-cross-bill';
import { checkPrescription } from '@/lib/validators/prescription';
import type { ServiceType } from '@/types';
import { sendAutofetchReportEmail } from '@/lib/resend/autofetch-report';
import {
  extractIssueDate,
  estimateExpectedDay,
  computeNextCheckAt,
} from '@/lib/autofetch/cycleEstimator';

export const maxDuration = 300; // Allow maximum Vercel function duration for backfill

export async function POST(request: NextRequest) {
  // 1. Verify QStash Signature
  const isValid = await verifyQStashSignature(request);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 });
  }

  let jobId: string = '';

  try {
    const clonedReq = request.clone();
    const body = await clonedReq.json();
    const { credential_id } = body;

    if (!credential_id) {
      return NextResponse.json({ error: 'credential_id is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 2. Load credential and verify active status
    const { data: credential, error: credError } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id, user_id, municipality_id, encrypted_credentials, encryption_iv, revoked_at')
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

    // 3. In-flight guard
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: existingJobs } = await supabaseAdmin
      .from('scrape_jobs')
      .select('id')
      .eq('credential_id', credential_id)
      .eq('job_type', 'backfill')
      .eq('status', 'running')
      .gte('started_at', sixHoursAgo)
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      return NextResponse.json({ message: 'Backfill already in progress' }, { status: 200 });
    }

    // 4. Create scrape_jobs row
    const { data: job, error: jobError } = await supabaseAdmin
      .from('scrape_jobs')
      .insert({
        user_id: credential.user_id,
        credential_id: credential.id,
        job_type: 'backfill',
        status: 'running',
        started_at: new Date().toISOString(),
        total_bills: 36, // Expected
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('[autofetch/backfill] Failed to create job:', jobError?.message);
      return NextResponse.json({ error: 'Failed to create scrape job' }, { status: 500 });
    }
    jobId = job.id;

    // Fetch user info for emails
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', credential.user_id)
      .single();

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
      return NextResponse.json({ error: 'Auto-fetch not supported' }, { status: 400 });
    }

    // 5. Decrypt credentials
    let username: string;
    let password: string;
    try {
      const decrypted = decryptCredentials(credential.encrypted_credentials, credential.encryption_iv);
      username = decrypted.username;
      password = decrypted.password;
    } catch (decryptErr) {
      await markJobFailed(supabaseAdmin, jobId, 'Credential decryption failed');
      return NextResponse.json({ error: 'Failed to decrypt credentials' }, { status: 500 });
    }

    // 6. Execute scraper for 36 months history
    console.log(`[autofetch/backfill] Starting fetchBillHistory for ${municipality.name}`);
    const result = await scraper.fetchBillHistory(username, password, 36);

    // Clear credentials
    username = '';
    password = '';

    if (!result.success) {
      console.log(`[autofetch/backfill] Scrape failed: ${result.errorCode}`);
      
      await supabaseAdmin.from('municipal_credentials').update({
        last_login_error: result.errorCode || 'UNKNOWN',
        updated_at: new Date().toISOString(),
      }).eq('id', credential.id);

      // Handle Failure Classifications
      if (result.errorCode === 'INVALID_CREDENTIALS' || result.errorCode === 'MFA_REQUIRED') {
        // DO NOT revoke. Keep the saved login row, flag stale via
        // `last_login_error`, send transactional notice. See fetch-latest
        // for the same logic + rationale.
        const { sendAutofetchStaleEmail } = await import('@/lib/resend/autofetch-stale');

        if (profile?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          await sendAutofetchStaleEmail({
            userEmail: profile.email,
            userName: profile.full_name || 'User',
            municipalityName: municipality.name,
            reason: result.errorCode === 'MFA_REQUIRED' ? 'mfa_required' : 'invalid_credentials',
            reconnectUrl: `${appUrl}/account`
          });
        }
        await markJobFailed(supabaseAdmin, jobId, result.error || 'Scrape failed');
        // Return 200 so QStash doesn't retry on invalid creds/MFA
        return NextResponse.json({ error: result.error }, { status: 200 });
      }

      // Network errors -> return 500 so QStash retries
      await markJobFailed(supabaseAdmin, jobId, result.error || 'Scrape failed');
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (!result.data || result.data.length === 0) {
      console.log('[autofetch/backfill] No bills found');
      await supabaseAdmin.from('scrape_jobs').update({
        status: 'completed',
        processed_bills: 0,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
      return NextResponse.json({ success: true, message: 'No bills found' });
    }

    // Success login
    await supabaseAdmin.from('municipal_credentials').update({
      last_login_at: new Date().toISOString(),
      last_login_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', credential.id);

    // Find or create parent case
    const { data: existingCase } = await supabaseAdmin
      .from('cases')
      .select('id')
      .eq('user_id', credential.user_id)
      .eq('municipality', municipality.name)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let caseId: string;
    if (existingCase) {
      caseId = existingCase.id;
    } else {
      const { data: newCase, error: caseError } = await supabaseAdmin
        .from('cases')
        .insert({
          user_id: credential.user_id,
          municipality: municipality.name,
          account_number: 'auto-fetch',
          status: 'analysing',
        })
        .select('id')
        .single();
      if (caseError || !newCase) throw new Error('Failed to create case');
      caseId = newCase.id;
    }

    let billsAnalysed = 0;
    let billsSkipped = 0;
    let totalRecoverable = 0;
    const allFindings: { period: string; amount: number; issue: string }[] = [];
    const crossAnalysisInputs = [];
    // Issue dates pulled out of each bill PDF â€” used after the loop to seed
    // the credential's cycle estimate (expected_issue_day, confidence,
    // next_check_at). See [lib/autofetch/cycleEstimator.ts].
    const observedIssueDates: Date[] = [];

    // Pre-fetch existing case bills for dedup
    const { data: existingCaseBills } = await supabaseAdmin
      .from('case_bills')
      .select('bill_period')
      .eq('case_id', caseId);
    
    const existingPeriods = new Set(existingCaseBills?.map(cb => cb.bill_period) || []);

    // 7. Sequential Processing Loop
    for (const bill of result.data) {
      if (existingPeriods.has(bill.period)) {
        billsSkipped++;
        await supabaseAdmin.from('scraped_bills').insert({
          job_id: jobId, user_id: credential.user_id, credential_id: credential.id,
          bill_period: bill.period, status: 'skipped',
        });
        continue;
      }

      // Upload PDF
      const storagePath = `${credential.user_id}/autofetch/${credential.id}/${bill.period.replace(/\s+/g, '_')}.pdf`;
      const { error: uploadError } = await supabaseAdmin.storage.from('bills').upload(storagePath, bill.pdfBuffer, {
        contentType: 'application/pdf', upsert: true,
      });

      if (uploadError) {
        console.error(`[autofetch/backfill] Storage upload failed for ${bill.period}:`, uploadError);
        continue;
      }

      // Insert case_bills
      const { data: caseBill } = await supabaseAdmin.from('case_bills').insert({
        case_id: caseId,
        bill_url: storagePath,
        bill_period: bill.period,
        parse_status: 'pending',
        analysis_status: 'pending',
        original_filename: bill.filename,
        file_size_bytes: bill.pdfBuffer.length,
        mime_type: 'application/pdf',
      }).select('id').single();

      if (!caseBill) continue;

      // Insert scraped_bills
      await supabaseAdmin.from('scraped_bills').insert({
        job_id: jobId, user_id: credential.user_id, credential_id: credential.id,
        bill_period: bill.period, bill_url: storagePath, case_bill_id: caseBill.id,
        status: 'downloaded',
      });

      // Parse and Analyse
      try {
        const extractedText = await parseBillFile(bill.pdfBuffer, 'application/pdf');

        // Mine an issue date out of the PDF text for cycle estimation. Falls
        // through silently if no recognisable date label is present.
        const issueDate = extractIssueDate(extractedText);
        if (issueDate) observedIssueDates.push(issueDate);

        await supabaseAdmin.from('case_bills').update({
          parse_status: 'parsed',
          bill_text: extractedText
        }).eq('id', caseBill.id);

        const analysis = await analyseBill(extractedText, 'CoCT'); // Hardcoded to CoCT for now
        
        const prescription_warnings = analysis.errors.map(err => {
          return checkPrescription(analysis.bill_period, err.service_type as ServiceType);
        });

        await supabaseAdmin.from('case_bills').update({
          analysis_status: 'complete',
          errors_found: {
            errors: analysis.errors,
            prescription_warnings,
            confidence: analysis.confidence
          },
          total_billed: analysis.total_billed,
          recoverable: analysis.total_recoverable,
        }).eq('id', caseBill.id);

        billsAnalysed++;

        // Update progress incrementally so the UI shows real-time progress
        await supabaseAdmin.from('scrape_jobs').update({
          processed_bills: billsAnalysed + billsSkipped,
        }).eq('id', jobId);
        
        if (analysis.total_recoverable > 0) {
          totalRecoverable += analysis.total_recoverable;
          analysis.errors.forEach(err => {
            if (err.recoverable) {
              allFindings.push({
                period: bill.period,
                amount: err.expected_amount ? Math.max(0, err.amount_charged - err.expected_amount) : err.amount_charged,
                issue: err.issue
              });
            }
          });
        }

        crossAnalysisInputs.push({
          bill_id: caseBill.id,
          bill_period: bill.period,
          analysis
        });

      } catch (analysisErr) {
        console.error(`[autofetch/backfill] Analysis failed for ${bill.period}:`, analysisErr);
        await supabaseAdmin.from('case_bills').update({
          analysis_status: 'failed',
          error_message: String(analysisErr)
        }).eq('id', caseBill.id);
      }
    }

    // Compute date range from cross analysis inputs
    const periods = crossAnalysisInputs.map(c => c.bill_period).filter(Boolean).sort();
    const dateRangeStart = periods[0] || null;
    const dateRangeEnd = periods[periods.length - 1] || null;

    // Aggregate all per-bill errors into a single array for the letter generator
    const aggregatedErrors: any[] = [];
    let aggregatedTotalBilled = 0;
    for (const input of crossAnalysisInputs) {
      if (input.analysis?.errors) {
        for (const err of input.analysis.errors) {
          aggregatedErrors.push({ ...err, bill_period: input.bill_period });
        }
      }
      if (input.analysis?.total_billed) {
        aggregatedTotalBilled += input.analysis.total_billed;
      }
    }

    const caseSummary: Record<string, any> = {
      status: totalRecoverable > 0 ? 'letter_ready' : 'closed',
      total_recoverable_all: totalRecoverable,
      recoverable: totalRecoverable,
      total_billed: aggregatedTotalBilled,
      errors_found: aggregatedErrors,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
      bill_period: dateRangeEnd, // Latest period for display
      updated_at: new Date().toISOString(),
    };

    // 8. Cross-Bill Analysis
    if (crossAnalysisInputs.length > 0) {
      try {
        const crossResults = await analyseCrossBill(crossAnalysisInputs);
        caseSummary.cross_analysis = crossResults;
      } catch (crossErr) {
        console.error('[autofetch/backfill] Cross-bill analysis failed:', crossErr);
        // Continue without cross-analysis â€” individual results still valid
      }
    }

    await supabaseAdmin.from('cases').update(caseSummary).eq('id', caseId);

    // 8b. Seed cycle estimate on the credential row.
    //
    // After backfilling up to 36 months of bills, we usually have enough
    // observations to compute a reliable expected_issue_day. The daily
    // dispatcher uses this to skip credentials whose next bill isn't due yet.
    //
    // We always update last_known_period (= latest bill_period we just
    // pulled) and next_check_at, even when the sample is too small for a
    // confident day estimate â€” the dispatcher needs *some* schedule to act on.
    try {
      const estimate = estimateExpectedDay(observedIssueDates);
      const updatePayload: Record<string, unknown> = {
        last_known_period: dateRangeEnd,
        cycle_confidence: estimate.confidence,
        updated_at: new Date().toISOString(),
      };
      if (estimate.day !== null) {
        updatePayload.expected_issue_day = estimate.day;
        // We just successfully fetched this month's bill (backfill includes
        // current period) â€” schedule next check for next billing cycle.
        updatePayload.next_check_at = computeNextCheckAt({
          expectedDay: estimate.day,
          confidence: estimate.confidence,
          fromDate: new Date(),
          justFoundBill: true,
        }).toISOString();
      } else {
        // No usable observations â€” let the daily dispatcher pick it up tomorrow
        // and we'll learn the cycle from successful fetch-latest runs.
        updatePayload.next_check_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
      await supabaseAdmin
        .from('municipal_credentials')
        .update(updatePayload)
        .eq('id', credential.id);
    } catch (cycleErr) {
      console.error('[autofetch/backfill] Cycle estimate update failed:', cycleErr);
      // Non-fatal â€” fetch-latest will still run on the default daily cadence.
    }

    // 9. Send Summary Email
    if (profile?.email && billsAnalysed > 0) {
      const topFindings = allFindings.sort((a, b) => b.amount - a.amount).slice(0, 3);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await sendAutofetchReportEmail({
        userEmail: profile.email,
        userName: profile.full_name || 'User',
        billsAnalysed,
        billsSkipped,
        totalRecoverable,
        topFindings,
        dashboardUrl: `${appUrl}/dashboard`
      });
    }

    // 10. Mark Job Completed
    await supabaseAdmin.from('scrape_jobs').update({
      status: 'completed',
      processed_bills: billsAnalysed + billsSkipped,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return NextResponse.json({ success: true, billsAnalysed, billsSkipped });

  } catch (error) {
    console.error('[autofetch/backfill] Global error:', error);
    if (jobId) {
      try {
        await markJobFailed(createAdminClient(), jobId, 'Unexpected server error');
      } catch {}
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function markJobFailed(supabaseAdmin: ReturnType<typeof createAdminClient>, jobId: string, errorMsg: string) {
  await supabaseAdmin.from('scrape_jobs').update({
    status: 'failed',
    error_message: errorMsg,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', jobId);
}
