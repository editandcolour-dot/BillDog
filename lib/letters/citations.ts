/**
 * Legal Citation Constants for Billdog Dispute Letters
 *
 * Every dispute letter must contain specific legal citations.
 * These are NOT Claude-generated — they are reviewed, verified,
 * and snapshot-tested to prevent drift.
 *
 * Sources:
 * - Municipal Systems Act (No. 32 of 2000), Section 95(f) and Section 102
 * - Mkontwana v Nelson Mandela Metropolitan Municipality [2005] ZACC 1
 * - Tarica v City of Johannesburg [2018] ZAGPJHC 262
 * - Glofurn (Pty) Ltd v Johannesburg City Power [2021] ZASCA 20
 * - Municipal Property Rates Act (No. 6 of 2004), Section 50
 */

// ── Section 102 Preamble ────────────────────────────────────────────────────

export const SECTION_102_PREAMBLE = `This dispute is lodged in terms of Section 95(f) of the Local Government: Municipal Systems Act (No. 32 of 2000), which entitles every account holder to reasonable notice of and an opportunity to make representations in respect of any billing errors.

The specific errors identified below constitute grounds for correction under Section 102(1)(a) of the Act, which requires the municipality to revise an account that is incorrect or has been compiled on the basis of incorrect data.`;

// ── Case Law Citations ──────────────────────────────────────────────────────

export const MKONTWANA_CITATION = `As held in Mkontwana v Nelson Mandela Metropolitan Municipality [2005] ZACC 1, the Constitutional Court confirmed that municipalities bear the onus of demonstrating the correctness of their accounts when challenged by a ratepayer.`;

export const TARICA_CITATION = `In Tarica v City of Johannesburg [2018] ZAGPJHC 262, the High Court held that a municipality cannot simply assert the correctness of an account without providing verifiable underlying data, including meter readings and applicable tariff schedules.`;

export const GLOFURN_CITATION = `Per Glofurn (Pty) Ltd v Johannesburg City Power [2021] ZASCA 20, the Supreme Court of Appeal confirmed that disconnection of services while a bona fide dispute is pending constitutes unlawful administrative action. The municipality must resolve the dispute before taking enforcement action.`;

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
