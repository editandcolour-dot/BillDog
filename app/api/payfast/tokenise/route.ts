import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTokeniseUrl } from '@/lib/payfast/tokenise';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (!process.env.PAYFAST_MERCHANT_ID || !process.env.PAYFAST_MERCHANT_KEY || !process.env.PAYFAST_PASSPHRASE) {
      console.error('[payfast/tokenise] Missing PAYFAST env vars');
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 });
    }

    const url = generateTokeniseUrl({
      userId: user.id,
      userEmail: user.email ?? '',
      userName: profile?.full_name ?? 'User',
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[payfast/tokenise] Error generating url', error);
    return NextResponse.json({ error: 'Failed to generate payment url' }, { status: 500 });
  }
}
