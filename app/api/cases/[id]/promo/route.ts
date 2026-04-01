import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPromoConfirmation } from '@/lib/resend/promo';

export async function POST(
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

    const caseId = await Promise.resolve(params.id);
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Promo code is required.' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // 2. Fetch promo code
    const { data: promoCode, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (promoError || !promoCode) {
      return NextResponse.json({ error: 'Invalid promo code.' }, { status: 400 });
    }

    // 3. Check validity & limits
    if (!promoCode.active || promoCode.resolved_count >= promoCode.max_free) {
      return NextResponse.json({ 
        error: 'All free spots are taken — but your dispute is still worth fighting. Standard success fee applies.' 
      }, { status: 400 });
    }

    // 4. Update the case
    const { data: caseRecord, error: caseError } = await supabase
      .from('cases')
      .update({
        promo_code: normalizedCode,
        promo_applied: true,
        promo_free: true
      })
      .eq('id', caseId)
      .eq('user_id', user.id)
      .select('id')
      .single();

    if (caseError || !caseRecord) {
      return NextResponse.json({ error: 'Failed to apply promo to case.' }, { status: 500 });
    }

    // 5. Send confirmation email (async)
    sendPromoConfirmation({ userEmail: user.email! }).catch((err) => {
      console.error('[Promo Email Error]', err);
    });

    return NextResponse.json({ success: true, message: 'Promo code applied successfully!' });

  } catch (error) {
    console.error('[Promo API Error]', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
