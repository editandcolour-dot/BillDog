/**
 * Legal Citation Constants for Billdog Dispute Letters
 *
 * Every dispute letter must contain specific legal citations.
 * These are NOT Claude-generated — they are SAFLII-verified,
 * and snapshot-tested to prevent drift.
 *
 * Sources:
 * - Municipal Systems Act (No. 32 of 2000), Section 95(f) and Section 102
 * - Mkontwana v Nelson Mandela Metropolitan Municipality 2005 (1) SA 530 (CC); [2004] ZACC 9
 * - Tarica v City of Johannesburg Metropolitan Municipality [2024] ZAGPJHC 1261
 * - City of Tshwane Metropolitan Municipality v Glofurn (Pty) Ltd [2024] ZASCA 101
 * - Municipal Property Rates Act (No. 6 of 2004), Section 50
 */

// ── Section 102 Preamble ────────────────────────────────────────────────────

export const SECTION_102_PREAMBLE = `This dispute is lodged in terms of Section 95(f) of the Local Government: Municipal Systems Act (No. 32 of 2000), which entitles every account holder to reasonable notice of and an opportunity to make representations in respect of any billing errors.

The specific errors identified below constitute grounds for correction under Section 102(1)(a) of the Act, which requires the municipality to revise an account that is incorrect or has been compiled on the basis of incorrect data.`;

// ── Case Law Citations ──────────────────────────────────────────────────────

// Source: https://www.saflii.org/za/cases/ZACC/2004/9.html
// Relevance: Burden of accurate municipal records — municipalities must demonstrate correctness when challenged
// Verified: 2026-05-14
export const MKONTWANA_CITATION = `As held in Mkontwana v Nelson Mandela Metropolitan Municipality 2005 (1) SA 530 (CC); [2004] ZACC 9, the Constitutional Court confirmed that municipalities bear the onus of demonstrating the correctness of their accounts when challenged by a ratepayer.`;

// Source: https://www.saflii.org/za/cases/ZAGPJHC/2024/1261.html
// Relevance: Municipality cannot assert account correctness without verifiable data; valid s102 disputes block payment allocation
// Verified: 2026-05-14
export const TARICA_CITATION = `In Tarica and Another v City of Johannesburg Metropolitan Municipality (2023/044543) [2024] ZAGPJHC 1261 (6 December 2024), the High Court held that a municipality cannot simply assert the correctness of an account without providing verifiable underlying data, including meter readings and applicable tariff schedules. The court further confirmed that valid Section 102 disputes prohibit the municipality from allocating payments to disputed charges.`;

// Source: https://www.saflii.org/za/cases/ZASCA/2024/101.html
// Relevance: Under s 102(2) of Systems Act, municipality cannot disconnect services while bona fide dispute is unresolved
// Verified: 2026-05-14
export const GLOFURN_CITATION = `Per City of Tshwane Metropolitan Municipality v Glofurn (Pty) Ltd (136/2023) [2024] ZASCA 101 (19 June 2024), the Supreme Court of Appeal confirmed that disconnection of services while a bona fide dispute is pending constitutes unlawful administrative action. The municipality must resolve the dispute before taking enforcement action.`;

// ── Undisputed Charges Warning ──────────────────────────────────────────────

export const UNDISPUTED_WARNING = `IMPORTANT: You are required to continue paying the undisputed portion of your account while this dispute is being processed. Failure to pay undisputed charges may result in the municipality refusing to consider your dispute or taking credit control action on the undisputed balance.`;

// ── Section 62 Appeal ───────────────────────────────────────────────────────

export const SECTION_62_PREAMBLE = `This appeal is lodged in terms of Section 62 of the Local Government: Municipal Systems Act (No. 32 of 2000), against the decision of the municipality to reject or refuse to correct the billing errors identified in the original dispute letter.

Section 62(1) provides that a person whose rights are affected by a decision taken by a staff member of a municipality may appeal against that decision by giving written notice of the appeal and reasons to the municipal manager within 21 days of the date of the notification of the decision.`;

// ── Section 50 (Valuation) Notice ───────────────────────────────────────────

export const SECTION_50_NOTICE = `The property valuation reflected on this account appears to be incorrect. Disputes relating to property valuations fall under Section 50 of the Municipal Property Rates Act (No. 6 of 2004), and must be addressed through the Valuation Roll objection process, not through a Section 102 billing dispute.

To object to a property valuation, you will need to:
1. Obtain a valuation report from a SACPVP-registered property valuer
2. Lodge a formal objection with the municipal valuation office during the next objection window
3. Pay municipal rates based on the current (disputed) valuation while the objection is processed`;

// ── Formatting Helpers ──────────────────────────────────────────────────────

/**
 * Formats a Rand amount with 2 decimal places and "R" prefix.
 * Uses dot decimal separator for legal document clarity.
 */
export function formatRand(amount: number): string {
  const abs = Math.abs(amount);
  // Use fixed format with dot separator for unambiguous legal documents
  const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return amount < 0 ? `-R${formatted}` : `R${formatted}`;
}

// ── Line-Item VAT-Basis Reconciliation ───────────────────────────────────────

/**
 * Resolves the Billed / Expected / Overcharge figures shown for a single line in a
 * dispute-letter error table.
 *
 * CRITICAL: Billed and Expected pass through VERBATIM — they are the municipality's
 * own figures as printed on the account (VAT-exclusive). They are NEVER restated or
 * grossed up; doing so would make the letter contradict the bill it disputes.
 *
 * `overchargeZar` is the analysis layer's authoritative VAT-INCLUSIVE recoverable
 * amount (it drives total_recoverable and the success fee — see the validators), and
 * is shown unchanged in the Overcharge column. By design, on VAT-able lines this
 * exceeds (Billed − Expected) because the overcharged amount also attracted 15% VAT —
 * the table footnote explains this; the columns are NOT expected to reconcile.
 *
 * The only classification this helper makes is `isNetAggregate`: some recoverable
 * findings (e.g. UNKNOWN_RATE_APPLIED on a rates segment that nets a sibling rebate,
 * PARSER_MISMATCH) store an `overchargeZar` that aggregates MULTIPLE segments while the
 * row shows only one segment's billed/expected. For those the overcharge does not
 * relate to this single line by any VAT factor, so the caller marks them with † and a
 * separate footnote. On ordinary lines the relationship is the clean VAT factor
 * (1.00 for zero-rated, 1.15 for VAT-able) and `isNetAggregate` is false.
 */
export interface LetterLineAmounts {
  /** Literal billed amount exactly as printed on the bill — never modified */
  billed: number;
  /** Literal expected (correct) amount — never modified */
  expected: number;
  /** Authoritative VAT-inclusive recoverable (overchargeZar) — the Overcharge column */
  overcharge: number;
  /**
   * true when overchargeZar is a net aggregate across multiple segments and therefore
   * cannot be read from this single line's (Billed − Expected) by any VAT factor.
   * Such rows are footnoted with †. false for ordinary VAT-able / zero-rated lines.
   */
  isNetAggregate: boolean;
}

// Recognised per-line VAT relationships on a SA municipal bill: 0% (rates/interest)
// and 15% (water/refuse/sewerage/electricity/sundry). Used ONLY to classify whether a
// row's overcharge relates to its own line, never to alter the displayed figures.
const VAT_FACTORS = [1, 1.15];
const FACTOR_TOLERANCE = 0.02;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function resolveLetterLineAmounts(
  amountCharged: number,
  expectedAmount: number,
  overchargeZar: number,
): LetterLineAmounts {
  const overcharge = round2(overchargeZar ?? 0);
  const rawDelta = round2((amountCharged ?? 0) - (expectedAmount ?? 0));

  // Classify only — figures are passed through untouched.
  let isNetAggregate = true;
  if (rawDelta > 0) {
    const factor = overcharge / rawDelta;
    if (VAT_FACTORS.some((f) => Math.abs(factor - f) <= FACTOR_TOLERANCE)) {
      isNetAggregate = false;
    }
  }

  return {
    billed: amountCharged ?? 0,
    expected: expectedAmount ?? 0,
    overcharge,
    isNetAggregate,
  };
}
