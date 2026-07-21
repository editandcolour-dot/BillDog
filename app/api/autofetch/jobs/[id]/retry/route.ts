/**
 * POST /api/autofetch/jobs/[id]/retry
 *
 * Retry a failed scrape job by ENQUEUEING the worker that owns its job_type
 * (monthly -> fetch-latest, backfill -> backfill) via QStash. Workers create
 * and track their own scrape_jobs rows, so no placeholder row is created here
 * — the old 'queued' row was never executed by anything and is gone.
 *
 * Constraints:
 * - Auth + ownership required
 * - Original job must have status === 'failed'
 * - Rate limited: 3 retries per original job per 24h
 * - Fail-closed: a failed enqueue returns 500, never a fake success
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRateLimiter, rateLimitExceededResponse } from '@/lib/rate-limit';
import { getQstashClient } from '@/lib/qstash/client';
import { retryWorkerPath } from '@/lib/autofetch/retry-target';

const retryLimiter = getRateLimiter(3, '1 d');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 2. Fetch original job and verify ownership
    const { data: originalJob, error: fetchError } = await supabaseAdmin
      .from('scrape_jobs')
      .select('id, user_id, credential_id, job_type, status')
      .eq('id', jobId)
      .single();

    if (fetchError || !originalJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (originalJob.user_id !== user.id) {
      console.error(`[autofetch/jobs/retry] Ownership violation: user ${user.id} attempted to retry job ${jobId}`);
      return NextResponse.json({ error: 'Unauthorised access' }, { status: 403 });
    }

    // 3. Validate job status
    if (originalJob.status !== 'failed') {
      return NextResponse.json(
        { error: `Cannot retry a job with status "${originalJob.status}". Only failed jobs can be retried.` },
        { status: 400 }
      );
    }

    // 4. Rate limit: 3 retries per original job per 24h
    const { success: withinLimit } = await retryLimiter.limit(`autofetch-retry:${jobId}`);
    if (!withinLimit) {
      return rateLimitExceededResponse();
    }

    // 5. Verify credential still exists and is not revoked
    const { data: credential } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id, revoked_at')
      .eq('id', originalJob.credential_id)
      .single();

    if (!credential || credential.revoked_at) {
      return NextResponse.json(
        { error: 'Cannot retry — credentials have been revoked or deleted.' },
        { status: 400 }
      );
    }

    // 6. Enqueue the worker that re-executes this job type.
    const workerPath = retryWorkerPath(originalJob.job_type);
    if (!workerPath) {
      return NextResponse.json(
        { error: `Job type "${originalJob.job_type}" cannot be retried.` },
        { status: 400 }
      );
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await getQstashClient().publish({
        url: `${appUrl}${workerPath}`,
        body: JSON.stringify({ credential_id: originalJob.credential_id }),
        retries: 3,
      });
    } catch (enqueueErr) {
      console.error('[autofetch/jobs/retry] Enqueue failed:', enqueueErr);
      return NextResponse.json({ error: 'Failed to enqueue retry' }, { status: 500 });
    }

    console.log(`[autofetch/jobs/retry] Retry of job ${jobId} (${originalJob.job_type}) enqueued for user ${user.id}`);
    return NextResponse.json({ enqueued: true, job_type: originalJob.job_type });

  } catch (error) {
    console.error('[autofetch/jobs/retry] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
