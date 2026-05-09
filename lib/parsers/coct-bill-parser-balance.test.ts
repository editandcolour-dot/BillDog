import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseBillFile } from '../pdf/parse';
import { getParser } from './registry';

const BILLS_DIR = path.join(__dirname, '../../tests/bills');

/**
 * Exhaustive extraction balance test.
 * For every bill: sum of SECTION SUBTOTALS + VAT must equal totalDue within R0.15.
 * 
 * We use section subtotals (the printed totals at the end of each section)
 * rather than summing individual charge lines, because some test bills have
 * deliberately injected arithmetic errors in individual line items.
 * The section subtotals are what CoCT prints as the running total.
 */
describe('Exhaustive extraction balance — 36 bills', () => {
  const files = fs.existsSync(BILLS_DIR)
    ? fs.readdirSync(BILLS_DIR).filter(f => f.endsWith('.pdf'))
    : [];

  if (files.length === 0) {
    it.skip('No test PDFs found in tests/bills/', () => {});
    return;
  }

  for (const file of files) {
    it(`${file} — sectionSubtotals + VAT = totalDue (±R0.15)`, async () => {
      // E4 in answer key: ISU190010157842 has deliberately injected VAT error (+R40)
      const KNOWN_VAT_ERROR_BILLS = ['ISU190010157842.pdf'];
      const isKnownVatError = KNOWN_VAT_ERROR_BILLS.includes(file);
      const buffer = fs.readFileSync(path.join(BILLS_DIR, file));
      const text = await parseBillFile(buffer, 'application/pdf');
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);

      expect(parsed).not.toBeNull();
      if (!parsed) return;

      // Sum all section subtotals (the printed totals)
      const subSum = parsed.sectionSubtotals.reduce((s, st) => s + st.subtotal, 0);
      const expected = subSum + parsed.vatAmount;
      const diff = Math.abs(expected - parsed.totalDue);

      if (diff >= 0.15) {
        console.error(`\n[BALANCE FAIL] ${file}`);
        console.error(`  sectionSubtotals sum = ${subSum.toFixed(2)}`);
        parsed.sectionSubtotals.forEach(s => console.error(`    ${s.section} = ${s.subtotal.toFixed(2)}`));
        console.error(`  VAT = ${parsed.vatAmount.toFixed(2)}`);
        console.error(`  expected = ${expected.toFixed(2)}`);
        console.error(`  totalDue = ${parsed.totalDue.toFixed(2)}`);
        console.error(`  diff = ${diff.toFixed(2)}`);
        
        // Also show classified breakdown for debugging
        const ratesSum = parsed.rates.reduce((s, r) => s + r.billedAmount, 0);
        const waterFixedSum = parsed.waterFixedCharges.reduce((s, c) => s + c.totalCharged, 0);
        const waterTierSum = parsed.waterTierCharges.reduce((s, c) => s + c.amount, 0);
        const refuseSum = parsed.refuseCharges.reduce((s, c) => s + c.amount, 0);
        const sewerageSum = parsed.sewerageCharges.reduce((s, c) => s + c.amount, 0);
        const hucSum = parsed.hucCharges.reduce((s, c) => s + c.amount, 0);
        const sundrySum = parsed.sundryCharges.reduce((s, c) => s + c.amount, 0);
        const otherSum = parsed.otherCharges.reduce((s, c) => s + c.amount, 0);
        console.error(`  classified breakdown:`);
        console.error(`    rates = ${ratesSum.toFixed(2)}`);
        console.error(`    waterFixed = ${waterFixedSum.toFixed(2)}`);
        console.error(`    waterTier = ${waterTierSum.toFixed(2)}`);
        console.error(`    refuse = ${refuseSum.toFixed(2)}`);
        console.error(`    sewerage = ${sewerageSum.toFixed(2)}`);
        console.error(`    huc = ${hucSum.toFixed(2)}`);
        console.error(`    sundry = ${sundrySum.toFixed(2)}`);
        console.error(`    other = ${otherSum.toFixed(2)} (${parsed.otherCharges.length} items)`);
        parsed.otherCharges.forEach(o => console.error(`      [${o.section}] ${o.rawLine} → ${o.amount}`));
      }

      const tolerance = isKnownVatError ? 50 : 0.15; // E4 has +R40 injected VAT error
      expect(diff).toBeLessThan(tolerance);
    });
  }
});
