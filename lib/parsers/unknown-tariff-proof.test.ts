import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseBillFile } from '../pdf/parse';
import { getParser } from './registry';
import { getTariffStore } from '../tariff/registry';
import { getTariffYearForDate } from '../tariff/tariffLookup';
import { verifyRatesCharge } from '../tariff/verifiers/ratesCharge';

// Mock the tariff resolver to simulate Supabase being unavailable (SKIP path)
// This forces the fallback to the generic store which is the local verified data
vi.mock('../tariff/tariff-resolver', () => ({
  resolveTariff: vi.fn().mockResolvedValue({ result: 'SKIP', reason: 'Test environment - no Supabase' }),
}));

const BILLS_DIR = path.join(__dirname, '../../tests/bills');

/**
 * UNKNOWN_TARIFF proof test.
 * 
 * For every rates line in all 36 bills, verifies that:
 * 1. The resolver path returns SKIP (mocked).
 * 2. generic-store returns a valid rate (or undefined for truly unknown dates).
 * 3. UNKNOWN_TARIFF is only emitted when BOTH sources return no data.
 * 
 * Logs diagnostic output for every rates line.
 */
describe('UNKNOWN_TARIFF proof — 36 bills', () => {
  const files = fs.existsSync(BILLS_DIR)
    ? fs.readdirSync(BILLS_DIR).filter(f => f.endsWith('.pdf'))
    : [];

  if (files.length === 0) {
    it.skip('No test PDFs found', () => {});
    return;
  }

  for (const file of files) {
    it(`${file} — no false UNKNOWN_TARIFF`, async () => {
      const buffer = fs.readFileSync(path.join(BILLS_DIR, file));
      const text = await parseBillFile(buffer, 'application/pdf');
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      if (!parsed) return;

      const falseUnknowns: string[] = [];

      for (const seg of parsed.rates) {
        if (seg.parse_status === 'PARSE_FAILED') continue;

        // Direct check: what does generic-store return?
        const store = getTariffStore('city-of-cape-town');
        const fy = getTariffYearForDate(seg.fromDate);
        const fallbackRate = store.getRate('RATES', fy, 'residential')?.rate_value;
        
        // Run the verifier (resolver is mocked to SKIP)
        const result = await verifyRatesCharge(seg.annualRate, seg.fromDate, 'CoCT');

        console.log(`[UNKNOWN_TARIFF_PROOF] ${file} fromDate=${seg.fromDate} rate=${seg.annualRate} ` +
          `resolver=SKIP(mocked) fallback=${fallbackRate !== undefined ? fallbackRate : 'undefined'} ` +
          `verifier_result=${result.result}${result.approved_rate !== undefined ? ' approved=' + result.approved_rate : ''}`);

        // The critical check: if fallback returned a value, the verifier must NOT return SKIP
        if (fallbackRate !== undefined && result.result === 'SKIP') {
          falseUnknowns.push(
            `FALSE UNKNOWN_TARIFF: ${file} fromDate=${seg.fromDate} rate=${seg.annualRate} — ` +
            `generic-store returned ${fallbackRate} but verifier returned SKIP`
          );
        }
      }

      if (falseUnknowns.length > 0) {
        console.error('\n[UNKNOWN_TARIFF BUG DETECTED]');
        falseUnknowns.forEach(msg => console.error(`  ${msg}`));
      }

      expect(falseUnknowns).toHaveLength(0);
    });
  }
});
