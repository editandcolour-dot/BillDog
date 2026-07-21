import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyDeletedCount } from '@/lib/cases/soft-delete';

export async function GET(
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

    // 2. Await params in Next.js 14 App Router
    const resolvedParams = await params;
    const caseId = resolvedParams.id;

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    // 3. Fetch Case Record
    const { data: caseRecord, error: dbError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (dbError || !caseRecord) {
      console.error('[Cases API] Database fetch error:', dbError);
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // 4. Case Ownership Check (redundant with RLS, but safe)
    if (caseRecord.user_id !== user.id) {
      console.error(`[Cases API] Ownership violation attempt on Case ${caseId} by User ${user.id}`);
      return NextResponse.json({ error: 'Unauthorised access' }, { status: 403 });
    }

    // 5. Check if user has saved card
    const { data: profile } = await supabase
      .from('profiles')
      .select('payfast_token')
      .eq('id', user.id)
      .single();
    const hasCard = !!profile?.payfast_token;

    // 6. Fetch related bills if it's a multi-bill case
    const { data: caseBills } = await supabase
      .from('case_bills')
      .select('id, bill_period, errors_found, total_billed, recoverable')
      .eq('case_id', caseId)
      .order('sort_order', { ascending: true });

    // Return the full record + bills
    return NextResponse.json({ 
      case: caseRecord, 
      bills: caseBills || [],
      userEmail: user.email, 
      hasCard 
    }, { status: 200 });

  } catch (error) {
    console.error('[Cases API] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

import { processSuccessFee as _processSuccessFee } from '@/lib/payfast/charge';

void _processSuccessFee; // retained import for downstream reference / future operator-override route

/**
 * User-initiated case resolution is deprecated.
 *
 * Resolution + success-fee charge is now fully automated by the Resend inbound
 * webhook ([app/api/webhooks/resend-inbound/route.ts]) which:
 *   1. Receives the municipality's reply
 *   2. Uses Claude to extract the credited amount
 *   3. Marks the case `resolved` and calls `processSuccessFee()` against the
 *      saved PayFast token
 *
 * The UI no longer surfaces a manual "Confirm Resolution" form, and this
 * endpoint is locked so the API cannot be poked directly to short-circuit
 * the audit trail. Idempotency in `processSuccessFee` already prevents
 * double-charging, but we don't want random clients minting `resolved`
 * events either.
 *
 * If you need to force-resolve a case (e.g. operator override), do it
 * server-side with the service role key, not via this user-scoped route.
 */
export async function PATCH(
  _request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    {
      error: 'manual_resolution_disabled',
      message:
        'Case resolution is automated. Billdog will mark the case resolved and charge the success fee when the municipality confirms a credit.',
    },
    { status: 410 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const caseId = resolvedParams.id;

    // 1. Fetch case and verify ownership
    const { data: caseRecord, error: caseError } = await supabase
      .from('cases')
      .select('id, user_id, bill_url, status')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single();

    if (caseError || !caseRecord) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }

    // 2. Block deletion of resolved cases with charges (financial audit trail)
    if (caseRecord.status === 'resolved') {
      return NextResponse.json({
        error: 'Resolved cases with billing history cannot be deleted. Contact support if needed.',
      }, { status: 400 });
    }

    // 3. Soft-delete — the SAME semantics as bulk-delete (deleted_at set,
    // rows retained for the audit trail; POPIA erasure happens via account
    // deletion). The old hard-delete cascade is gone: it was FK-blocked by
    // scraped_bills -> case_bills for any autofetch case, ignored its child
    // delete errors, and contradicted the bulk route's soft-delete.
    // FAIL-CLOSED: the update returns the affected rows and zero rows is a
    // failure — Supabase answers 200 even when RLS/filters deleted nothing.
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();

    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from('cases')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', caseId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select('id');

    const verdict = verifyDeletedCount(deletedRows, [caseId]);

    if (deleteError || !verdict.ok) {
      console.error('[Cases DELETE] Soft-delete failed:', deleteError?.message ?? `0 rows affected for case ${caseId}`);
      return NextResponse.json({ error: 'Failed to delete case — nothing was deleted.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Case removed from your account.' });

  } catch (err: unknown) {
    console.error('[Cases DELETE Error]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
