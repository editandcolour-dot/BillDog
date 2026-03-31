import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateSAID } from '@/lib/validators/sa-id';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'AUTH_ERROR' }, { status: 401 });
    }

    const body = await request.json();
    const { caseId, idNumber, consent } = body;

    if (!caseId || !idNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!consent) {
      return NextResponse.json({ error: 'Consent is required' }, { status: 400 });
    }

    // 2. Validate ID using Luhn algorithm
    const validation = validateSAID(idNumber);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.message || 'Invalid ID number' }, { status: 400 });
    }

    // 3. Verify case ownership and stage
    const { data: caseRecord, error: dbError } = await supabase
      .from('cases')
      .select('id, escalation_stage')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single();

    if (dbError || !caseRecord) {
      return NextResponse.json({ error: 'Case not found or unauthorized' }, { status: 403 });
    }

    // 4. Store ID in Vault and update case securely via RPC
    const { data: secretId, error: rpcError } = await supabase.rpc('store_poppi_id', {
      case_id: caseId,
      id_number: idNumber,
    });

    if (rpcError) {
      console.error('[Submit ID Api] RPC error:', rpcError);
      return NextResponse.json({ error: 'Secure encryption failed. ID not saved.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, caseId, secretId }, { status: 200 });

  } catch (error) {
    console.error('[Submit ID Api]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
