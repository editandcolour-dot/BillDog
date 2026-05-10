/**
 * GET /api/autofetch/jobs/status
 *
 * Returns the current state of the user's most recent scrape jobs.
 * Used by the ProcessingBanner component to show real-time job progress.
 *
 * Response:
 * {
 *   active_job: { id, job_type, status, total_bills, processed_bills, created_at } | null,
 *   last_completed: { id, job_type, status, processed_bills, completed_at } | null
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Active job (queued or running)
    const { data: activeJob } = await supabase
      .from('scrape_jobs')
      .select('id, job_type, status, total_bills, processed_bills, created_at')
      .eq('user_id', user.id)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Last completed job (for "just finished" state)
    const { data: lastCompleted } = await supabase
      .from('scrape_jobs')
      .select('id, job_type, status, processed_bills, completed_at, error_message')
      .eq('user_id', user.id)
      .in('status', ['completed', 'failed'])
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      active_job: activeJob || null,
      last_completed: lastCompleted || null,
    });

  } catch (error) {
    console.error('[jobs/status] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 500 });
  }
}
