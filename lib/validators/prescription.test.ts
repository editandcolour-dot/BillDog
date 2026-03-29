/**
 * Prescription validation unit tests — Phase 1
 *
 * Tests cover:
 * - All date formats (YYYY-MM, Month YYYY, MM/YYYY, quarter, ranges)
 * - All service types (3-year and 30-year prescription periods)
 * - Boundary conditions (exactly at limit, one month before/after)
 * - Error cases (unparseable dates, unknown service types)
 * - Aggregate warnings (multi-item bills)
 */

import { describe, expect, it } from 'vitest';

import {
  checkBillPrescription,
  checkPrescription,
  generatePrescriptionWarnings,
  monthsBetween,
  parseBillPeriod,
} from './prescription';

import type { BillError } from '@/types';

// ---------------------------------------------------------------------------
// Helper: fixed reference date for deterministic tests
// ---------------------------------------------------------------------------

/** Reference date: 2026-03-01 */
const REF_DATE = new Date(2026, 2, 1);

/** Creates a YYYY-MM string N months before the reference date. */
function periodMonthsAgo(months: number): string {
  const d = new Date(REF_DATE);
  d.setMonth(d.getMonth() - months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ---------------------------------------------------------------------------
// parseBillPeriod
// ---------------------------------------------------------------------------

describe('parseBillPeriod', () => {
  it('parses "2023-03" (YYYY-MM) format', () => {
    const result = parseBillPeriod('2023-03');
    expect(result).toEqual(new Date(2023, 2, 1));
  });

  it('parses "2023/03" (YYYY/MM) format', () => {
    const result = parseBillPeriod('2023/03');
    expect(result).toEqual(new Date(2023, 2, 1));
  });

  it('parses "March 2023" (full month name) format', () => {
    const result = parseBillPeriod('March 2023');
    expect(result).toEqual(new Date(2023, 2, 1));
  });

  it('parses "Mar 2023" (abbreviated month) format', () => {
    const result = parseBillPeriod('Mar 2023');
    expect(result).toEqual(new Date(2023, 2, 1));
  });

  it('parses "03/2023" (MM/YYYY) format', () => {
    const result = parseBillPeriod('03/2023');
    expect(result).toEqual(new Date(2023, 2, 1));
  });

  it('parses "Jan-Mar 2023" range — uses earliest month', () => {
    const result = parseBillPeriod('Jan-Mar 2023');
    expect(result).toEqual(new Date(2023, 0, 1));
  });

  it('parses "January - March 2023" range with spaces', () => {
    const result = parseBillPeriod('January - March 2023');
    expect(result).toEqual(new Date(2023, 0, 1));
  });

  it('parses "Q1 2023" (quarter) format', () => {
    const result = parseBillPeriod('Q1 2023');
    expect(result).toEqual(new Date(2023, 0, 1));
  });

  it('parses "Q4 2023" (quarter) format', () => {
    const result = parseBillPeriod('Q4 2023');
    expect(result).toEqual(new Date(2023, 9, 1));
  });

  it('parses "2023/01 - 2023/03" range — uses earliest', () => {
    const result = parseBillPeriod('2023/01 - 2023/03');
    expect(result).toEqual(new Date(2023, 0, 1));
  });

  it('returns null for "Statement Date: 15/03/2023" (not a period)', () => {
    expect(parseBillPeriod('Statement Date: 15/03/2023')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseBillPeriod('')).toBeNull();
  });

  it('returns null for random text', () => {
    expect(parseBillPeriod('not a date at all')).toBeNull();
  });

  it('trims whitespace before parsing', () => {
    const result = parseBillPeriod('  2023-03  ');
    expect(result).toEqual(new Date(2023, 2, 1));
  });
});

// ---------------------------------------------------------------------------
// monthsBetween
// ---------------------------------------------------------------------------

describe('monthsBetween', () => {
  it('returns 12 for one year difference', () => {
    const from = new Date(2023, 0, 1);
    const to = new Date(2024, 0, 1);
    expect(monthsBetween(from, to)).toBe(12);
  });

  it('returns 36 for three year difference', () => {
    const from = new Date(2023, 0, 1);
    const to = new Date(2026, 0, 1);
    expect(monthsBetween(from, to)).toBe(36);
  });

  it('returns 0 for same month', () => {
    const d = new Date(2024, 5, 1);
    expect(monthsBetween(d, d)).toBe(0);
  });

  it('returns negative for future date as from', () => {
    const from = new Date(2027, 0, 1);
    const to = new Date(2026, 0, 1);
    expect(monthsBetween(from, to)).toBe(-12);
  });
});

// ---------------------------------------------------------------------------
// checkPrescription — 3-year services (electricity, water, gas)
// ---------------------------------------------------------------------------

describe('checkPrescription — 3-year services', () => {
  it('returns normal for 24-month-old electricity charge', () => {
    const period = periodMonthsAgo(24);
    const result = checkPrescription(period, 'electricity', REF_DATE);
    expect(result.status).toBe('normal');
    expect(result.monthsRemaining).toBe(12);
  });

  it('returns normal for 28-month-old water charge', () => {
    const period = periodMonthsAgo(28);
    const result = checkPrescription(period, 'water', REF_DATE);
    expect(result.status).toBe('normal');
    expect(result.monthsRemaining).toBe(8);
  });

  it('returns approaching for 31-month-old electricity charge', () => {
    const period = periodMonthsAgo(31);
    const result = checkPrescription(period, 'electricity', REF_DATE);
    expect(result.status).toBe('approaching');
    expect(result.monthsRemaining).toBe(5);
    expect(result.message).toContain('approaching');
  });

  it('returns approaching for 34-month-old water charge', () => {
    const period = periodMonthsAgo(34);
    const result = checkPrescription(period, 'water', REF_DATE);
    expect(result.status).toBe('approaching');
    expect(result.monthsRemaining).toBe(2);
  });

  it('returns approaching for 35-month-old interest charge', () => {
    const period = periodMonthsAgo(35);
    const result = checkPrescription(period, 'interest', REF_DATE);
    expect(result.status).toBe('approaching');
    expect(result.monthsRemaining).toBe(1);
  });

  // BOUNDARY: exactly 36 months → prescribed (exclusive boundary)
  it('returns prescribed at exactly 36 months elapsed', () => {
    const period = periodMonthsAgo(36);
    const result = checkPrescription(period, 'electricity', REF_DATE);
    expect(result.status).toBe('prescribed');
    expect(result.monthsRemaining).toBe(0);
  });

  it('returns prescribed for 48-month-old electricity charge', () => {
    const period = periodMonthsAgo(48);
    const result = checkPrescription(period, 'electricity', REF_DATE);
    expect(result.status).toBe('prescribed');
    expect(result.monthsRemaining).toBe(0);
    expect(result.message).toContain('prescribed');
    expect(result.message).toContain('3');
  });

  it('returns unknown for future bill period (parsing error)', () => {
    const result = checkPrescription('2026-05', 'water', REF_DATE);
    expect(result.status).toBe('unknown');
    expect(result.monthsRemaining).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkPrescription — 30-year services (rates, sewerage, refuse)
// ---------------------------------------------------------------------------

describe('checkPrescription — 30-year services', () => {
  it('returns normal for 29-year-old rates charge', () => {
    const period = periodMonthsAgo(348);
    const result = checkPrescription(period, 'rates', REF_DATE);
    expect(result.status).toBe('normal');
    expect(result.monthsRemaining).toBe(12);
  });

  it('returns approaching for 355-month-old sewerage charge', () => {
    const period = periodMonthsAgo(355);
    const result = checkPrescription(period, 'sewerage', REF_DATE);
    expect(result.status).toBe('approaching');
    expect(result.monthsRemaining).toBe(5);
  });

  it('returns prescribed for 31-year-old refuse charge', () => {
    const period = periodMonthsAgo(372);
    const result = checkPrescription(period, 'refuse', REF_DATE);
    expect(result.status).toBe('prescribed');
    expect(result.monthsRemaining).toBe(0);
  });

  // A 36-month-old rates charge is NORMAL (30-year limit applies)
  it('returns normal for 36-month-old rates charge (30-year limit)', () => {
    const period = periodMonthsAgo(36);
    const result = checkPrescription(period, 'rates', REF_DATE);
    expect(result.status).toBe('normal');
    expect(result.monthsRemaining).toBe(324);
  });
});

// ---------------------------------------------------------------------------
// checkPrescription — edge cases
// ---------------------------------------------------------------------------

describe('checkPrescription — edge cases', () => {
  it('returns unknown for service_type "unknown"', () => {
    const result = checkPrescription('2023-03', 'unknown', REF_DATE);
    expect(result.status).toBe('unknown');
    expect(result.monthsRemaining).toBeNull();
    expect(result.message).toContain('manual review');
  });

  it('returns unknown for unparseable bill period', () => {
    const result = checkPrescription(
      'Statement Date: 15/03/2023',
      'electricity',
      REF_DATE,
    );
    expect(result.status).toBe('unknown');
    expect(result.monthsRemaining).toBeNull();
    expect(result.message).toContain('could not be parsed');
  });

  it('handles "March 2023" format correctly', () => {
    const result = checkPrescription('March 2023', 'electricity', REF_DATE);
    // March 2023 to March 2026 = 36 months → prescribed
    expect(result.status).toBe('prescribed');
  });

  it('handles "Q1 2023" format correctly', () => {
    const result = checkPrescription('Q1 2023', 'water', REF_DATE);
    // Q1 2023 = Jan 2023 → 38 months elapsed → prescribed
    expect(result.status).toBe('prescribed');
  });

  it('handles "Jan-Mar 2023" range using earliest month', () => {
    const result = checkPrescription('Jan-Mar 2023', 'electricity', REF_DATE);
    // Jan 2023 → 38 months → prescribed
    expect(result.status).toBe('prescribed');
  });
});

// ---------------------------------------------------------------------------
// checkBillPrescription
// ---------------------------------------------------------------------------

describe('checkBillPrescription', () => {
  it('uses 3-year rule (electricity) for bill-level check', () => {
    const result = checkBillPrescription(
      periodMonthsAgo(24),
      REF_DATE,
    );
    expect(result.status).toBe('normal');
    expect(result.monthsRemaining).toBe(12);
  });

  it('returns prescribed for 4-year-old bill', () => {
    const result = checkBillPrescription(
      periodMonthsAgo(48),
      REF_DATE,
    );
    expect(result.status).toBe('prescribed');
  });
});

// ---------------------------------------------------------------------------
// generatePrescriptionWarnings
// ---------------------------------------------------------------------------

describe('generatePrescriptionWarnings', () => {
  const makeError = (
    lineItem: string,
    serviceType: BillError['service_type'],
  ): BillError => ({
    line_item: lineItem,
    service_type: serviceType,
    amount_charged: 1000,
    expected_amount: 500,
    issue: 'Overcharge',
    legal_basis: 'Section 102',
    recoverable: true,
  });

  it('generates no warnings for recent bill', () => {
    const errors = [
      makeError('Water', 'water'),
      makeError('Electricity', 'electricity'),
    ];
    const result = generatePrescriptionWarnings(
      errors,
      periodMonthsAgo(12),
      REF_DATE,
    );
    expect(result.hasPrescribed).toBe(false);
    expect(result.hasApproaching).toBe(false);
    expect(result.prescribedItems).toHaveLength(0);
    expect(result.approachingItems).toHaveLength(0);
  });

  it('flags prescribed water/electricity but not rates on old bill', () => {
    const errors = [
      makeError('Water overcharge', 'water'),
      makeError('Electricity overcharge', 'electricity'),
      makeError('Rates error', 'rates'),
    ];
    const result = generatePrescriptionWarnings(
      errors,
      periodMonthsAgo(40),
      REF_DATE,
    );
    expect(result.hasPrescribed).toBe(true);
    expect(result.prescribedItems).toHaveLength(2);
    expect(result.prescribedItems[0].lineItem).toBe('Water overcharge');
    expect(result.prescribedItems[1].lineItem).toBe('Electricity overcharge');
    // Rates has 30-year limit — still normal
    expect(result.approachingItems).toHaveLength(0);
  });

  it('flags approaching items at 34 months', () => {
    const errors = [makeError('Electricity charge', 'electricity')];
    const result = generatePrescriptionWarnings(
      errors,
      periodMonthsAgo(34),
      REF_DATE,
    );
    expect(result.hasApproaching).toBe(true);
    expect(result.approachingItems).toHaveLength(1);
    expect(result.approachingItems[0].lineItem).toBe('Electricity charge');
    expect(result.approachingItems[0].monthsRemaining).toBe(2);
  });

  describe('Unclassifiable / Unknown services', () => {
    it('returns unknown for potentially new service types missing from mapping', () => {
      // @ts-expect-error - testing invalid type intentionally
      const result = checkPrescription(periodMonthsAgo(100), 'broadband' as unknown as import('@/types').ServiceType, REF_DATE);
      expect(result.status).toBe('unknown');
    });
  });

  it('handles empty errors array', () => {
    const result = generatePrescriptionWarnings(
      [],
      periodMonthsAgo(40),
      REF_DATE,
    );
    expect(result.hasPrescribed).toBe(false);
    expect(result.hasApproaching).toBe(false);
  });
});
