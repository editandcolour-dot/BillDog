/**
 * GET /api/autofetch/jobs
 *
 * List the authenticated user's scrape jobs.
 * Supports optional `?credential_id=X` filter.
 *
 * Auth required (cookie-based Supabase SSR).
 * Uses admin client to bypass RLS for read consistency.
 *
 * Source of truth: implementation_plan Phase 2.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Optional credential_id filter
    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get('credential_id');

    // 3. Build query
    const supabaseAdmin = createAdminClient();
    let query = supabaseAdmin
      .from('scrape_jobs')
      .select('id, credential_id, job_type, status, total_bills, processed_bills, failed_bills, error_message, started_at, completed_at, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (credentialId) {
      query = query.eq('credential_id', credentialId);
    }

    const { data: jobs, error: queryError } = await query;

    if (queryError) {
      console.error('[autofetch/jobs] Query failed:', queryError.message);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs || [] });

  } catch (error) {
    console.error('[autofetch/jobs] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
