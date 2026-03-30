import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Await params in Next.js 14 App Router
    const caseId = await Promise.resolve(params.id);

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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const caseId = await Promise.resolve(params.id);
    const body = await request.json();

    const { status, amount_recovered } = body;

    if (status === 'resolved' && amount_recovered !== undefined) {
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
        .update({ status: 'resolved', amount_recovered, resolved_at: new Date().toISOString() })
        .eq('id', caseId)
        .eq('user_id', user.id);

      // Process success fee asynchronously or await it
      await processSuccessFee(caseId, amount_recovered, profile.payfast_token);

      return NextResponse.json({ success: true, status: 'resolved' });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  } catch (err: any) {
    console.error('[Cases PATCH Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
