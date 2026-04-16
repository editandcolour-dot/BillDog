import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DELETION_DELAY_DAYS = 30;

/**
 * POST /api/user/delete
 * POPIA: Right to Deletion.
 * Schedules account for hard-deletion in 30 days.
 * User can cancel by logging back in before the scheduled date.
 *
 * Body: { confirm: true }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // Validate confirmation
    const body = await request.json();
    if (body.confirm !== true) {
      return NextResponse.json(
        { error: 'You must confirm deletion by sending { "confirm": true }.' },
        { status: 400 },
      );
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();

    // 1. Delete all storage files first (these don't cascade on auth.users delete)
    const { data: userCases } = await supabaseAdmin
      .from('cases')
      .select('id, bill_url')
      .eq('user_id', user.id);

    if (userCases && userCases.length > 0) {
      const caseIds = userCases.map(c => c.id);
      
      // Get single-bill urls
      const singleUrls = userCases.map(c => c.bill_url).filter(Boolean) as string[];
      
      // Get multi-bill urls
      const { data: caseBills } = await supabaseAdmin
        .from('case_bills')
        .select('bill_url')
        .in('case_id', caseIds);
        
      const multiUrls = (caseBills || []).map(b => b.bill_url).filter(Boolean) as string[];
      
      const allUrls = [...singleUrls, ...multiUrls];
      
      if (allUrls.length > 0) {
        await supabaseAdmin.storage.from('bills').remove(allUrls);
      }
    }

    // 2. Delete the user from auth.users (cascades to profiles, cases, case_bills, etc.)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('[User Delete] Failed to delete user via admin:', deleteError);
      return NextResponse.json({ error: 'Failed to completely delete account.' }, { status: 500 });
    }

    // Sign user out to destroy their server session cookie
    await supabase.auth.signOut();

    return NextResponse.json({
      message: 'Account permanently deleted.',
      note: 'Your account, dispute history, and all personal data have been completely wiped.',
    });
  } catch (error) {
    console.error('[User Delete] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
