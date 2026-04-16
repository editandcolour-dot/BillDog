import { ChargeVerification, getTariffYearForDate, loadTariffDb } from '../tariffLookup';

export function verifyElectricityHUCharge(
  billedAmount: number,
  billingDate: string,
  municipality: string
): ChargeVerification {
  const tariffYear = getTariffYearForDate(billingDate);
  const db = loadTariffDb(municipality, tariffYear);

  if (!db || !db.electricity || !db.electricity.home_user || db.electricity.home_user.fixed_charge_incl_vat === undefined) {
    return {
      result: 'UNKNOWN',
      expected_amount: null,
      billed_amount: billedAmount,
      delta: null,
      tariff_year: tariffYear,
      source_document: db?.gazette_source || null,
      source_url: db?.source_url || null,
      legal_basis: null,
      confidence: 'UNVERIFIED',
    };
  }

  const expectedAmount = db.electricity.home_user.fixed_charge_incl_vat;
  const tolerance = 0.10;
  const delta = billedAmount - expectedAmount;
  
  if (Math.abs(delta) <= tolerance) {
    return {
      result: 'PASS',
      expected_amount: expectedAmount,
      billed_amount: billedAmount,
      delta: parseFloat(delta.toFixed(2)),
      tariff_year: tariffYear,
      source_document: db.gazette_source,
      source_url: db.source_url,
      legal_basis: db.electricity.home_user.legal_note || null,
      confidence: 'CONFIRMED', // Hardcoding CONFIRMED as per VERIFICATION_STATUS for CoCT explicitly
    };
  } else {
    return {
      result: 'FAIL',
      expected_amount: expectedAmount,
      billed_amount: billedAmount,
      delta: parseFloat(delta.toFixed(2)),
      tariff_year: tariffYear,
      source_document: db.gazette_source,
      source_url: db.source_url,
      legal_basis: 'Discrepancy with officially published Home User Tariff',
      confidence: 'CONFIRMED',
    };
  }
}
