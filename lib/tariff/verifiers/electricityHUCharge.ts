import { resolveTariff } from '../tariff-resolver';
import { getTariffStore } from '../registry';
import { getTariffYearForDate } from '../tariffLookup';

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
    console.warn(`[HUC] No tariff entry found via resolver. Falling back to generic store.`);
    const store = getTariffStore('city-of-cape-town');
    const fy = getTariffYearForDate(billingDate);
    const fallback = store.getRate('HUC', fy, 'residential');

    if (fallback !== undefined) {
      const delta = billedAmount - fallback.rate_value;
      if (Math.abs(delta) <= 0.10) {
        return { result: 'PASS', approved_amount: fallback.rate_value };
      } else {
        return {
          result: 'FAIL',
          approved_amount: fallback.rate_value,
          billed_amount: billedAmount,
          delta: parseFloat(delta.toFixed(2)),
          source_document: fallback.source_document_title || 'Generic Store',
          source_url: fallback.source_url || 'N/A',
          confidence: 'CONFIRMED'
        };
      }
    }
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
