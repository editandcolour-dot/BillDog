import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

import { processSuccessFee } from '@/lib/payfast/charge';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const caseId = resolvedParams.id;
    const body = await request.json();

    const { status, amount_recovered } = body;

    if (status === 'resolved' && amount_recovered !== undefined) {
      const recoveredAmount = Number(amount_recovered);

      if (isNaN(recoveredAmount) || recoveredAmount <= 0) {
        return NextResponse.json({ error: 'Invalid recovery amount.' }, { status: 400 });
      }

      // Fetch case to get estimated recovery for validation
      const { data: caseRecord, error: caseError } = await supabase
        .from('cases')
        .select('recoverable, user_id')
        .eq('id', caseId)
        .eq('user_id', user.id)
        .single();

      if (caseError || !caseRecord) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }

      const estimated = Number(caseRecord.recoverable) || 0;

      // --- VALIDATION RULE 1: Suspiciously low (< 30% of estimated) ---
      // Block and require Bill 2 upload as proof
      if (estimated > 0 && recoveredAmount < estimated * 0.3) {
        return NextResponse.json({
          error: 'recovery_too_low',
          message: `The reported amount (R${recoveredAmount.toFixed(2)}) is significantly lower than our estimate (R${estimated.toFixed(2)}). Please upload your latest bill to verify the correction.`,
          requires_bill_2: true,
        }, { status: 422 });
      }

      // --- VALIDATION RULE 2: Suspiciously high (> 200% of estimated) ---
      // Flag for manual review — do NOT auto-charge
      if (estimated > 0 && recoveredAmount > estimated * 2.0) {
        await supabase
          .from('cases')
          .update({
            status: 'resolved',
            amount_recovered: recoveredAmount,
            resolved_at: new Date().toISOString(),
            needs_manual_review: true,
          })
          .eq('id', caseId)
          .eq('user_id', user.id);

        await supabase.from('case_events').insert({
          case_id: caseId,
          event_type: 'resolved',
          note: `User reported R${recoveredAmount.toFixed(2)} recovered (estimated: R${estimated.toFixed(2)}). Flagged for manual review — amount > 200% of estimate.`,
        });

        return NextResponse.json({
          success: true,
          status: 'resolved',
          needs_manual_review: true,
          message: 'Resolution recorded. The recovery amount is under review before billing.',
        });
      }

      // --- NORMAL PATH: Amount within acceptable bounds ---
      const { data: profile } = await supabase
        .from('profiles')
        .select('payfast_token')
        .eq('id', user.id)
        .single();
      
      if (!profile?.payfast_token) {
        return NextResponse.json({ error: 'No payment method saved.' }, { status: 400 });
      }

      await supabase
        .from('cases')
        .update({ status: 'resolved', amount_recovered: recoveredAmount, resolved_at: new Date().toISOString() })
        .eq('id', caseId)
        .eq('user_id', user.id);

      // Process success fee
      await processSuccessFee(caseId, recoveredAmount, profile.payfast_token);

      return NextResponse.json({ success: true, status: 'resolved' });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  } catch (err: unknown) {
    console.error('[Cases PATCH Error]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
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

    // 3. Delete associated case_bills and their storage files
    const { data: caseBills } = await supabase
      .from('case_bills')
      .select('id, bill_url')
      .eq('case_id', caseId);

    if (caseBills && caseBills.length > 0) {
      // Delete storage files for multi-bill uploads
      const storagePaths = caseBills
        .map(b => b.bill_url)
        .filter(Boolean);

      if (storagePaths.length > 0) {
        await supabase.storage.from('bills').remove(storagePaths);
      }

      // Delete case_bills rows
      await supabase.from('case_bills').delete().eq('case_id', caseId);
    }

    // 4. Delete the single-bill storage file (if legacy single-bill case)
    if (caseRecord.bill_url) {
      await supabase.storage.from('bills').remove([caseRecord.bill_url]);
    }

    // 5. Delete case_events (cascade should handle this, but be explicit)
    await supabase.from('case_events').delete().eq('case_id', caseId);

    // 6. Delete the case itself
    const { error: deleteError } = await supabase
      .from('cases')
      .delete()
      .eq('id', caseId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[Cases DELETE] Failed:', deleteError);
      return NextResponse.json({ error: 'Failed to delete case.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Case and all associated data deleted.' });

  } catch (err: unknown) {
    console.error('[Cases DELETE Error]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
