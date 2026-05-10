/**
 * GET /api/autofetch/status
 *
 * Returns the user's auto-fetch status for the /account dashboard.
 * Auth required. User-scoped via RLS.
 *
 * Returns:
 * - Active credential (municipality, last fetch, status)
 * - Recent scraped bills (last 12)
 * - Latest analysis summary
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

    // 1. Get active credential
    const { data: credential } = await supabase
      .from('municipal_credentials')
      .select('id, municipality_id, verified_at, last_login_at, last_login_error, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Get municipality name if credential exists
    let municipalityName: string | null = null;
    if (credential?.municipality_id) {
      const { data: muni } = await supabase
        .from('municipalities')
        .select('name')
        .eq('id', credential.municipality_id)
        .single();
      municipalityName = muni?.name ?? null;
    }

    // 3. Get latest scrape job
    const { data: latestJob } = await supabase
      .from('scrape_jobs')
      .select('id, job_type, status, total_bills, processed_bills, error_message, completed_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Get recent scraped bills (last 12)
    const { data: recentBills } = await supabase
      .from('scraped_bills')
      .select('id, bill_period, status, case_bill_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12);

    // 5. Get latest analysed case for summary
    const { data: latestCase } = await supabase
      .from('cases')
      .select('id, bill_period, total_billed, recoverable, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 6. Check if profile has ID stored
    const { data: hasId } = await supabase.rpc('has_profile_id');

    return NextResponse.json({
      credential: credential ? {
        id: credential.id,
        municipality_name: municipalityName,
        last_fetch_at: credential.last_login_at,
        last_fetch_error: credential.last_login_error,
        verified_at: credential.verified_at,
        status: credential.last_login_error ? 'failed' : (credential.last_login_at ? 'success' : 'pending'),
      } : null,
      latest_job: latestJob,
      recent_bills: recentBills || [],
      latest_case: latestCase,
      has_id_number: !!hasId,
    });

  } catch (error) {
    console.error('[autofetch/status] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
