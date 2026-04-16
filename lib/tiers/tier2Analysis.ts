import { ValidationFinding } from '@/types/analysis';
import { getApprovedIncrease } from '../tariff/tariffLookup';

export function runTier2Analysis(
  municipality: string,
  tariffYear: string,
  currentAmount: number,
  priorAmount: number | null
): ValidationFinding | null {
  const approvedIncrease = getApprovedIncrease(municipality, tariffYear);
  
  if (approvedIncrease === null || priorAmount === null) {
    return null;
  }

  const actualIncreasePct = ((currentAmount - priorAmount) / priorAmount) * 100;

  if (actualIncreasePct > approvedIncrease + 0.5) {
    return {
      type: 'OVER_APPROVED_INCREASE' as any, // Extending type in analysis types physically later
      description: `Bill electricity increased by ${actualIncreasePct.toFixed(1)}%, exceeding NERSA maximum of ${approvedIncrease}%`,
      billedAmount: currentAmount,
      expectedAmount: parseFloat((priorAmount * (1 + approvedIncrease / 100)).toFixed(2)),
      discrepancy: parseFloat((currentAmount - (priorAmount * (1 + approvedIncrease / 100))).toFixed(2)),
      lineReference: `Year-on-Year Electricity Charge Comparison for ${tariffYear}`,
      invoiceNumber: 'N/A', // Cross-bill logic usually handles this
      billingDate: 'N/A',
      legalBasis: 'Electricity Regulation Act s4(e) — licensee may not charge above NERSA-approved tariff',
    };
  }

  return null;
}

export function generateTier2ContextualReport(
  municipality: string, 
  tariffYear: string, 
  actualIncreasePct: number | null
) {
  const approvedIncrease = getApprovedIncrease(municipality, tariffYear);

  return {
    municipality,
    nersa_approved_increase: approvedIncrease ? `${approvedIncrease}%` : 'Unknown',
    national_average_increase: '12.3%', // Given by prompt mapping
    your_bill_change: actualIncreasePct !== null ? `${actualIncreasePct.toFixed(1)}%` : 'Insufficient history',
    status: (actualIncreasePct !== null && approvedIncrease !== null && actualIncreasePct <= approvedIncrease + 0.5)
      ? 'Bill increase is within NERSA approved limits.\nWe are working to obtain your full tariff schedule to enable complete verification. You will be notified when full coverage is available.'
      : 'Awaiting full verification data.'
  };
}
