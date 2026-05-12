import { resolveTariff } from '../tariff-resolver';
import { getTariffStore } from '../registry';
import { getTariffYearForDate } from '../tariffLookup';

export interface VerificationResult {
  result: 'PASS' | 'FAIL' | 'SKIP';
  approved_rate?: number;
  delta?: number;
  confidence?: 'CONFIRMED' | 'BILL-VERIFIED' | 'SECONDARY' | 'UNVERIFIED';
  source_url?: string;
  source_document?: string;
}

export async function verifyRatesCharge(
  annualRateApplied: number,
  fromDateStr: string, // format DD/MM/YYYY
  municipalityCode = 'CoCT'
): Promise<VerificationResult> {
  const normMunicipality = municipalityCode === 'City of Cape Town' ? 'CoCT' : municipalityCode;

  // ── FAST PATH: Check deterministic local JSON store first ──────────────
  // The local store has confirmed gazetted rates for all CoCT FYs.
  // Checking it first avoids expensive VeriCite Claude web-search calls
  // (~50s per lookup) when deterministic data already exists.
  const storeKey = normMunicipality === 'CoCT' ? 'city-of-cape-town' : normMunicipality;
  try {
    const store = getTariffStore(storeKey);
    const fy = getTariffYearForDate(fromDateStr);
    const localRate = store.getRate('RATES', fy, 'residential');
    
    if (localRate?.rate_value !== undefined) {
      const fallbackRate = localRate.rate_value;
      console.log(`[RATES_TARIFF_DIAG] fromDate=${fromDateStr} rate=${annualRateApplied} source=local_store fallback=${fallbackRate} decision=${Math.abs(annualRateApplied - fallbackRate) > 0.0000001 ? 'FAIL' : 'PASS'}`);
      
      if (Math.abs(annualRateApplied - fallbackRate) > 0.0000001) {
        return {
          result: 'FAIL',
          approved_rate: fallbackRate,
          delta: annualRateApplied - fallbackRate,
          confidence: 'CONFIRMED',
          source_url: localRate.source_url || 'N/A',
          source_document: localRate.source_document_title || 'Generic Store'
        };
      }
      return { result: 'PASS', approved_rate: fallbackRate };
    }
  } catch {
    // Store not found for this municipality — fall through to resolver
  }

  // ── SLOW PATH: tariff-resolver → v1 cache → v2 cache → VeriCite ──────
  const resolution = await resolveTariff({
    municipality: normMunicipality,
    tariffType: 'RATES',
    billingDate: fromDateStr
  });

  if (resolution.result === 'SKIP' || !resolution.amount) {
    console.log(`[RATES_TARIFF_DIAG] fromDate=${fromDateStr} rate=${annualRateApplied} resolver=${JSON.stringify(resolution.result)} decision=SKIP→UNKNOWN_TARIFF`);
    return { result: 'SKIP' };
  }

  const approvedRate = resolution.amount;

  // Diagnostic: log resolver success path
  console.log(`[RATES_TARIFF_DIAG] fromDate=${fromDateStr} rate=${annualRateApplied} resolver=PASS(${approvedRate}) decision=${Math.abs(annualRateApplied - approvedRate) > 0.0000001 ? 'FAIL' : 'PASS'}`);

  if (Math.abs(annualRateApplied - approvedRate) > 0.0000001) {
    return {
      result: 'FAIL',
      approved_rate: approvedRate,
      delta: annualRateApplied - approvedRate,
      confidence: resolution.verified ? 'CONFIRMED' : 'UNVERIFIED',
      source_url: resolution.source === 'gazette' ? 'Gazette' : 'Cache',
      source_document: resolution.source === 'gazette' ? 'Gazette Extract' : 'Tariff Cache',
    };
  }

  return { result: 'PASS', approved_rate: approvedRate };
}
