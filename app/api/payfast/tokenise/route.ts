import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTokeniseFormData } from '@/lib/payfast/tokenise';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Optional caseId — when tokenising from the letter page, this routes the user
    // back to that letter after PayFast completes. Account page sends no body.
    let caseId: string | undefined;
    try {
      const body = await request.json();
      caseId = body.caseId;
    } catch { /* no body = tokenise from account page */ }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const merchantId = process.env['PAYFAST_MERCHANT_ID'];
    const merchantKey = process.env['PAYFAST_MERCHANT_KEY'];
    const passphrase = process.env['PAYFAST_PASSPHRASE'];
    const itnUrl = process.env['PAYFAST_ITN_URL'];

    const missing = [];
    if (!merchantId) missing.push('ID');
    if (!merchantKey) missing.push('KEY');
    if (!passphrase) missing.push('PASS');
    if (!itnUrl) missing.push('ITN');

    if (missing.length > 0) {
      console.error('[payfast/tokenise] Missing PAYFAST env vars:', missing.join(', '));
      return NextResponse.json({ error: `Payment gateway not configured. Missing: ${missing.join(', ')}` }, { status: 503 });
    }

    const isSandbox = String(process.env['PAYFAST_SANDBOX']).trim();
    console.log('[payfast/tokenise] === DIAGNOSTIC START ===');
    console.log('[payfast/tokenise] PAYFAST_SANDBOX env value:', JSON.stringify(isSandbox));
    console.log('[payfast/tokenise] Merchant ID (last 4):', merchantId?.slice(-4));
    console.log('[payfast/tokenise] Merchant Key (last 4):', merchantKey?.slice(-4));
    console.log('[payfast/tokenise] Passphrase length:', passphrase?.length);
    console.log('[payfast/tokenise] NEXT_PUBLIC_APP_URL:', process.env['NEXT_PUBLIC_APP_URL']);
    console.log('[payfast/tokenise] PAYFAST_ITN_URL:', process.env['PAYFAST_ITN_URL']);
    console.log('[payfast/tokenise] Return caseId:', caseId || '(none — account page flow)');

    const formData = generateTokeniseFormData({
      userId: user.id,
      userEmail: user.email ?? '',
      userName: profile?.full_name ?? 'User',
      returnCaseId: caseId,
    });

    // Log the outgoing payload (mask signature)
    const debugFields = { ...formData.fields };
    if (debugFields.signature) debugFields.signature = debugFields.signature.slice(0, 6) + '...';
    if (debugFields.email_address) debugFields.email_address = '***@***';
    console.log('[payfast/tokenise] Action URL:', formData.action);
    console.log('[payfast/tokenise] Fields:', JSON.stringify(debugFields, null, 2));
    console.log('[payfast/tokenise] === DIAGNOSTIC END ===');

    return NextResponse.json(formData);
  } catch (error) {
    console.error('[payfast/tokenise] Error generating form data', error);
    return NextResponse.json({ error: 'Failed to generate payment form' }, { status: 500 });
  }
}
