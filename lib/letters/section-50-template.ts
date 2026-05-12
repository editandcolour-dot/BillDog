/**
 * Section 50 Valuation Notice Template
 *
 * When a billing error relates to property valuation (not billing arithmetic),
 * it falls under Section 50 of the Municipal Property Rates Act,
 * not Section 102 of the Municipal Systems Act.
 *
 * Phase 1: Informational only — tells the user they need a SACPVP valuer.
 * Does NOT auto-generate a dispute letter for this channel.
 */

import type { BillingError } from '@/types/analysis';
import { SECTION_50_NOTICE, formatRand } from './citations';

export interface Section50NoticeInput {
  accountHolder: string;
  accountNumber: string;
  propertyAddress: string;
  municipalityName: string;
  billPeriod: string;
  /** Only the errors classified as section_50_valuation */
  valuationErrors: BillingError[];
}

/**
 * Builds an informational notice explaining the Section 50 valuation process.
 * This is NOT a dispute letter — it guides the user to take manual action.
 */
export function buildSection50Notice(input: Section50NoticeInput): string {
  const sections: string[] = [];

  sections.push(
    `PROPERTY VALUATION NOTICE`,
    ``,
    `Account: ${input.accountNumber}`,
    `Property: ${input.propertyAddress}`,
    `Municipality: ${input.municipalityName}`,
    `Bill Period: ${input.billPeriod}`,
    ``,
  );

  // Explain what was found
  sections.push(`The following billing issues appear to relate to the property valuation rather than a tariff or arithmetic error:`, ``);

  input.valuationErrors.forEach((e, i) => {
    sections.push(
      `${i + 1}. ${e.line_item}`,
      `   Billed: ${formatRand(e.amount_charged)} | Expected: ${formatRand(e.expected_amount)}`,
      `   Issue: ${e.issue}`,
      ``,
    );
  });

  // Legal guidance
  sections.push(SECTION_50_NOTICE, ``);

  // What Billdog can and cannot do
  sections.push(
    `WHAT BILLDOG CAN DO`,
    ``,
    `Billdog can dispute billing arithmetic errors (tariff rates, tier calculations, fixed charges) via Section 102.`,
    ``,
    `However, property valuation disputes require a professional property valuer's report, which Billdog cannot provide. We recommend contacting a SACPVP-registered valuer in your area.`,
    ``,
    `If you believe the valuation on your account is incorrect, please pursue the Section 50 objection process separately. Billdog will continue to monitor your billing arithmetic for other errors.`,
  );

  return sections.join('\n');
}
