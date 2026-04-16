/**
 * CoCT Annual Property Rates — Ground Truth
 *
 * Source: Extracted from 37 real City of Cape Town municipal bills.
 * Each financial year runs 1 July → 30 June.
 * These are the RESIDENTIAL rates-in-the-rand applied to the
 * rateable portion of property valuation.
 *
 * DO NOT MODIFY without confirming against a gazetted CoCT tariff schedule.
 */

export interface RateEntry {
  /** Financial year label, e.g. "FY2024/25" */
  fy: string;
  /** Start of the financial year (inclusive) */
  startDate: string;
  /** End of the financial year (inclusive) */
  endDate: string;
  /** Annual rate (rates-in-the-rand) */
  annualRate: number;
}

export const COCT_RATES: RateEntry[] = [
  {
    fy: 'FY2022/23',
    startDate: '2022-07-01',
    endDate: '2023-06-30',
    annualRate: 0.0063440,
  },
  {
    fy: 'FY2023/24',
    startDate: '2023-07-01',
    endDate: '2024-06-30',
    annualRate: 0.0062730,
  },
  {
    fy: 'FY2024/25',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    annualRate: 0.0066310,
  },
  {
    fy: 'FY2025/26',
    startDate: '2025-07-01',
    endDate: '2026-06-30',
    annualRate: 0.0071590,
  },
];

/**
 * Returns the expected annual rate for a given date string (DD/MM/YYYY format from CoCT bills).
 * Returns null if no rate is found for the period.
 */
export function getExpectedRate(fromDateDDMMYYYY: string): number | null {
  // Convert DD/MM/YYYY to a comparable date
  const parts = fromDateDDMMYYYY.split('/');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;
  const isoDate = `${year}-${month}-${day}`;
  const dateMs = new Date(isoDate).getTime();

  if (isNaN(dateMs)) return null;

  for (const entry of COCT_RATES) {
    const start = new Date(entry.startDate).getTime();
    const end = new Date(entry.endDate).getTime();
    if (dateMs >= start && dateMs <= end) {
      return entry.annualRate;
    }
  }

  return null;
}
