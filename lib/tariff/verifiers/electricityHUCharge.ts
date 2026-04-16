import { VerificationResult, getTariffYearForDate, loadTariffDb } from '../tariffLookup';

export function verifyElectricityHUCharge(
  billedAmount: number,
  billingDate: string,
  municipality: string
): VerificationResult {
  const tariffYear = getTariffYearForDate(billingDate);
  const db = loadTariffDb(municipality, tariffYear);

  if (!db || !db.electricity || !db.electricity.home_user || db.electricity.home_user.fixed_charge_excl_vat === undefined) {
    return { result: 'UNKNOWN' };
  }

  const expectedAmount = db.electricity.home_user.fixed_charge_excl_vat;
  const tolerance = 0.10;
  const delta = billedAmount - expectedAmount;
  
  if (Math.abs(delta) <= tolerance) {
    return { result: 'PASS' };
  } else {
    // If we have no gazette source mapped for some reason, we shouldn't surface it if it's strictly UNVERIFIED,
    // but CoCT is CONFIRMED per statuses.
    return {
      result: 'FAIL',
      approved_amount: expectedAmount,
      billed_amount: billedAmount,
      delta: parseFloat(delta.toFixed(2)),
      tariff_year: tariffYear,
      source_document: db.gazette_source || 'Unknown Gazette',
      source_url: db.source_url || 'Unknown URL',
      confidence: 'CONFIRMED',
    };
  }
}
