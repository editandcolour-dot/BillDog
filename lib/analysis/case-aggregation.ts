/**
 * Shared case-level aggregation for bill analysis results.
 *
 * Extracted from /api/analyse-multi so the autofetch analysis worker and the
 * interactive multi-bill route aggregate a case IDENTICALLY (totals, error
 * flattening, period span, final status). Pure functions only — no DB access.
 */

/** Round to cents at the persistence boundary. IEEE-754 residue (e.g.
 * 612.590000000001) must not reach the data layer or downstream consumers
 * (letters, exports, audit). */
export const round2 = (n: number) => Math.round(n * 100) / 100;

export const roundErrors = <T extends { overchargeZar?: number }>(errors: T[]): T[] =>
  errors.map(e => ({
    ...e,
    overchargeZar: e.overchargeZar != null ? round2(e.overchargeZar) : e.overchargeZar,
  }));

// DD/MM/YYYY helpers. Alphabetic sort on DD/MM/YYYY is broken
// (e.g. "03/08" < "30/03" lexicographically), so we must parse to compare.
const parseDDMM = (s: string): Date | null => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
};
const fmtDDMM = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
// Local-component ISO format avoids the toISOString() TZ shift that would
// turn 30 March SAST into 29 March UTC.
const fmtISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface AggregatableBill {
  bill_period: string | null;
  errors: Array<Record<string, unknown> & { overchargeZar?: number }>;
  total_billed: number;
  total_recoverable: number;
}

export interface CaseAggregate {
  status: 'letter_ready' | 'closed';
  errors_found: Array<Record<string, unknown>>;
  recoverable: number;
  total_billed: number;
  total_recoverable_all: number;
  bill_period: string | null;      // chronological span, "DD/MM/YYYY to DD/MM/YYYY"
  date_range_start: string | null; // ISO date
  date_range_end: string | null;   // ISO date
}

/**
 * Aggregate the analysed bills of one case into the cases-row update payload.
 * Every bill_period is expected as "DD/MM/YYYY to DD/MM/YYYY" (analyse-bill
 * output); non-matching strings fall back to the first period verbatim.
 */
export function aggregateCaseFromBills(bills: AggregatableBill[]): CaseAggregate {
  const totalRecoverable = bills.reduce((sum, b) => sum + (b.total_recoverable || 0), 0);
  const totalBilled = bills.reduce((sum, b) => sum + (b.total_billed || 0), 0);

  const periods = bills.map(b => b.bill_period).filter(Boolean) as string[];
  const ranges = periods.flatMap(p => {
    const m = p.match(/^(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})$/);
    const start = m ? parseDDMM(m[1]) : null;
    const end = m ? parseDDMM(m[2]) : null;
    return start && end ? [{ start, end }] : [];
  });
  const minStart = ranges.length > 0
    ? new Date(Math.min(...ranges.map(r => r.start.getTime())))
    : null;
  const maxEnd = ranges.length > 0
    ? new Date(Math.max(...ranges.map(r => r.end.getTime())))
    : null;
  const billPeriodSpan = minStart && maxEnd
    ? `${fmtDDMM(minStart)} to ${fmtDDMM(maxEnd)}`
    : (periods[0] || null);

  // The DB must store the real per-bill errors, each annotated with the bill
  // period it came from — the UI reads errors_found for display.
  const allPerBillErrors = bills.flatMap(b =>
    (b.errors || []).map(e => ({ ...e, bill_period: b.bill_period })),
  );

  return {
    status: allPerBillErrors.length > 0 ? 'letter_ready' : 'closed',
    errors_found: roundErrors(allPerBillErrors),
    recoverable: round2(totalRecoverable),
    total_billed: round2(totalBilled),
    total_recoverable_all: round2(totalRecoverable),
    bill_period: billPeriodSpan,
    date_range_start: minStart ? fmtISO(minStart) : null,
    date_range_end: maxEnd ? fmtISO(maxEnd) : null,
  };
}
