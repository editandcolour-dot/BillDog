import fs from 'fs';
import path from 'path';
import { parseBillFile } from '../lib/pdf/parse';
import { getParser } from '../lib/parsers/registry';
import { validateBill } from '../lib/validators/bill-validator';

const BILLS_DIR = path.join(__dirname, '../tests/bills');
const ANSWER_KEY = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'answer-key.json'), 'utf-8')
);

// The answer-key uses legacy type names that predate the current FindingType enum.
// This alias table maps answer-key types to the set of current validator types
// that satisfy the spec, so a correct detection still counts as a TP.
const TYPE_ALIAS: Record<string, string[]> = {
  RATES_CALC_ERROR: ['RATES_CALC_ERROR', 'PARSER_MISMATCH'],
  REBATE_CALC_ERROR: ['REBATE_CALC_ERROR'],
  VAT_CALC_ERROR: ['VAT_MISMATCH'],
  HUC_AMOUNT_WRONG: ['HUC_AMOUNT_WRONG'],
  FIXED_BASIC_WRONG: ['WATER_FIXED_CHARGE_WRONG'],
  REFUSE_CHARGE_WRONG: ['UNKNOWN_RATE_APPLIED'],
  UNKNOWN_RATE_APPLIED: ['UNKNOWN_RATE_APPLIED'],
};

function invoiceFromFilename(file: string): string {
  // 'ISU106006147353.pdf' → '106006147353'
  return file.replace(/^ISU/, '').replace(/\.pdf$/i, '');
}

async function main() {
  const files = fs.readdirSync(BILLS_DIR).filter(f => f.endsWith('.pdf')).sort();
  console.log(`Found ${files.length} bills`);

  const results: { invoice: string; file: string; findings: any[] }[] = [];
  let parseFailures = 0;

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(BILLS_DIR, file));
    try {
      const text = await parseBillFile(buffer, 'application/pdf');
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      if (!parsed) {
        console.log(`NOT-COCT: ${file}`);
        parseFailures++;
        continue;
      }
      const findings = await validateBill(parsed, 'CoCT');
      results.push({ invoice: invoiceFromFilename(file), file, findings });
    } catch (e) {
      console.log(`PARSE-ERR: ${file} — ${e}`);
      parseFailures++;
    }
  }

  // Score against answer key
  let tp = 0;
  let fp = 0;
  const matched: string[] = [];
  const unexpected: string[] = [];
  const remaining: any[] = [...ANSWER_KEY];

  for (const r of results) {
    for (const f of r.findings) {
      const idx = remaining.findIndex((a: any) => {
        if (a.invoiceNumber !== r.invoice) return false;
        const aliased = TYPE_ALIAS[a.errorType] || [a.errorType];
        if (!aliased.includes(f.type)) return false;
        return Math.abs(Math.abs(a.overchargeZar) - (f.overchargeZar ?? 0)) <= a.tolerance;
      });
      if (idx !== -1) {
        tp++;
        matched.push(
          `${r.invoice} | ${f.type} | overchargeZar=${f.overchargeZar} | recoverable=${f.recoverable}`
        );
        remaining.splice(idx, 1);
      } else {
        // Only count as FP if recoverable (UNKNOWN_TARIFF etc. don't count)
        if (f.recoverable !== false) {
          fp++;
          unexpected.push(
            `${r.invoice} | ${f.type} | overchargeZar=${f.overchargeZar} | ${(f.description || '').slice(0, 90)}`
          );
        }
      }
    }
  }

  // Sign check — every overchargeZar must be non-negative
  let signViolations = 0;
  for (const r of results) {
    for (const f of r.findings) {
      if (typeof f.overchargeZar !== 'number' || f.overchargeZar < 0) {
        signViolations++;
        console.log(
          `SIGN-VIOLATION: ${r.invoice} | ${f.type} | overchargeZar=${f.overchargeZar}`
        );
      }
    }
  }

  console.log('\n========= SCORECARD =========');
  console.log(`Bills parsed as CoCT: ${results.length}/${files.length} (parse failures: ${parseFailures})`);
  console.log(`Answer key entries:   ${ANSWER_KEY.length}`);
  console.log(`True Positives:       ${tp}/${ANSWER_KEY.length}`);
  console.log(`False Positives:      ${fp}`);
  console.log(`Sign violations:      ${signViolations}`);
  console.log('\n--- Matched ---');
  for (const m of matched) console.log(`  + ${m}`);
  console.log('\n--- Missed (in answer key, validator silent) ---');
  for (const m of remaining)
    console.log(`  - ${m.invoiceNumber} | ${m.errorType} | expected overchargeZar=${m.overchargeZar}`);
  console.log('\n--- Unexpected (false positives) ---');
  for (const u of unexpected) console.log(`  ? ${u}`);

  const totalFindings = results.reduce((s, r) => s + r.findings.length, 0);
  console.log(`\nTotal findings across all bills: ${totalFindings}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
