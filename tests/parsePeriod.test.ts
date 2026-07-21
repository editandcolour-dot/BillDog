import { describe, it, expect } from 'vitest';
import { parsePeriod } from '@/lib/scrapers/generic';

describe('parsePeriod', () => {
  it('parses YYYY-MM', () => {
    expect(parsePeriod('2026-05')).toBe('May 1, 2026');
  });

  it('parses DD/MM/YYYY', () => {
    expect(parsePeriod('14/05/2026')).toBe('May 14, 2026');
  });

  it('parses MM/YYYY', () => {
    expect(parsePeriod('05/2026')).toBe('May 1, 2026');
  });

  it('parses worded periods like "May 2026"', () => {
    expect(parsePeriod('May 2026')).toBe('May 1, 2026');
  });

  it('returns null — never a sentinel string — for garbage', () => {
    expect(parsePeriod('not a date')).toBeNull();
    expect(parsePeriod('')).toBeNull();
  });
});
