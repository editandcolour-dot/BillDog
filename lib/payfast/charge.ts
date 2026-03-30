import { generateSignature } from './tokenise';
import { createAdminClient } from '../supabase/admin';

const MINIMUM_CHARGE_ZAR = 50;  // Not worth processing below R50
const FEE_PERCENTAGE = 0.20;

interface ChargeCalculation {
  amountRecovered: number;
  fee: number;
  belowMinimum: boolean;
}

export function calculateFee(amountRecovered: number): ChargeCalculation {
  const fee = Math.round(amountRecovered * FEE_PERCENTAGE * 100) / 100;
  return {
    amountRecovered,
    fee,
    belowMinimum: fee < MINIMUM_CHARGE_ZAR,
  };
}

export async function chargeToken(params: {
  token: string;
  amount: number;      // In ZAR (e.g. 240.00)
  caseId: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.PAYFAST_SANDBOX === 'true'
    ? 'https://sandbox.payfast.co.za'
    : 'https://api.payfast.co.za';

  const timestamp = new Date().toISOString();

  const headers: Record<string, string> = {
    'merchant-id': process.env.PAYFAST_MERCHANT_ID!,
    'version': 'v1',
    'timestamp': timestamp,
  };

  // Generate API signature
  const signature = generateSignature(headers, process.env.PAYFAST_PASSPHRASE!);
  headers.signature = signature;

  try {
    const response = await fetch(
      `${baseUrl}/subscriptions/${params.token}/adhoc`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100),   // Amount in cents
          item_name: `Billdog Success Fee — Case ${params.caseId}`,
          m_payment_id: params.caseId,
        }),
      },
    );

    if (response.ok) {
        return { success: true };
    }

    console.error('[payfast/charge] Failed', {
      status: response.status,
      caseId: params.caseId,
    });

    return {
      success: false,
      error: response.status === 402
        ? 'Card declined — please update your card in Settings.'
        : 'Payment processing failed. Please try again.',
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function processSuccessFee(
  caseId: string,
  amountRecovered: number,
  token: string,
): Promise<void> {
  const supabase = await createAdminClient();

  // Idempotency check — CRITICAL
  const { data: existingCase } = await supabase
    .from('cases')
    .select('fee_charged')
    .eq('id', caseId)
    .single();

  if (existingCase?.fee_charged !== null) {
    console.warn('[payfast] Duplicate charge attempt blocked', { caseId });
    return; // Already charged — do nothing
  }

  const { fee, belowMinimum } = calculateFee(amountRecovered);

  if (belowMinimum) {
    // Below minimum — waive the fee
    await supabase.from('cases').update({ fee_charged: 0 }).eq('id', caseId);
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'fee_waived',
      note: `Fee of R${fee.toFixed(2)} below R${MINIMUM_CHARGE_ZAR} minimum. Waived.`,
    });
    return;
  }

  const result = await chargeToken({ token, amount: fee, caseId });

  if (result.success) {
    await supabase.from('cases').update({ fee_charged: fee }).eq('id', caseId);
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'fee_charged',
      note: `Success fee of R${fee.toFixed(2)} charged (20% of R${amountRecovered.toFixed(2)}).`,
    });
  } else {
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'charge_failed',
      note: result.error ?? 'Payment failed.',
    });
  }
}
