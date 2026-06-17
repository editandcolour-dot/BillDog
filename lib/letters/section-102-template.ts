/**
 * Section 102 Dispute Letter Template — Deterministic Builder
 *
 * Produces the body of a Section 102(1)(a) Municipal Systems Act billing dispute letter.
 * All line items, amounts, dates, and legal citations are injected from structured data.
 *
 * Claude writes ONLY the summary paragraph (human-readable context).
 * The rest is deterministic and snapshot-testable.
 *
 * Design decision: Croftdene/Van Der Merwe/Ackerman specificity is non-negotiable.
 * A hallucinated amount destroys legal defensibility.
 */

import type { BillingError } from '@/types/analysis';
import {
  SECTION_102_PREAMBLE,
  MKONTWANA_CITATION,
  TARICA_CITATION,
  GLOFURN_CITATION,
  UNDISPUTED_WARNING,
  formatRand,
  resolveLetterLineAmounts,
} from './citations';

// ── Types ───────────────────────────────────────────────────────────────────

export interface Section102LetterInput {
  /** Account holder full name */
  accountHolder: string;
  /** SA ID number (decrypted) */
  idNumber: string;
  /** Municipal account number */
  accountNumber: string;
  /** Property address */
  propertyAddress: string;
  /** Municipality name */
  municipalityName: string;
  /** Bill period (e.g. "March 2025") */
  billPeriod: string;
  /** Bill date (e.g. "15/03/2025") */
  billingDate: string;
  /** Total billed on the bill */
  totalBilled: number;
  /** Claude-generated summary paragraph (human context only) */
  summaryParagraph: string;
  /** Billing errors from Ground Truth override */
  errors: BillingError[];
  /** Municipality-specific bylaw citation (from dispute_procedure JSONB) */
  bylawCitation?: string;
  /** Municipal dispute lodgement address */
  lodgementAddress?: string;
}

// ── Template Builder ────────────────────────────────────────────────────────

/**
 * Builds a deterministic Section 102 dispute letter body.
 *
 * Structure:
 * 1. Addressee and subject line
 * 2. Legal preamble (Section 102 + Section 95(f))
 * 3. Summary paragraph (Claude-generated, context only)
 * 4. Per-line-item error table (deterministic)
 * 5. Total overcharge calculation
 * 6. Legal citations (Mkontwana, Tarica, Glofurn)
 * 7. Municipality-specific bylaw citation
 * 8. Undisputed charges warning
 * 9. Formal demand
 */
export function buildSection102Letter(input: Section102LetterInput): string {
  const recoverableErrors = input.errors.filter((e) => e.recoverable);
  const totalOvercharge = recoverableErrors.reduce(
    (sum, e) => sum + (e.overchargeZar ?? 0),
    0,
  );

  const sections: string[] = [];

  // ── 1. Subject Line ─────────────────────────────────────────────────
  sections.push(
    `FORMAL BILLING DISPUTE — SECTION 102(1)(a) MUNICIPAL SYSTEMS ACT`,
    ``,
    `Date: ${new Date().toLocaleDateString('en-ZA')}`,
    ``,
    `To: ${input.lodgementAddress || `The Revenue Manager, ${input.municipalityName}`}`,
    ``,
    `Re: Account ${input.accountNumber}`,
    `Property: ${input.propertyAddress}`,
    `Bill Period: ${input.billPeriod}`,
    `Bill Date: ${input.billingDate}`,
    `Total Billed: ${formatRand(input.totalBilled)}`,
    ``,
  );

  // ── 2. Legal Preamble ───────────────────────────────────────────────
  sections.push(SECTION_102_PREAMBLE, ``);

  // ── 3. Summary (Claude-generated context paragraph) ─────────────────
  if (input.summaryParagraph) {
    sections.push(input.summaryParagraph, ``);
  }

  // ── 4. Error Table ──────────────────────────────────────────────────
  sections.push(`BILLING ERRORS IDENTIFIED`, ``);
  sections.push(
    `| # | Line Item | Service | Billed | Expected | Overcharge | Reading Type | Prescription |`,
    `|---|-----------|---------|--------|----------|------------|-------------|-------------|`,
  );

  // Resolve every line onto a single VAT-inclusive basis so each row reconciles
  // (billed − expected === overcharge). Rows whose overcharge is a net aggregate
  // across related segments cannot be grossed up cleanly and are flagged + footnoted.
  // Billed and Expected are shown verbatim from the bill. The Overcharge column is the
  // VAT-inclusive recoverable (overchargeZar) and, on VAT-able lines, deliberately
  // exceeds Billed − Expected (see footnote). Net-aggregate rows are flagged with †.
  const lineAmounts = recoverableErrors.map((e) =>
    resolveLetterLineAmounts(e.amount_charged, e.expected_amount, e.overchargeZar ?? 0),
  );
  const hasNetAggregateRow = lineAmounts.some((a) => a.isNetAggregate);

  recoverableErrors.forEach((e, i) => {
    const amt = lineAmounts[i];
    const readingType = e.reading_type ?? 'N/A';
    const prescription =
      e.within_prescription === true
        ? 'Active'
        : e.within_prescription === false
          ? 'Prescribed'
          : e.within_prescription === null
            ? 'Review Required'
            : 'N/A';

    const overchargeCell = amt.isNetAggregate
      ? `${formatRand(amt.overcharge)} †`
      : formatRand(amt.overcharge);

    sections.push(
      `| ${i + 1} | ${e.line_item} | ${e.service_type} | ${formatRand(amt.billed)} | ${formatRand(amt.expected)} | ${overchargeCell} | ${readingType} | ${prescription} |`,
    );
  });

  sections.push(``);

  // Explain the column relationship — Billed/Expected are the bill's own (VAT-exclusive)
  // figures; Overcharge is the VAT-inclusive recoverable and exceeds Billed − Expected
  // on VAT-able lines because the overcharged amount also attracted VAT.
  sections.push(
    `Note: The Billed and Expected columns are shown exactly as they appear on the municipal account (exclusive of VAT). The Overcharge column is the VAT-inclusive amount recoverable. On VAT-able lines this exceeds Billed minus Expected because the overcharged amount also attracted VAT at 15%.`,
  );
  if (hasNetAggregateRow) {
    sections.push(
      `† For these line items the overcharge is the net amount recoverable across the related main and rebate charges (inclusive of VAT), and cannot be read directly from the single line's Billed and Expected figures.`,
    );
  }
  sections.push(``);

  // Non-recoverable findings (informational)
  const nonRecoverable = input.errors.filter((e) => !e.recoverable);
  if (nonRecoverable.length > 0) {
    sections.push(`ADDITIONAL OBSERVATIONS (Non-recoverable / Informational)`, ``);
    nonRecoverable.forEach((e, i) => {
      sections.push(`${i + 1}. ${e.issue}`);
    });
    sections.push(``);
  }

  // ── 5. Per-error Legal Basis ────────────────────────────────────────
  sections.push(`LEGAL BASIS PER ERROR`, ``);
  recoverableErrors.forEach((e, i) => {
    sections.push(`${i + 1}. ${e.line_item}: ${e.legal_basis}`);
    if (e.issue) {
      sections.push(`   Detail: ${e.issue}`);
    }
    // State the binding per-line dispute figure on the same VAT-inclusive basis as
    // the table, so the narrative and the table never quote conflicting amounts.
    sections.push(`   Overcharge claimed (VAT-inclusive): ${formatRand(lineAmounts[i].overcharge)}`);
    sections.push(``);
  });

  // ── 6. Total Overcharge ─────────────────────────────────────────────
  sections.push(
    `TOTAL OVERCHARGE: ${formatRand(totalOvercharge)}`,
    ``,
  );

  // ── 7. Legal Citations ──────────────────────────────────────────────
  sections.push(`LEGAL AUTHORITY`, ``);
  sections.push(MKONTWANA_CITATION, ``);
  sections.push(TARICA_CITATION, ``);
  sections.push(GLOFURN_CITATION, ``);

  // ── 8. Bylaw Citation (municipality-specific) ──────────────────────
  if (input.bylawCitation) {
    sections.push(
      `This dispute is further supported by ${input.bylawCitation}.`,
      ``,
    );
  }

  // ── 9. Undisputed Warning ───────────────────────────────────────────
  sections.push(UNDISPUTED_WARNING, ``);

  // ── 10. Formal Demand ───────────────────────────────────────────────
  sections.push(
    `FORMAL DEMAND`,
    ``,
    `I hereby demand that the ${input.municipalityName}:`,
    ``,
    `1. Investigate and correct the billing errors listed above within 30 calendar days of receipt of this letter;`,
    `2. Issue a corrected account reflecting the correct charges;`,
    `3. Credit the overcharged amount of ${formatRand(totalOvercharge)} to my municipal account;`,
    `4. Provide written confirmation of the corrections made.`,
    ``,
    `Failure to respond within 30 calendar days will be treated as a deemed refusal, entitling me to lodge an appeal under Section 62 of the Municipal Systems Act.`,
    ``,
    `Yours faithfully,`,
    ``,
    `${input.accountHolder}`,
    `Account: ${input.accountNumber}`,
  );

  return sections.join('\n');
}
