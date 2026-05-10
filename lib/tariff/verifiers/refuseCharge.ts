import { resolveTariff } from '../tariff-resolver';
import { getTariffStore } from '../registry';
import { getTariffYearForDate } from '../tariffLookup';

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
    console.warn(`[Refuse] No tariff found via resolver. Falling back to generic store.`);
    const store = getTariffStore('city-of-cape-town');
    const fy = getTariffYearForDate(billingDateStr);
    const fallback = store.getRate('REFUSE', fy, '240L');

    if (fallback !== undefined) {
      const delta = billedAmount - fallback.rate_value;
      if (Math.abs(delta) > 0.02) {
        return {
          result: 'FAIL',
          approved_amount: fallback.rate_value,
          delta: parseFloat(delta.toFixed(2)),
          confidence: 'CONFIRMED',
          source_url: fallback.source_url || 'Generic Store'
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
