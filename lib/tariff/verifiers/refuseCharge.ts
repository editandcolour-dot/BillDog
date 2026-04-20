import { resolveTariff } from '../tariff-resolver';

export interface RefuseVerificationResult {
  result: 'PASS' | 'FAIL' | 'SKIP';
  approved_amount?: number;
  delta?: number;
  confidence?: 'CONFIRMED' | 'BILL-VERIFIED' | 'SECONDARY' | 'UNVERIFIED';
  source_url?: string;
}

export async function verifyRefuseCharge(
  billedAmount: number,
  billingDateStr: string, // format DD/MM/YYYY or MM.YYYY
  municipalityCode = 'CoCT'
): Promise<RefuseVerificationResult> {
  const normMunicipality = municipalityCode === 'City of Cape Town' ? 'CoCT' : municipalityCode;

  const resolution = await resolveTariff({
    municipality: normMunicipality,
    tariffType: 'REFUSE',
    billingDate: billingDateStr,
    // Typically a standard 240L bin, can dynamically supply if multiple bins exist
    subKey: '240L'
  });

  if (resolution.result === 'SKIP' || !resolution.amount) {
    return { result: 'SKIP' };
  }

  const approvedAmount = resolution.amount;

  // Exact match because it is a flat fee, but we allow 2 cent precision differences
  const delta = billedAmount - approvedAmount;
  if (Math.abs(delta) > 0.02) {
    return {
      result: 'FAIL',
      approved_amount: approvedAmount,
      delta: parseFloat(delta.toFixed(2)),
      confidence: resolution.verified ? 'CONFIRMED' : 'UNVERIFIED',
      source_url: resolution.source === 'gazette' ? 'Gazette' : 'Cache'
    };
  }

  return { result: 'PASS' };
}

