import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyQStashSignature } from '@/lib/qstash/verify';
import { qstashClient } from '@/lib/qstash/client';

export const maxDuration = 120;

/**
 * Daily autofetch dispatcher (formerly `monthly`).
 *
 * Runs once per day on a QStash schedule. Uses the cycle estimate stored on
 * each `municipal_credentials` row (see [lib/autofetch/cycleEstimator.ts]) to
 * skip credentials whose next bill isn't due yet — so we only spin up
 * Playwright for accounts we actually expect a new bill from today.
 *
 * Selection:
 *   - verified_at IS NOT NULL AND revoked_at IS NULL
 *   - next_check_at IS NULL  (fresh / pre-cycle credential) OR
 *     next_check_at <= now()
 */
export async function POST(request: NextRequest) {
  // 1. Verify signature
  const isValid = await verifyQStashSignature(request);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 });
  }

  try {
    const supabaseAdmin = createAdminClient();

    // 2. In-flight guard: skip if another dispatcher started in the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: existingJobs } = await supabaseAdmin
      .from('scrape_jobs')
      .select('id')
      .eq('job_type', 'daily_dispatcher')
      .eq('status', 'running')
      .gte('started_at', twoHoursAgo)
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      return NextResponse.json({ message: 'Daily dispatcher already running' }, { status: 200 });
    }

    // Record the dispatcher job
    const { data: dispatcherJob } = await supabaseAdmin
      .from('scrape_jobs')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // System user or empty
        credential_id: null,
        job_type: 'daily_dispatcher',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    const jobId = dispatcherJob?.id;

    // 3. Find active credentials whose next_check_at is due (or null).
    const nowIso = new Date().toISOString();
    const { data: credentials, error: credError } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id')
      .is('revoked_at', null)
      .not('verified_at', 'is', null)
      .or(`next_check_at.is.null,next_check_at.lte.${nowIso}`);

    if (credError) {
      throw new Error(`Failed to fetch credentials: ${credError.message}`);
    }

    // Count total active for visibility into how many we skipped today.
    const { count: totalActive } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id', { count: 'exact', head: true })
      .is('revoked_at', null)
      .not('verified_at', 'is', null);
    const skippedCount = (totalActive ?? 0) - (credentials?.length ?? 0);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let enqueuedCount = 0;

    // 4. Enqueue individual jobs to fetch-latest
    for (const cred of (credentials || [])) {
      try {
        await qstashClient.publish({
          url: `${appUrl}/api/autofetch/worker/fetch-latest`,
          body: JSON.stringify({ credential_id: cred.id }),
          retries: 3,
        });
        enqueuedCount++;
      } catch (err) {
        console.error(`[autofetch/daily] Failed to enqueue job for credential ${cred.id}:`, err);
      }
    }

    if (jobId) {
      await supabaseAdmin
        .from('scrape_jobs')
        .update({
          status: 'completed',
          total_bills: enqueuedCount,
          processed_bills: enqueuedCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    return NextResponse.json({
      success: true,
      enqueued: enqueuedCount,
      skipped_not_due: skippedCount,
      total_active: totalActive ?? 0,
    });
  } catch (error) {
    console.error('[autofetch/daily] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
