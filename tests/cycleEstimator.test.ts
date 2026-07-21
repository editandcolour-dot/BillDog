import { describe, it, expect } from 'vitest';
import {
  extractIssueDate,
  estimateExpectedDay,
  computeNextCheckAt,
  rollEstimate,
  lastDayOfMonth,
} from '@/lib/autofetch/cycleEstimator';

describe('extractIssueDate', () => {
  it('parses "Statement Date: 2026/05/14"', () => {
    const d = extractIssueDate('CITY OF CAPE TOWN\nStatement Date: 2026/05/14\nAccount Number: 123');
    expect(d?.toISOString().slice(0, 10)).toBe('2026-05-14');
  });

  it('parses "Account Date 14/05/2026" (DMY)', () => {
    const d = extractIssueDate('Header\nAccount Date 14/05/2026\nBody');
    expect(d?.toISOString().slice(0, 10)).toBe('2026-05-14');
  });

  it('parses "Invoice Date: 14 May 2026"', () => {
    const d = extractIssueDate('Invoice Date: 14 May 2026');
    expect(d?.toISOString().slice(0, 10)).toBe('2026-05-14');
  });

  it('parses "Date Issued: 14th September 2026"', () => {
    const d = extractIssueDate('Date Issued: 14th September 2026');
    expect(d?.toISOString().slice(0, 10)).toBe('2026-09-14');
  });

  it('returns null when no label present', () => {
    expect(extractIssueDate('random text 2026/05/14')).toBeNull();
  });

  it('returns null on empty input', () => {
    expect(extractIssueDate('')).toBeNull();
  });
});

describe('estimateExpectedDay', () => {
  it('returns unknown for empty input', () => {
    expect(estimateExpectedDay([])).toEqual({ day: null, confidence: 'unknown', sampleSize: 0 });
  });

  it('returns unknown for a single date but still reports the day', () => {
    const r = estimateExpectedDay([new Date(Date.UTC(2026, 4, 14))]);
    expect(r).toEqual({ day: 14, confidence: 'unknown', sampleSize: 1 });
  });

  it('returns tight for stable cycle (all on the 14th)', () => {
    const dates = [
      new Date(Date.UTC(2026, 0, 14)),
      new Date(Date.UTC(2026, 1, 14)),
      new Date(Date.UTC(2026, 2, 14)),
      new Date(Date.UTC(2026, 3, 14)),
    ];
    expect(estimateExpectedDay(dates)).toEqual({ day: 14, confidence: 'tight', sampleSize: 4 });
  });

  it('returns loose when IQR > 2', () => {
    const dates = [10, 12, 18, 25].map(
      (day) => new Date(Date.UTC(2026, 0, day))
    );
    const r = estimateExpectedDay(dates);
    expect(r.confidence).toBe('loose');
    expect(r.sampleSize).toBe(4);
  });

  it('ignores invalid dates', () => {
    const r = estimateExpectedDay([
      new Date('not-a-date'),
      new Date(Date.UTC(2026, 0, 14)),
      new Date(Date.UTC(2026, 1, 14)),
    ]);
    expect(r.day).toBe(14);
    expect(r.sampleSize).toBe(2);
  });
});

describe('rollEstimate', () => {
  it('seeds estimate from first observation', () => {
    const next = rollEstimate(
      { day: null, confidence: 'unknown', sampleSize: 0 },
      new Date(Date.UTC(2026, 4, 14))
    );
    expect(next).toEqual({ day: 14, confidence: 'unknown', sampleSize: 1 });
  });

  it('drifts toward new observations with weighting', () => {
    const next = rollEstimate(
      { day: 14, confidence: 'tight', sampleSize: 4 },
      new Date(Date.UTC(2026, 4, 16))
    );
    // (14*4 + 16) / 5 = 14.4 → round to 14
    expect(next.day).toBe(14);
    expect(next.sampleSize).toBe(5);
  });

  it('locks median once sampleSize hits 12 but still counts', () => {
    const next = rollEstimate(
      { day: 14, confidence: 'tight', sampleSize: 12 },
      new Date(Date.UTC(2026, 4, 20))
    );
    expect(next.day).toBe(14);
    expect(next.sampleSize).toBe(13);
  });
});

describe('computeNextCheckAt', () => {
  it('schedules ~30 days out after a successful fetch', () => {
    const next = computeNextCheckAt({
      expectedDay: 14,
      confidence: 'tight',
      fromDate: new Date(Date.UTC(2026, 4, 14)), // Thu 14 May 2026
      justFoundBill: true,
    });
    // Next month, day 15 (expected + 1). 15 June 2026 is a Monday.
    expect(next.toISOString().slice(0, 10)).toBe('2026-06-15');
  });

  it('applies the loose-cycle safety margin', () => {
    const next = computeNextCheckAt({
      expectedDay: 14,
      confidence: 'loose',
      fromDate: new Date(Date.UTC(2026, 4, 14)),
      justFoundBill: true,
    });
    // 14 + 1 - 2 = 13 June 2026. That's a Saturday → bumps to Monday 15th.
    expect(next.toISOString().slice(0, 10)).toBe('2026-06-15');
  });

  it('skips weekends when scheduling next month', () => {
    const next = computeNextCheckAt({
      expectedDay: 4,
      confidence: 'tight',
      fromDate: new Date(Date.UTC(2026, 6, 4)), // 4 Jul 2026 (Sat)
      justFoundBill: true,
    });
    // Aug 5 2026 is Wed — normal weekday.
    expect(next.toISOString().slice(0, 10)).toBe('2026-08-05');
  });

  it('hunting mode polls tomorrow if not yet found', () => {
    const next = computeNextCheckAt({
      expectedDay: 14,
      confidence: 'tight',
      fromDate: new Date(Date.UTC(2026, 4, 15)), // Fri 15 May 2026
      justFoundBill: false,
    });
    // Tomorrow is Sat → push to Mon 18 May.
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-18');
  });

  it('respects +14 cap and rolls to next month when chase expires', () => {
    const chasingSince = new Date(Date.UTC(2026, 4, 14));
    const next = computeNextCheckAt({
      expectedDay: 14,
      confidence: 'tight',
      fromDate: new Date(Date.UTC(2026, 4, 30)), // 16 days into the chase
      justFoundBill: false,
      chasingSince,
    });
    // Should jump to next month's expected+1 = 15 June 2026 (Mon).
    expect(next.toISOString().slice(0, 10)).toBe('2026-06-15');
  });
});

describe('computeNextCheckAt — month-length-aware clamp (late-month billers)', () => {
  it('schedules on/after the expected day when the target month has 31 days', () => {
    const next = computeNextCheckAt({
      expectedDay: 30,
      confidence: 'tight',
      fromDate: new Date(Date.UTC(2026, 6, 30)), // Thu 30 Jul 2026
      justFoundBill: true,
    });
    // Aug has 31 days → expected+1 = Mon 31 Aug 2026. A clamp to the 28th would
    // probe two days BEFORE issuance and permanently stall this credential.
    expect(next.toISOString().slice(0, 10)).toBe('2026-08-31');
  });

  it('clamps a 31st-biller into a 30-day target month', () => {
    const next = computeNextCheckAt({
      expectedDay: 31,
      confidence: 'tight',
      fromDate: new Date(Date.UTC(2026, 7, 31)), // Mon 31 Aug 2026
      justFoundBill: true,
    });
    // Sep has 30 days → expected+1 = 32 clamps to Wed 30 Sep 2026.
    expect(next.toISOString().slice(0, 10)).toBe('2026-09-30');
  });

  it('still clamps to the real end of February', () => {
    const next = computeNextCheckAt({
      expectedDay: 30,
      confidence: 'tight',
      fromDate: new Date(Date.UTC(2026, 0, 30)), // Fri 30 Jan 2026
      justFoundBill: true,
    });
    // Feb 2026 has 28 days → Sat 28 Feb → weekend-skip → Mon 2 Mar.
    expect(next.toISOString().slice(0, 10)).toBe('2026-03-02');
  });

  it('cap-expiry jump also lands on/after the expected day next month', () => {
    const next = computeNextCheckAt({
      expectedDay: 30,
      confidence: 'tight',
      fromDate: new Date(Date.UTC(2026, 8, 15)), // Tue 15 Sep 2026
      justFoundBill: false,
      chasingSince: new Date(Date.UTC(2026, 7, 30)), // chase began Sun 30 Aug
    });
    // Past the +14 cap (13 Sep) → jump to Oct's expected+1 = Sat 31 Oct → Mon 2 Nov.
    expect(next.toISOString().slice(0, 10)).toBe('2026-11-02');
  });
});

describe('lastDayOfMonth', () => {
  it('knows leap February', () => {
    expect(lastDayOfMonth(2028, 1)).toBe(29);
    expect(lastDayOfMonth(2026, 1)).toBe(28);
  });

  it('normalises a month index past December into the next year', () => {
    expect(lastDayOfMonth(2026, 12)).toBe(31); // Jan 2027
  });
});
