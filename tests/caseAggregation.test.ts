import { describe, it, expect } from 'vitest';
import { round2, roundErrors, aggregateCaseFromBills } from '@/lib/analysis/case-aggregation';

describe('round2 / roundErrors', () => {
  it('strips IEEE-754 residue at the cents boundary', () => {
    expect(round2(612.590000000001)).toBe(612.59);
    expect(round2(25.113)).toBe(25.11);
  });

  it('rounds overchargeZar per error and leaves absent values untouched', () => {
    const rounded = roundErrors([
      { line_item: 'Water', overchargeZar: 25.113 },
      { line_item: 'Rates' },
    ]);
    expect(rounded[0].overchargeZar).toBe(25.11);
    expect(rounded[1].overchargeZar).toBeUndefined();
  });
});

describe('aggregateCaseFromBills', () => {
  const feb = {
    bill_period: '01/02/2026 to 28/02/2026',
    errors: [{ line_item: 'Water', overchargeZar: 25.113 }],
    total_billed: 1000,
    total_recoverable: 25.113,
  };
  const mar = {
    bill_period: '01/03/2026 to 30/03/2026',
    errors: [],
    total_billed: 900.004,
    total_recoverable: 0,
  };

  it('flattens per-bill errors, annotates bill_period, rounds amounts', () => {
    const agg = aggregateCaseFromBills([feb, mar]);
    expect(agg.errors_found).toEqual([
      { line_item: 'Water', overchargeZar: 25.11, bill_period: '01/02/2026 to 28/02/2026' },
    ]);
    expect(agg.recoverable).toBe(25.11);
    expect(agg.total_recoverable_all).toBe(25.11);
    expect(agg.total_billed).toBe(1900);
  });

  it('is letter_ready when any error exists, closed when none', () => {
    expect(aggregateCaseFromBills([feb, mar]).status).toBe('letter_ready');
    expect(aggregateCaseFromBills([mar]).status).toBe('closed');
  });

  it('computes the chronological period span regardless of input order', () => {
    const agg = aggregateCaseFromBills([mar, feb]);
    expect(agg.bill_period).toBe('01/02/2026 to 30/03/2026');
    expect(agg.date_range_start).toBe('2026-02-01');
    expect(agg.date_range_end).toBe('2026-03-30');
  });

  it('falls back to the first period string when the span format does not match', () => {
    const agg = aggregateCaseFromBills([
      { bill_period: 'May 2026', errors: [], total_billed: 100, total_recoverable: 0 },
    ]);
    expect(agg.bill_period).toBe('May 2026');
    expect(agg.date_range_start).toBeNull();
    expect(agg.date_range_end).toBeNull();
  });
});
