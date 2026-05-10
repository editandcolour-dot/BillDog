import { getTariffStore } from '../registry';
import { getTariffYearForDate } from '../tariffLookup';

export interface WaterTierVerificationResult {
  result: 'PASS' | 'FAIL' | 'SKIP';
  approved_rate?: number;
  delta?: number;
  tier?: number;
  confidence?: 'CONFIRMED' | 'BILL-VERIFIED' | 'SECONDARY' | 'UNVERIFIED';
  source_url?: string;
}

/**
 * Verify a water consumption tier rate against the tariff store.
 * @param billedRate - The per-kl rate printed on the bill
 * @param tierNumber - The tier number (1-4)
 * @param billingDateStr - Format DD/MM/YYYY or MM.YYYY
 * @param municipalityCode - e.g. 'CoCT'
 */
export function verifyWaterTierRate(
  billedRate: number,
  tierNumber: number,
  billingDateStr: string,
  municipalityCode = 'CoCT'
): WaterTierVerificationResult {
  const store = getTariffStore('city-of-cape-town');
  const fy = getTariffYearForDate(billingDateStr);
  const tariffCode = `WATER_TIER_${tierNumber}`;
  const entry = store.getRate(tariffCode, fy, 'residential');

  if (!entry) {
    return { result: 'SKIP', tier: tierNumber };
  }

  const delta = billedRate - entry.rate_value;
  if (Math.abs(delta) > 0.01) {
    return {
      result: 'FAIL',
      approved_rate: entry.rate_value,
      delta: parseFloat(delta.toFixed(2)),
      tier: tierNumber,
      confidence: 'CONFIRMED',
      source_url: entry.source_url || 'Generic Store'
    };
  }

  return { result: 'PASS', tier: tierNumber };
}
