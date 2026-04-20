import { resolveTariff } from '../tariff-resolver';

export interface VerificationResult {
  result: 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIP';
  approved_amount?: number;
  billed_amount?: number;
  delta?: number;
  tariff_year?: string;
  source_document?: string;
  source_url?: string;
  confidence?: 'CONFIRMED' | 'BILL-VERIFIED' | 'SECONDARY' | 'UNVERIFIED';
}

export async function verifyElectricityHUCharge(
  billedAmount: number,
  billingDate: string,
  municipality: string
): Promise<VerificationResult> {
  const normMunicipality = municipality === 'City of Cape Town' ? 'CoCT' : municipality;

  const resolution = await resolveTariff({
    municipality: normMunicipality,
    tariffType: 'HUC',
    billingDate,
  });

  if (resolution.result === 'SKIP' || !resolution.amount) {
    console.warn(`[HUC] No tariff entry found via resolver. Skipping.`);
    return { result: 'SKIP' };
  }

  const expected = resolution.amount;
  const tolerance = 0.10;
  const delta = billedAmount - expected;
  
  if (Math.abs(delta) <= tolerance) {
    return { result: 'PASS', approved_amount: expected };
  } else {
    return {
      result: 'FAIL',
      approved_amount: expected,
      billed_amount: billedAmount,
      delta: parseFloat(delta.toFixed(2)),
      source_document: resolution.source === 'gazette' ? 'Gazette Extract' : 'Tariff Cache',
      source_url: resolution.source === 'gazette' ? 'N/A' : 'N/A',
      confidence: resolution.verified ? 'CONFIRMED' : 'UNVERIFIED',
    };
  }
}

