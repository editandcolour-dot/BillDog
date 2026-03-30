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

    // Calculate deletion date
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + DELETION_DELAY_DAYS);

    // Schedule deletion
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ deletion_scheduled_at: deletionDate.toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('[User Delete] Failed to schedule deletion:', updateError.message);
      return NextResponse.json({ error: 'Failed to schedule account deletion.' }, { status: 500 });
    }

    // Sign user out
    await supabase.auth.signOut();

    return NextResponse.json({
      message: 'Account deletion scheduled.',
      deletion_date: deletionDate.toISOString(),
      note: `Your account and all personal data will be permanently deleted on ${deletionDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}. To cancel, log back in before that date.`,
    });
  } catch (error) {
    console.error('[User Delete] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
