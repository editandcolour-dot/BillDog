import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyQStashSignature } from '@/lib/qstash/verify';
import { qstashClient } from '@/lib/qstash/client';

export const maxDuration = 120;

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
      .eq('job_type', 'monthly_dispatcher')
      .eq('status', 'running')
      .gte('started_at', twoHoursAgo)
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      return NextResponse.json({ message: 'Monthly dispatcher already running' }, { status: 200 });
    }

    // Record the dispatcher job
    const { data: dispatcherJob } = await supabaseAdmin
      .from('scrape_jobs')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // System user or empty
        credential_id: null,
        job_type: 'monthly_dispatcher',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    const jobId = dispatcherJob?.id;

    // 3. Find active credentials
    // Note: verified_at IS NOT NULL and revoked_at IS NULL
    const { data: credentials, error: credError } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id')
      .is('revoked_at', null)
      .not('verified_at', 'is', null);

    if (credError) {
      throw new Error(`Failed to fetch credentials: ${credError.message}`);
    }

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
        console.error(`[autofetch/monthly] Failed to enqueue job for credential ${cred.id}:`, err);
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

    return NextResponse.json({ success: true, enqueued: enqueuedCount });
  } catch (error) {
    console.error('[autofetch/monthly] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
