import { resolveTariff } from '../tariff-resolver';

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

  // Determine size
  const meterMatch = billedLabel.match(/\((\d+)mm\s*-/i);
  const size = meterMatch ? `${meterMatch[1]}mm` : '20mm';

  const multiplierMatch = billedLabel.match(/x\s*(\d+)/i);
  const multiplier = multiplierMatch ? parseInt(multiplierMatch[1], 10) : 1;
  const effectiveBilledAmount = billedAmount / multiplier;

  const resolution = await resolveTariff({
    municipality: normMunicipality,
    tariffType: 'WATER_FIXED_BASIC',
    billingDate,
    subKey: size
  });

  if (resolution.result === 'SKIP' || !resolution.amount) {
    return { result: 'SKIP' };
  }

  const expectedAmount = resolution.amount;
  const expectedTotal = expectedAmount * multiplier;
  const tolerance = 0.10;

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
