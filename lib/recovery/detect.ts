/**
 * Recovery Detection — Matches credits in current bills against prior findings.
 *
 * Compares the current bill's credit/refund line items against the previous
 * month's findings to determine if a municipality corrected an overcharge.
 *
 * Source of truth: Phase 5 spec §recovery-detection.
 */

import { RECOVERY_MINIMUM_ZAR, RECOVERY_FEE_PERCENTAGE } from '@/lib/constants/fees';

export interface Finding {
  id: string;
  type: string;
  service_type: string;
  overchargeZar: number;
  amount_charged: number;
  expected_amount: number;
  line_item: string;
}

export interface CreditLineItem {
  description: string;
  amount: number;       // Negative value or absolute credit amount
  service_type?: string;
}

export interface RecoveryMatch {
  findingId: string;
  findingType: string;
  creditDescription: string;
  creditAmount: number;          // The absolute credit value
  originalOvercharge: number;    // The original finding's overchargeZar
  recoveredAmount: number;       // min(credit, overcharge) — conservative
  feeAmount: number;             // recoveredAmount * FEE_PERCENTAGE
}

export interface RecoveryResult {
  matches: RecoveryMatch[];
  totalRecovered: number;
  totalFee: number;
  meetsThreshold: boolean;       // totalRecovered >= RECOVERY_MINIMUM_ZAR
}

/**
 * Detect recoveries by matching bill credits to prior findings.
 *
 * Matching logic:
 * 1. For each credit line item on the current bill
 * 2. Find a prior finding with matching service_type
 * 3. Check if credit amount is within 30% tolerance of the finding's overchargeZar
 * 4. If match: the recovery = min(credit, overcharge) to be conservative
 *
 * Does NOT perform any charges — just detection.
 */
export function detectRecoveries(
  creditItems: CreditLineItem[],
  priorFindings: Finding[],
): RecoveryResult {
  const matches: RecoveryMatch[] = [];
  const matchedFindingIds = new Set<string>();

  for (const credit of creditItems) {
    const creditAmount = Math.abs(credit.amount);
    if (creditAmount < 1) continue; // Skip trivial amounts

    // Try to match against unmatched prior findings
    for (const finding of priorFindings) {
      if (matchedFindingIds.has(finding.id)) continue; // Already matched

      // Service type match (case-insensitive, partial)
      const serviceMatch = matchServiceType(credit, finding);
      if (!serviceMatch) continue;

      // Amount tolerance: credit should be within 30% of the overcharge
      const tolerance = finding.overchargeZar * 0.30;
      const delta = Math.abs(creditAmount - finding.overchargeZar);
      if (delta > tolerance) continue;

      // Match found — conservative recovery = min(credit, overcharge)
      const recoveredAmount = Math.min(creditAmount, finding.overchargeZar);
      const feeAmount = Math.round(recoveredAmount * RECOVERY_FEE_PERCENTAGE * 100) / 100;

      matches.push({
        findingId: finding.id,
        findingType: finding.type,
        creditDescription: credit.description,
        creditAmount,
        originalOvercharge: finding.overchargeZar,
        recoveredAmount,
        feeAmount,
      });

      matchedFindingIds.add(finding.id);
      break; // One credit matches one finding
    }
  }

  const totalRecovered = matches.reduce((sum, m) => sum + m.recoveredAmount, 0);
  const totalFee = matches.reduce((sum, m) => sum + m.feeAmount, 0);

  return {
    matches,
    totalRecovered,
    totalFee,
    meetsThreshold: totalRecovered >= RECOVERY_MINIMUM_ZAR,
  };
}

/**
 * Match credit line item to finding by service type.
 * Handles common patterns: "water" in description matches "water" service type.
 */
function matchServiceType(credit: CreditLineItem, finding: Finding): boolean {
  const creditText = (credit.description + ' ' + (credit.service_type || '')).toLowerCase();
  const findingService = finding.service_type.toLowerCase();

  // Direct match
  if (credit.service_type && credit.service_type.toLowerCase() === findingService) {
    return true;
  }

  // Keyword extraction for common services
  const serviceKeywords: Record<string, string[]> = {
    'water': ['water', 'h2o'],
    'electricity': ['electricity', 'elec', 'electric'],
    'refuse': ['refuse', 'waste', 'garbage'],
    'sewerage': ['sewerage', 'sewer', 'sanitation'],
    'rates': ['rates', 'property rates', 'assessment'],
  };

  for (const [, keywords] of Object.entries(serviceKeywords)) {
    const findingMatches = keywords.some((k) => findingService.includes(k));
    const creditMatches = keywords.some((k) => creditText.includes(k));
    if (findingMatches && creditMatches) return true;
  }

  return false;
}
