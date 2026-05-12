/**
 * Dispute Channel Classifier
 *
 * Routes detected billing errors to the correct dispute channel:
 * - Section 102 of Municipal Systems Act (billing disputes)
 * - Section 50 of Municipal Property Rates Act (valuation objections)
 *
 * These channels have different legal requirements, templates,
 * and prescription windows. Letters cannot combine the two.
 */

import type { FindingType } from '@/types/analysis';

export type DisputeChannel = 'section_102_billing' | 'section_50_valuation';

/**
 * Section 50 finding types — property valuation related.
 * These require a SACPVP-registered valuer report and have
 * 30-year prescription. They go through the Valuation Roll
 * objection process, NOT Section 102 billing dispute.
 */
const SECTION_50_TYPES: Set<string> = new Set([
  'RATES_CALC_ERROR',     // Only when related to valuation, not arithmetic
  'REBATE_CALC_ERROR',    // Only when related to valuation-based rebate
  'UNKNOWN_RATE_APPLIED', // Only when the rate dispute is about valuation
]);

/**
 * Checks if a finding description indicates a valuation-related issue
 * vs a tariff/arithmetic issue.
 */
function isValuationRelated(description: string): boolean {
  const valuationKeywords = [
    'valuation',
    'property value',
    'rateable value',
    'valuation roll',
    'zoning',
    'property category',
    'vacant vs developed',
    'municipal valuation',
  ];
  const lowerDesc = description.toLowerCase();
  return valuationKeywords.some((kw) => lowerDesc.includes(kw));
}

/**
 * Classifies a finding into the correct dispute channel.
 *
 * Default: section_102_billing (billing disputes)
 * Only routes to section_50_valuation when:
 * 1. Finding type is in the SECTION_50_TYPES set, AND
 * 2. The description contains valuation-related keywords
 */
export function classifyDisputeChannel(
  findingType: FindingType | string,
  description: string,
): DisputeChannel {
  if (SECTION_50_TYPES.has(findingType) && isValuationRelated(description)) {
    return 'section_50_valuation';
  }
  return 'section_102_billing';
}

/**
 * Maps BillingError.service_type to charge_type for prescription calculation.
 */
export function mapServiceToChargeType(
  serviceType: string,
): 'electricity' | 'water' | 'sewer' | 'refuse' | 'rates' | 'sundry' {
  switch (serviceType) {
    case 'electricity': return 'electricity';
    case 'water': return 'water';
    case 'sewerage': return 'sewer';
    case 'refuse': return 'refuse';
    case 'rates': return 'rates';
    case 'gas': return 'sundry';
    default: return 'sundry';
  }
}
