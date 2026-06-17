/**
 * Section 62 Appeal Letter Template — Deterministic Builder
 *
 * Used when a municipality rejects or refuses to correct a Section 102 dispute.
 * Must be lodged within 21 days of the rejection notification.
 *
 * Structure mirrors Section 102 but adds:
 * - Reference to original dispute and its rejection
 * - Section 62 legal basis
 * - Request for Municipal Manager's decision
 */

import type { BillingError } from '@/types/analysis';
import {
  SECTION_62_PREAMBLE,
  MKONTWANA_CITATION,
  TARICA_CITATION,
  formatRand,
  resolveLetterLineAmounts,
} from './citations';

export interface Section62AppealInput {
  accountHolder: string;
  idNumber: string;
  accountNumber: string;
  propertyAddress: string;
  municipalityName: string;
  billPeriod: string;
  /** Original dispute reference number from municipality */
  originalReferenceNumber: string;
  /** Date original dispute was sent */
  originalDisputeDate: string;
  /** Date of municipality's rejection/response */
  rejectionDate: string;
  /** Municipality's reason for rejection (if provided) */
  rejectionReason: string;
  /** Section 62 appeal recipient (from dispute_procedure) */
  appealRecipient: string;
  /** Billing errors from original dispute */
  errors: BillingError[];
  /** Claude-generated summary of why the rejection is incorrect */
  rebuttalParagraph: string;
}

export function buildSection62AppealLetter(input: Section62AppealInput): string {
  const recoverableErrors = input.errors.filter((e) => e.recoverable);
  const totalOvercharge = recoverableErrors.reduce(
    (sum, e) => sum + (e.overchargeZar ?? 0),
    0,
  );

  const sections: string[] = [];

  // ── 1. Header ───────────────────────────────────────────────────────
  sections.push(
    `SECTION 62 APPEAL — MUNICIPAL SYSTEMS ACT`,
    ``,
    `Date: ${new Date().toLocaleDateString('en-ZA')}`,
    ``,
    `To: ${input.appealRecipient || `The Municipal Manager, ${input.municipalityName}`}`,
    ``,
    `Re: Appeal against rejection of billing dispute`,
    `Account: ${input.accountNumber}`,
    `Property: ${input.propertyAddress}`,
    `Original Dispute Reference: ${input.originalReferenceNumber}`,
    `Original Dispute Date: ${input.originalDisputeDate}`,
    `Rejection Date: ${input.rejectionDate}`,
    ``,
  );

  // ── 2. Legal Preamble ───────────────────────────────────────────────
  sections.push(SECTION_62_PREAMBLE, ``);

  // ── 3. Original Dispute Summary ─────────────────────────────────────
  sections.push(
    `SUMMARY OF ORIGINAL DISPUTE`,
    ``,
    `On ${input.originalDisputeDate}, a formal billing dispute was lodged under Section 102(1)(a) of the Municipal Systems Act regarding account ${input.accountNumber} for the billing period ${input.billPeriod}.`,
    ``,
    `The dispute identified ${recoverableErrors.length} billing error${recoverableErrors.length === 1 ? '' : 's'} totalling ${formatRand(totalOvercharge)} in overcharges.`,
    ``,
  );

  // ── 4. Rejection and Rebuttal ───────────────────────────────────────
  sections.push(
    `MUNICIPALITY'S RESPONSE`,
    ``,
    `The municipality responded on ${input.rejectionDate} with the following:`,
    `"${input.rejectionReason}"`,
    ``,
  );

  if (input.rebuttalParagraph) {
    sections.push(
      `GROUNDS FOR APPEAL`,
      ``,
      input.rebuttalParagraph,
      ``,
    );
  }

  // ── 5. Original Error Table (reproduced) ────────────────────────────
  sections.push(
    `ORIGINAL BILLING ERRORS (REPRODUCED)`,
    ``,
    `| # | Line Item | Service | Billed | Expected | Overcharge |`,
    `|---|-----------|---------|--------|----------|------------|`,
  );

  // Billed and Expected are shown verbatim from the bill (mirrors the s102 table); the
  // Overcharge column is the VAT-inclusive recoverable and, on VAT-able lines,
  // deliberately exceeds Billed − Expected. Net-aggregate rows are flagged with †.
  const lineAmounts = recoverableErrors.map((e) =>
    resolveLetterLineAmounts(e.amount_charged, e.expected_amount, e.overchargeZar ?? 0),
  );
  const hasNetAggregateRow = lineAmounts.some((a) => a.isNetAggregate);

  recoverableErrors.forEach((e, i) => {
    const amt = lineAmounts[i];
    const overchargeCell = amt.isNetAggregate
      ? `${formatRand(amt.overcharge)} †`
      : formatRand(amt.overcharge);
    sections.push(
      `| ${i + 1} | ${e.line_item} | ${e.service_type} | ${formatRand(amt.billed)} | ${formatRand(amt.expected)} | ${overchargeCell} |`,
    );
  });

  sections.push(``);

  sections.push(
    `Note: The Billed and Expected columns are shown exactly as they appear on the municipal account (exclusive of VAT). The Overcharge column is the VAT-inclusive amount recoverable. On VAT-able lines this exceeds Billed minus Expected because the overcharged amount also attracted VAT at 15%.`,
  );
  if (hasNetAggregateRow) {
    sections.push(
      `† For these line items the overcharge is the net amount recoverable across the related main and rebate charges (inclusive of VAT), and cannot be read directly from the single line's Billed and Expected figures.`,
    );
  }
  sections.push(``);

  // ── 6. Legal Citations ──────────────────────────────────────────────
  sections.push(`LEGAL AUTHORITY`, ``);
  sections.push(MKONTWANA_CITATION, ``);
  sections.push(TARICA_CITATION, ``);

  // ── 7. Formal Request ───────────────────────────────────────────────
  sections.push(
    `FORMAL REQUEST`,
    ``,
    `I hereby appeal the decision to reject my billing dispute and request that the Municipal Manager:`,
    ``,
    `1. Review the original dispute and the municipality's response;`,
    `2. Provide a reasoned written decision within 30 calendar days as required by Section 62(4);`,
    `3. Correct the identified billing errors and credit the overcharged amount of ${formatRand(totalOvercharge)};`,
    `4. Provide an itemised account reconciliation demonstrating the basis for each charge.`,
    ``,
    `If no response is received within 30 days, I reserve the right to approach the relevant external remedies, including the Municipal Ombudsman and, where applicable, the relevant regulator.`,
    ``,
    `Yours faithfully,`,
    ``,
    `${input.accountHolder}`,
    `Account: ${input.accountNumber}`,
  );

  return sections.join('\n');
}
