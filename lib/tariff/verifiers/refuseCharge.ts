import { resolveTariff } from '../tariff-resolver';
import { getCoctRefuseForDate } from '../coct-tariff-lookup';

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
    subKey: '240L'
  });

  if (resolution.result === 'SKIP' || !resolution.amount) {
    console.warn(`[Refuse] No tariff found via resolver. Falling back to coct-tariff-lookup.`);
    const fallback = getCoctRefuseForDate(billingDateStr);

    if (fallback !== undefined) {
      const delta = billedAmount - fallback;
      if (Math.abs(delta) > 0.02) {
        return {
          result: 'FAIL',
          approved_amount: fallback,
          delta: parseFloat(delta.toFixed(2)),
          confidence: 'CONFIRMED',
          source_url: 'coct-tariff-lookup.ts'
        };
      }
      return { result: 'PASS' };
    }
    return { result: 'SKIP' };
  }

  const approvedAmount = resolution.amount;
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
