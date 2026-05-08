/**
 * POST /api/autofetch/jobs/[id]/retry
 *
 * Retry a failed scrape job by creating a new job row inheriting
 * the original job's credential_id and job_type.
 *
 * Constraints:
 * - Auth + ownership required
 * - Original job must have status === 'failed'
 * - Rate limited: 3 retries per original job per 24h
 * - Does NOT execute the job — that's Phase 3 (QStash enqueue)
 *
 * Source of truth: implementation_plan Phase 2.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRateLimiter, rateLimitExceededResponse } from '@/lib/rate-limit';

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

    // 6. Create new job row inheriting from original
    const { data: newJob, error: insertError } = await supabaseAdmin
      .from('scrape_jobs')
      .insert({
        user_id: user.id,
        credential_id: originalJob.credential_id,
        job_type: originalJob.job_type,
        status: 'queued',
      })
      .select('id')
      .single();

    if (insertError || !newJob) {
      console.error('[autofetch/jobs/retry] Insert failed:', insertError?.message);
      return NextResponse.json({ error: 'Failed to create retry job' }, { status: 500 });
    }

    console.log(`[autofetch/jobs/retry] Created retry job ${newJob.id} from original ${jobId} for user ${user.id}`);

    // Phase 2: Does NOT execute the job. Phase 3 adds QStash enqueue here.
    return NextResponse.json({ job_id: newJob.id });

  } catch (error) {
    console.error('[autofetch/jobs/retry] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
