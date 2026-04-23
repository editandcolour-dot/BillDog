import { resolveTariff } from '../tariff-resolver';
import { getCoctRatesForDate } from '../coct-tariff-lookup';

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

  const resolution = await resolveTariff({
    municipality: normMunicipality,
    tariffType: 'RATES',
    billingDate: fromDateStr
  });

  if (resolution.result === 'SKIP' || !resolution.amount) {
    const fallbackRate = getCoctRatesForDate(fromDateStr);
    
    // Diagnostic: log both sources and final decision
    console.log(`[RATES_TARIFF_DIAG] fromDate=${fromDateStr} rate=${annualRateApplied} resolver=${JSON.stringify(resolution.result)} fallback=${fallbackRate !== undefined ? fallbackRate : 'undefined'} decision=${fallbackRate !== undefined ? (Math.abs(annualRateApplied - fallbackRate) > 0.0000001 ? 'FAIL' : 'PASS') : 'SKIP→UNKNOWN_TARIFF'}`);
    
    if (fallbackRate !== undefined) {
      if (Math.abs(annualRateApplied - fallbackRate) > 0.0000001) {
        return {
          result: 'FAIL',
          approved_rate: fallbackRate,
          delta: annualRateApplied - fallbackRate,
          confidence: 'CONFIRMED',
          source_url: 'N/A',
          source_document: 'coct-tariff-lookup.ts'
        };
      }
      return { result: 'PASS', approved_rate: fallbackRate };
    }
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
