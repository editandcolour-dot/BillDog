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

export async function verifyWaterFixedCharge(
  billedAmount: number,
  billedLabel: string,
  billingDate: string,
  municipality: string,
  propertyValue?: number
): Promise<VerificationResult> {
  const normMunicipality = municipality === 'City of Cape Town' ? 'CoCT' : municipality;

  // Determine size or band key from the label
  const meterMatch = billedLabel.match(/(\d+)mm/i);
  const bandMatch = billedLabel.match(/R\s*([\d\s]+)\s*-\s*R\s*([\d\s]+)/i);
  
  let sizeOrBand: string;
  if (meterMatch) {
    sizeOrBand = `${meterMatch[1]}mm`;
  } else if (bandMatch) {
    // Normalise to "R4500001-R5000000" format for lookup
    const lower = bandMatch[1].replace(/\s/g, '');
    const upper = bandMatch[2].replace(/\s/g, '');
    sizeOrBand = `R${lower}-R${upper}`;
  } else {
    sizeOrBand = '20mm'; // Default fallback
  }

  const multiplierMatch = billedLabel.match(/x\s*(\d+)/i);
  const multiplier = multiplierMatch ? parseInt(multiplierMatch[1], 10) : 1;

  const resolution = await resolveTariff({
    municipality: normMunicipality,
    tariffType: 'WATER_FIXED_BASIC',
    billingDate,
    subKey: sizeOrBand
  });

  if (resolution.result === 'SKIP' || !resolution.amount) {
    console.warn(`[Water Fixed Basic] No tariff found via resolver. Falling back to generic store.`);
    const store = getTariffStore('city-of-cape-town');
    const fy = getTariffYearForDate(billingDate);
    const fallback = store.getRate('WATER_FIXED_BASIC_METER', fy, sizeOrBand);

    if (fallback !== undefined) {
      const expectedTotal = fallback.rate_value * multiplier;
      if (Math.abs(billedAmount - expectedTotal) <= 0.10) {
        return { result: 'PASS', approved_amount: parseFloat(expectedTotal.toFixed(2)) };
      } else {
        return {
          result: 'FAIL',
          approved_amount: parseFloat(expectedTotal.toFixed(2)),
          billed_amount: billedAmount,
          delta: parseFloat((billedAmount - expectedTotal).toFixed(2)),
          source_document: fallback.source_document_title || 'Generic Store',
          source_url: fallback.source_url || 'N/A',
          confidence: 'CONFIRMED'
        };
      }
    }
    return { result: 'SKIP' };
  }

  const rawAmount = resolution.amount;
  // v2 cache stores excl-VAT, but CoCT bills print water fixed basic INCL-VAT.
  // Gross up when the resolver provides a vatRate.
  const expectedAmount = resolution.vatRate
    ? Math.round(rawAmount * (1 + resolution.vatRate) * 100) / 100
    : rawAmount;
  const expectedTotal = expectedAmount * multiplier;
  const tolerance = 0.10;

  console.log(`[FIXED_BASIC] meterSize="${sizeOrBand}" unitRate=${billedAmount} expectedRate=${expectedTotal}`);

  if (Math.abs(billedAmount - expectedTotal) <= tolerance) {
    return { result: 'PASS', approved_amount: parseFloat(expectedTotal.toFixed(2)) };
  } else {
    return {
      result: 'FAIL',
      approved_amount: parseFloat(expectedTotal.toFixed(2)),
      billed_amount: billedAmount,
      delta: parseFloat((billedAmount - expectedTotal).toFixed(2)),
      source_document: resolution.source === 'gazette' ? 'Gazette Extract' : 'Tariff Cache',
      source_url: 'N/A',
      confidence: resolution.verified ? 'CONFIRMED' : 'UNVERIFIED'
    };
  }
}
