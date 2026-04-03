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

    // Return the full record
    return NextResponse.json({ case: caseRecord, userEmail: user.email, hasCard }, { status: 200 });

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

