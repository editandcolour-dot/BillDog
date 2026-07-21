import { describe, it, expect } from 'vitest';
import { getParser } from '@/lib/parsers/registry';

describe('getParser — municipality identifier normalisation', () => {
  it('resolves the canonical slug', () => {
    expect(getParser('city-of-cape-town')).not.toBeNull();
  });

  it('resolves the short code in any casing', () => {
    expect(getParser('CoCT')).not.toBeNull();
    expect(getParser('coct')).not.toBeNull();
  });

  it('resolves the display name as stored on cases rows', () => {
    expect(getParser('City of Cape Town')).not.toBeNull();
  });

  it('tolerates surrounding whitespace', () => {
    expect(getParser('  City of Cape Town  ')).not.toBeNull();
  });

  it('returns null for unknown municipalities', () => {
    expect(getParser('City of Johannesburg')).toBeNull();
    expect(getParser('')).toBeNull();
  });

  it('every alias resolves the SAME parser instance', () => {
    const canonical = getParser('city-of-cape-town');
    expect(getParser('City of Cape Town')).toBe(canonical);
    expect(getParser('CoCT')).toBe(canonical);
    expect(getParser('coct')).toBe(canonical);
  });
});
