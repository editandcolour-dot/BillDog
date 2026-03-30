import { NextRequest, NextResponse } from 'next/server';
import { validateSignature, validateIp, validateWithPayFast, validatePaymentStatus, validateAmount } from '@/lib/payfast/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAlreadyProcessed } from '@/lib/payfast/idempotency';
import { logSecurityEvent } from '@/lib/payfast/security-log';
import { processSuccessFee } from '@/lib/payfast/charge';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse ITN body
    const bodyText = await request.text();
    const params = Object.fromEntries(new URLSearchParams(bodyText));

    // ──────────────────────────────────────────────
    // CHECK 1: Signature validation
    // ──────────────────────────────────────────────
    if (!validateSignature(params, process.env.PAYFAST_PASSPHRASE!)) {
      await logSecurityEvent('invalid_signature', {
        m_payment_id: params.m_payment_id,
        ip: getRequestIp(request),
      });
      return new NextResponse('Invalid signature', { status: 400 });
    }

    // ──────────────────────────────────────────────
    // CHECK 2: IP address validation
    // ──────────────────────────────────────────────
    const ip = getRequestIp(request);
    if (!validateIp(ip)) {
      await logSecurityEvent('invalid_ip', {
        ip,
        m_payment_id: params.m_payment_id,
      });
      return new NextResponse('Invalid source', { status: 403 });
    }

    // ──────────────────────────────────────────────
    // CHECK 3: PayFast server validation
    // ──────────────────────────────────────────────
    const isValid = await validateWithPayFast(params);
    if (!isValid) {
      await logSecurityEvent('payfast_validation_failed', {
        m_payment_id: params.m_payment_id,
      });
      return new NextResponse('Validation failed', { status: 400 });
    }

    // ──────────────────────────────────────────────
    // CHECK 4: Payment status
    // ──────────────────────────────────────────────
    const statusAction = validatePaymentStatus(params.payment_status);

    if (statusAction === 'reject') {
      await logSecurityEvent('unknown_payment_status', {
        status: params.payment_status,
        m_payment_id: params.m_payment_id,
      });
      return new NextResponse('Unknown status', { status: 400 });
    }

    if (statusAction === 'ignore') {
      console.info('[payfast-itn] Non-complete status', {
        status: params.payment_status,
        m_payment_id: params.m_payment_id,
      });
      return new NextResponse('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────
    // IDEMPOTENCY CHECK
    // ──────────────────────────────────────────────
    const pfPaymentId = params.pf_payment_id;
    if (await isAlreadyProcessed(pfPaymentId)) {
      console.info('[payfast-itn] Duplicate ITN ignored', { pfPaymentId });
      return new NextResponse('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────
    // PROCESS: Tokenisation or Charge
    // ──────────────────────────────────────────────
    const token = params.token;
    const mPaymentId = params.m_payment_id;

    if (token && parseFloat(params.amount_gross) === 0) {
      // TOKENISATION — zero-amount, token present
      const supabase = createAdminClient();
      await supabase
        .from('profiles')
        .update({ payfast_token: token })
        .eq('id', mPaymentId);

      await supabase.from('case_events').insert({
        case_id: null,
        event_type: 'card_tokenised',
        note: 'PayFast card token saved successfully.',
        metadata: { user_id: mPaymentId, pf_payment_id: pfPaymentId },
      });
    } else {
      // It's a payment check (like an adhoc charge)
      // So save an event if needed... the charge token method actually already creates the event
      // But we need to save the pfPaymentId to prevent idempotency 
      const supabase = createAdminClient();
      await supabase.from('case_events').insert({
        case_id: mPaymentId, // The caseID is passed as m_payment_id during charge Token
        event_type: 'payment_received',
        note: `Payment of R${params.amount_gross} processed.`,
        metadata: { amount: params.amount_gross, pf_payment_id: pfPaymentId },
      });
    }

    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('[payfast-itn] Handler error', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return 200 even on error to prevent infinite PayFast retries
    return new NextResponse('OK', { status: 200 });
  }
}

// Helper: extract IP from request
function getRequestIp(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || null;
}
