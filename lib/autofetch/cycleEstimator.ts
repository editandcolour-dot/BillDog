/**
 * Cycle estimator for municipal autofetch.
 *
 * Goal: learn each account's typical bill-issue day from observed PDFs so the
 * daily dispatcher only spins up Playwright the day *after* a bill is expected
 * — instead of polling every account every day.
 *
 * Three pieces:
 *   1. extractIssueDate(text)        — pull a date out of bill text via regex
 *   2. estimateExpectedDay(dates)    — median + IQR → { day, confidence }
 *   3. computeNextCheckAt(...)       — when should the dispatcher poll next,
 *                                       skipping weekends + margin for loose cycles
 *
 * Pure functions only. No DB access. Easy to test.
 *
 * TIMEZONE BASIS: every date computation here is UTC (`Date.UTC`, `getUTC*`),
 * and `next_check_at` is stored/compared in UTC. South Africa is UTC+2 with no
 * DST, so a "day" in this module flips at 02:00 SAST, not at SA midnight.
 * Bounded consequences: an issue date observed between 00:00–01:59 SAST lands
 * on the PREVIOUS UTC day (expected_issue_day can drift by at most one), and
 * the weekend skip evaluates the UTC weekday. Both self-heal via the daily
 * hunt (+1-day re-checks until the bill is found). A full SAST re-basing was
 * considered and deliberately deferred — it would re-interpret every stored
 * next_check_at/expected_issue_day and touch the workers' comparisons; see the
 * Phase-5 item-7 proposal in the rebuild plan before attempting it.
 */

export type CycleConfidence = 'tight' | 'loose' | 'unknown';

export interface CycleEstimate {
  /** Day-of-month (1–31). Null if we have no usable sample. */
  day: number | null;
  confidence: CycleConfidence;
  sampleSize: number;
}

/**
 * Extract a bill issue date from raw PDF text.
 *
 * Tries a sequence of common South African municipal-bill labels:
 *   "Statement Date", "Account Date", "Date of Account",
 *   "Invoice Date", "Date Issued", "Tax Invoice Date".
 *
 * Accepts dates in any of:
 *   2026/05/14, 2026-05-14, 14/05/2026, 14-05-2026,
 *   "14 May 2026", "14th May 2026".
 *
 * Returns null if nothing matches. Caller should fall back to fetch day.
 */
export function extractIssueDate(billText: string): Date | null {
  if (!billText) return null;

  const labels = [
    'statement date',
    'account date',
    'date of account',
    'invoice date',
    'date issued',
    'tax invoice date',
    'bill date',
  ];

  // Build one big label regex (case-insensitive). Capture group: the text that
  // follows the label up to a line break or 40 chars (whichever first).
  const labelPattern = new RegExp(
    `(?:${labels.join('|')})\\s*[:\\-]?\\s*([^\\r\\n]{1,40})`,
    'i'
  );

  const match = billText.match(labelPattern);
  if (!match) return null;

  return parseDateFragment(match[1]);
}

/** Parse a date out of a short text fragment. Returns null if no date found. */
function parseDateFragment(fragment: string): Date | null {
  // ISO-ish: 2026/05/14 or 2026-05-14
  const iso = fragment.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // DMY: 14/05/2026 or 14-05-2026
  const dmy = fragment.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (dmy) {
    const d = new Date(Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // "14 May 2026" / "14th May 2026"
  const named = fragment.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{4})\b/i
  );
  if (named) {
    const monthIdx = monthFromName(named[2]);
    if (monthIdx !== null) {
      const d = new Date(Date.UTC(+named[3], monthIdx, +named[1]));
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

function monthFromName(name: string): number | null {
  const map: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  };
  return map[name.toLowerCase()] ?? null;
}

/**
 * Compute the median day-of-month across observed issue dates plus a
 * confidence rating based on inter-quartile range.
 *
 * - tight   → IQR ≤ 2 days, very predictable cycle (most CoCT accounts)
 * - loose   → IQR > 2 days, dispatcher will use a safety margin
 * - unknown → sample too small (< 2)
 */
export function estimateExpectedDay(dates: Date[]): CycleEstimate {
  const days = dates
    .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
    .map((d) => d.getUTCDate())
    .sort((a, b) => a - b);

  if (days.length < 2) {
    return { day: days[0] ?? null, confidence: 'unknown', sampleSize: days.length };
  }

  const median = quantile(days, 0.5);
  const iqr = quantile(days, 0.75) - quantile(days, 0.25);

  return {
    day: Math.round(median),
    confidence: iqr <= 2 ? 'tight' : 'loose',
    sampleSize: days.length,
  };
}

function quantile(sortedAsc: number[], q: number): number {
  const pos = (sortedAsc.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo);
}

/**
 * Fold a new observation into an existing estimate.
 *
 * We don't store all historical observations on the credential row — just
 * the current median + sample size. To roll forward we apply a weighted
 * update so a single outlier can't yank the estimate around.
 *
 * If `sampleSize >= 12` (a year's worth) we lock the median in place and only
 * bump the sample counter — at that point the cycle is well-established.
 */
export function rollEstimate(
  current: CycleEstimate,
  newDate: Date
): CycleEstimate {
  if (!(newDate instanceof Date) || isNaN(newDate.getTime())) return current;
  const newDay = newDate.getUTCDate();

  if (current.day === null || current.sampleSize === 0) {
    return { day: newDay, confidence: 'unknown', sampleSize: 1 };
  }

  if (current.sampleSize >= 12) {
    return { ...current, sampleSize: current.sampleSize + 1 };
  }

  // Weighted average: existing median has weight = sampleSize, new obs = 1.
  const weighted =
    (current.day * current.sampleSize + newDay) / (current.sampleSize + 1);
  const nextSize = current.sampleSize + 1;
  const drift = Math.abs(weighted - current.day);

  return {
    day: Math.round(weighted),
    confidence: nextSize >= 3 && drift <= 1 ? 'tight' : 'loose',
    sampleSize: nextSize,
  };
}

/**
 * Decide the next time the dispatcher should poll this credential.
 *
 * Rules:
 *  - Poll the day AFTER the expected issue day (gives the portal a beat to
 *    publish the PDF).
 *  - For 'loose' cycles, additionally subtract 2 days as a safety margin.
 *  - Skip weekends (SA municipalities don't bill on Sat/Sun in practice).
 *  - If we've already overshot this month's expected day (i.e. we found the
 *    bill on time), schedule for next month.
 *  - Cap the back-off when chasing a late bill: if the caller passes
 *    `chasingSince`, we'll never push next_check_at more than 14 days past the
 *    expected day — the dispatcher should keep poking daily within that window
 *    until it either finds the bill or the failure-rate alerter fires.
 */
export function computeNextCheckAt(opts: {
  expectedDay: number;
  confidence: CycleConfidence;
  fromDate: Date;
  /**
   * Did we just successfully download the bill for `fromDate`'s month?
   * - true  → schedule next check ~30 days out (next billing cycle).
   * - false → schedule for tomorrow at most (we're still hunting).
   */
  justFoundBill: boolean;
  /** When the current month's hunt started. Used to cap retries at +14. */
  chasingSince?: Date | null;
}): Date {
  const { expectedDay, confidence, fromDate, justFoundBill, chasingSince } = opts;

  if (justFoundBill) {
    // Schedule for the same day next month, plus 1 day buffer, plus safety
    // margin for loose cycles, weekend-skipped. Clamp to the TARGET month's real
    // length — a fixed 28 would probe late-month billers (29th–31st) days before
    // their bill can exist, land on the stale prior statement every month, and
    // stall the credential permanently.
    const next = new Date(Date.UTC(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth() + 1,
      Math.min(expectedDay + 1, lastDayOfMonth(fromDate.getUTCFullYear(), fromDate.getUTCMonth() + 1))
    ));
    if (confidence === 'loose') {
      next.setUTCDate(next.getUTCDate() - 2);
    }
    return skipWeekends(next);
  }

  // Hunting mode: try again tomorrow, but respect the +14 cap from the start
  // of the chase so we don't poll forever for a missing bill.
  const tomorrow = new Date(Date.UTC(
    fromDate.getUTCFullYear(),
    fromDate.getUTCMonth(),
    fromDate.getUTCDate() + 1
  ));

  if (chasingSince) {
    const capDay = new Date(chasingSince);
    capDay.setUTCDate(capDay.getUTCDate() + 14);
    if (tomorrow > capDay) {
      // Past the +14 cap — schedule for next month's expected day so the
      // dispatcher stops chasing this one. Alerting is handled separately.
      // Same month-length-aware clamp as the justFoundBill branch.
      const next = new Date(Date.UTC(
        fromDate.getUTCFullYear(),
        fromDate.getUTCMonth() + 1,
        Math.min(expectedDay + 1, lastDayOfMonth(fromDate.getUTCFullYear(), fromDate.getUTCMonth() + 1))
      ));
      return skipWeekends(next);
    }
  }

  return skipWeekends(tomorrow);
}

/**
 * Last day-of-month for (year, monthIndex), UTC. monthIndex may overflow past
 * 11 — Date.UTC normalises it into the following year, so callers can pass
 * `getUTCMonth() + 1` directly when targeting "next month".
 */
export function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Roll a date forward to the next weekday if it lands on Sat/Sun. */
function skipWeekends(d: Date): Date {
  const out = new Date(d);
  const dow = out.getUTCDay(); // 0 = Sun, 6 = Sat
  if (dow === 6) out.setUTCDate(out.getUTCDate() + 2);
  else if (dow === 0) out.setUTCDate(out.getUTCDate() + 1);
  return out;
}
