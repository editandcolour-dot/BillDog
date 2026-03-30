import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/user/export
 * POPIA: Right to Access + Right to Data Portability.
 * Returns all personal data as JSON.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const [profileResult, casesResult, eventsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, phone, municipality, account_number, property_type, consent_given, consent_timestamp, consent_version, marketing_consent, created_at, updated_at')
        .eq('id', user.id)
        .single(),
      supabase
        .from('cases')
        .select('id, status, municipality, account_number, bill_period, total_billed, recoverable, letter_content, letter_sent_at, municipality_email, resolved_at, amount_recovered, fee_charged, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('case_events')
        .select('id, case_id, event_type, note, created_at')
        .in(
          'case_id',
          (await supabase.from('cases').select('id').eq('user_id', user.id)).data?.map((c) => c.id) ?? [],
        )
        .order('created_at', { ascending: false }),
    ]);

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      user_id: user.id,
      profile: profileResult.data,
      cases: casesResult.data ?? [],
      case_events: eventsResult.data ?? [],
    });
  } catch (error) {
    console.error('[User Export] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
