/**
 * CoCT Bill Reconciliation Harness — PERMANENT internal-consistency test.
 *
 * Runs every real bill in tests/bills/ through the parser + validator and asserts that
 * each bill reconciles against ITS OWN PRINTED NUMBERS. The point is to catch the class
 * of bug where the engine fabricates a figure that the bill's own arithmetic contradicts
 * (e.g. the multi-tier line-wrap parse defect, or a finding whose Billed/Expected columns
 * contradict its overcharge).
 *
 * WHAT THIS VERIFIES (all from numbers printed on the bill itself):
 *   1. Each multi-tier water/sewerage charge: Σ(tier_qty × tier_rate) == the charge total.
 *   2. Each section: Σ(printed line amounts) == the section's printed subtotal.
 *   3. Σ(section subtotals) + printed VAT line == printed "Current account: Total due".
 *   4. Printed VAT line == 15% × Σ(amounts on lines marked with '&'), ±R0.05.
 *   5. Every recoverable finding: |billed − expected| reconciles to the finding's overcharge
 *      at a real VAT factor (×1.00 or ×1.15), so no finding shows self-contradicting columns.
 *
 * WHAT THIS DOES **NOT** VERIFY:
 *   - Whether the stored/gazetted tariff rates match CoCT's actually published rates.
 *     That is EXTERNAL source verification (a separate concern) and is deliberately NOT
 *     baked in here. Checks 1–4 use only numbers printed on the bill; check 5 only asserts
 *     the engine's own finding columns are mutually consistent. A bill can pass every check
 *     here while still being billed at a wrong (but internally consistent) gazetted rate.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseBillFile } from '@/lib/pdf/parse';
import { getParser } from '@/lib/parsers/registry';
import { validateBill } from '@/lib/validators/bill-validator';
import type { ParsedBill, ValidationFinding } from '@/types/analysis';

const BILLS_DIR = path.join(__dirname, 'bills');
const TOL = 0.05; // Rand rounding tolerance

const BILL_FILES = fs.existsSync(BILLS_DIR)
  ? fs.readdirSync(BILLS_DIR).filter((f) => f.toLowerCase().endsWith('.pdf')).sort()
  : [];

/**
 * Injected-error answer key (scripts/answer-key.json): the bills with a deliberately
 * injected billing error, keyed by invoice number → labelled overcharge amount. Maps to
 * filename `ISU<invoice>.pdf`.
 *
 * NOTE ON "CLEAN": a bill is treated as CLEAN purely by ABSENCE from this key. That is NOT
 * positive verification that the bill is error-free — only that no injected error is
 * recorded for it. (Checks 1–4 then assert it reconciles against its own printed numbers.)
 */
const ANSWER_KEY_PATH = path.join(__dirname, '..', 'scripts', 'answer-key.json');
const INJECTED = new Map<string, number>(); // filename → |labelled overchargeZar|
try {
  const key = JSON.parse(fs.readFileSync(ANSWER_KEY_PATH, 'utf-8')) as { invoiceNumber: string; overchargeZar: number }[];
  for (const k of key) INJECTED.set(`ISU${k.invoiceNumber}.pdf`, Math.abs(k.overchargeZar));
} catch {
  /* key missing — all bills treated as clean */
}
const DETECT_TOL = 1.5; // Rand tolerance for "injected error detected at ≈ keyed amount"

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

interface LineFail {
  line: string;
  expected: number;
  actual: number;
  delta: number;
}
interface CheckResult {
  pass: boolean;
  fails: LineFail[];
}
interface BillResult {
  bill: string;
  parsed: ParsedBill | null;
  c1: CheckResult;
  c2: CheckResult;
  c3: CheckResult;
  c4: CheckResult;
  c5: CheckResult;
  error?: string;
}

const TIER_RE = /\((\d+)\)\s*([\d.]+)\s*kl\s*@\s*R\s*([\d.]+)/gi;
const ENDS_IN_RATE = /@\s*R\s*[\d.]+\s*$/;
const ENDS_IN_TOTAL = /(-?[\d,]+\.\d{2})\s*$/;
const PAGE_MARKER = /\s*--?\s*\d+\s+of\s+\d+\s*--?\s*/g;

function parseTiers(description: string): { tier: number; qty: number; rate: number }[] {
  const out: { tier: number; qty: number; rate: number }[] = [];
  for (const m of description.matchAll(TIER_RE)) {
    const tier = parseInt(m[1], 10);
    const qty = parseFloat(m[2]);
    const rate = parseFloat(m[3]);
    if (!isNaN(tier) && !isNaN(qty) && !isNaN(rate)) out.push({ tier, qty, rate });
  }
  return out;
}

/**
 * Sum the amounts on every line marked with a leading '&' (VAT-able), reading ONLY the
 * printed figures. Handles charges that print across multiple lines:
 *   - wrapped multi-tier charges whose first '&' line ends in a rate, and
 *   - multi-tariff-period charges that print as TWO '&' lines (e.g. "& From 30/05 …" then
 *     "& From 01/07 … 222.02") when a rate changes mid-period.
 * In both cases the single charge total is counted ONCE: when an incomplete '&' line
 * (ending in a rate) is found, we scan forward to the charge total and then resume AFTER
 * the total line, so a continuation line that also begins with '&' is not counted again.
 */
function sumAmpMarkedAmounts(rawText: string): { sum: number; lines: { amount: number; text: string }[] } {
  const lines = rawText.split('\n').map((l) => l.replace(PAGE_MARKER, ' ').replace(/\s+$/, ''));
  const found: { amount: number; text: string }[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.startsWith('&')) {
      i++;
      continue;
    }
    if (ENDS_IN_RATE.test(line)) {
      // Multi-line / multi-period charge: scan forward to the single charge total, then
      // resume AFTER it so the consumed continuation lines (which may also start with '&')
      // are never counted a second time.
      let amount: number | null = null;
      let end = i;
      for (let j = i + 1; j < lines.length && j - i <= 6; j++) {
        const nxt = lines[j].trim();
        if (!nxt) continue;
        if (ENDS_IN_RATE.test(nxt)) {
          end = j; // another period/tier fragment — absorb and keep scanning
          continue;
        }
        const mt = nxt.match(ENDS_IN_TOTAL);
        if (mt) {
          amount = parseFloat(mt[1].replace(/,/g, ''));
          end = j;
          break;
        }
        break; // non-tier, non-total line — stop
      }
      if (amount !== null) found.push({ amount, text: line.slice(0, 60) });
      i = end + 1;
    } else {
      const m = line.match(ENDS_IN_TOTAL);
      if (m) found.push({ amount: parseFloat(m[1].replace(/,/g, '')), text: line.slice(0, 60) });
      i++;
    }
  }
  return { sum: r2(found.reduce((s, f) => s + f.amount, 0)), lines: found };
}

function otherSum(parsed: ParsedBill, section: string): number {
  return (parsed.otherCharges || [])
    .filter((o) => o.section === section)
    .reduce((s, o) => s + (o.amount || 0), 0);
}

// ── Check implementations ─────────────────────────────────────────────────────

function check1(parsed: ParsedBill): CheckResult {
  const fails: LineFail[] = [];
  const tierCharges = [
    ...(parsed.waterTierCharges || []),
    ...(parsed.sewerageCharges || []),
  ];
  for (const c of tierCharges) {
    const tiers = parseTiers(c.description || '');
    if (tiers.length === 0) continue; // not a tiered consumption line
    const sumTiers = r2(tiers.reduce((s, t) => s + t.qty * t.rate, 0));
    const total = r2(c.amount || 0);
    if (Math.abs(sumTiers - total) > TOL) {
      fails.push({ line: c.description || '(no description)', expected: sumTiers, actual: total, delta: r2(total - sumTiers) });
    }
  }
  return { pass: fails.length === 0, fails };
}

function check2(parsed: ParsedBill): CheckResult {
  const fails: LineFail[] = [];
  const sections: { name: string; sum: number; subtotal: number }[] = [
    {
      name: 'PROPERTY RATES',
      sum: (parsed.rates || []).reduce((s, r) => s + (r.billedAmount || 0), 0) + otherSum(parsed, 'PROPERTY RATES'),
      subtotal: parsed.subtotals.ratesNet,
    },
    {
      name: 'WATER',
      sum:
        (parsed.waterTierCharges || []).reduce((s, c) => s + (c.amount || 0), 0) +
        (parsed.waterFixedCharges || []).reduce((s, c) => s + (c.totalCharged || 0), 0) +
        otherSum(parsed, 'WATER'),
      subtotal: parsed.subtotals.water,
    },
    {
      name: 'REFUSE',
      sum: (parsed.refuseCharges || []).reduce((s, c) => s + (c.amount || 0), 0) + otherSum(parsed, 'REFUSE'),
      subtotal: parsed.subtotals.refuse,
    },
    {
      name: 'SEWERAGE',
      sum: (parsed.sewerageCharges || []).reduce((s, c) => s + (c.amount || 0), 0) + otherSum(parsed, 'SEWERAGE'),
      subtotal: parsed.subtotals.sewerage,
    },
    {
      name: 'SUNDRIES',
      sum:
        (parsed.sundryCharges || []).reduce((s, c) => s + (c.amount || 0), 0) +
        (parsed.hucCharges || []).reduce((s, c) => s + (c.amount || 0), 0) +
        otherSum(parsed, 'SUNDRIES'),
      subtotal: parsed.subtotals.sundries,
    },
  ];
  for (const s of sections) {
    const sum = r2(s.sum);
    const sub = r2(s.subtotal || 0);
    if (Math.abs(sum - sub) > TOL) {
      fails.push({ line: `${s.name} section`, expected: sub, actual: sum, delta: r2(sum - sub) });
    }
  }
  return { pass: fails.length === 0, fails };
}

function check3(parsed: ParsedBill): CheckResult {
  const s = parsed.subtotals;
  const sumSubs = s.ratesNet + s.water + s.refuse + s.sewerage + s.sundries;
  const expected = r2(sumSubs + (parsed.vatAmount || 0)); // subtotals + printed VAT line
  const actual = r2(parsed.totalDue || 0);
  const pass = Math.abs(expected - actual) <= TOL;
  return {
    pass,
    fails: pass ? [] : [{ line: 'Σ subtotals + VAT vs Current account: Total due', expected, actual, delta: r2(actual - expected) }],
  };
}

function check4(parsed: ParsedBill, rawText: string): CheckResult {
  if (!parsed.vatAmount || parsed.vatAmount <= 0) return { pass: true, fails: [] }; // no VAT line to reconcile
  const { sum } = sumAmpMarkedAmounts(rawText);
  const expectedVat = r2(sum * 0.15);
  const actual = r2(parsed.vatAmount);
  const pass = Math.abs(expectedVat - actual) <= TOL;
  return {
    pass,
    fails: pass ? [] : [{ line: `15% × Σ(&-marked = ${r2(sum)})`, expected: expectedVat, actual, delta: r2(actual - expectedVat) }],
  };
}

function check5(findings: ValidationFinding[]): CheckResult {
  const fails: LineFail[] = [];
  for (const f of findings) {
    if (f.recoverable === false) continue;
    // Documented reconciliation exception: UNKNOWN_RATE_APPLIED on a rates segment nets a
    // sibling rebate, so its overchargeZar is an aggregate across segments and does not
    // relate to a single line's (billed − expected) by any VAT factor. Excluded by design.
    if (f.type === 'UNKNOWN_RATE_APPLIED') continue;
    const oc = r2(f.overchargeZar ?? 0);
    if (oc === 0) continue; // nothing to reconcile (informational)
    const delta = Math.abs(r2((f.billedAmount ?? 0) - (f.expectedAmount ?? 0)));
    // overcharge must equal the column delta at a real VAT factor (×1.00 or ×1.15).
    const reconciles =
      Math.abs(r2(delta * 1.0) - oc) <= TOL || Math.abs(r2(delta * 1.15) - oc) <= TOL;
    if (!reconciles) {
      fails.push({
        line: `${f.type} @ ${f.lineReference}`,
        expected: oc,
        actual: delta, // |billed − expected|
        delta: r2(delta - oc),
      });
    }
  }
  return { pass: fails.length === 0, fails };
}

// ── Run all bills once ────────────────────────────────────────────────────────

const results = new Map<string, BillResult>();

beforeAll(async () => {
  for (const file of BILL_FILES) {
    try {
      const raw = await parseBillFile(fs.readFileSync(path.join(BILLS_DIR, file)), 'application/pdf');
      const parsed = getParser('city-of-cape-town')!.parse(raw);
      if (!parsed) {
        results.set(file, { bill: file, parsed: null, error: 'parser returned null', c1: nullCheck(), c2: nullCheck(), c3: nullCheck(), c4: nullCheck(), c5: nullCheck() });
        continue;
      }
      const findings = await validateBill(parsed, 'CoCT');
      results.set(file, {
        bill: file,
        parsed,
        c1: check1(parsed),
        c2: check2(parsed),
        c3: check3(parsed),
        c4: check4(parsed, raw),
        c5: check5(findings),
      });
    } catch (e) {
      results.set(file, { bill: file, parsed: null, error: String(e), c1: nullCheck(), c2: nullCheck(), c3: nullCheck(), c4: nullCheck(), c5: nullCheck() });
    }
  }
}, 120_000);

function nullCheck(): CheckResult {
  return { pass: false, fails: [{ line: 'parse error', expected: 0, actual: 0, delta: 0 }] };
}

afterAll(() => {
  const pf = (c: CheckResult) => (c.pass ? 'PASS' : 'FAIL');
  const rows: string[] = [];
  rows.push('');
  rows.push('CoCT BILL RECONCILIATION — per-bill results');
  rows.push('(INJECTED bills: C2–C4 FAIL is EXPECTED = the injected error being detected)');
  rows.push('Bill                          | type        | C1 tiers | C2 sect | C3 total | C4 VAT | C5 finds');
  rows.push('------------------------------|-------------|----------|---------|----------|--------|---------');
  for (const file of BILL_FILES) {
    const r = results.get(file);
    if (!r) continue;
    const inj = INJECTED.get(file);
    const type = inj === undefined ? 'CLEAN' : `INJ R${inj}`;
    rows.push(
      `${file.padEnd(29)} | ${type.padEnd(11)} | ${pf(r.c1).padEnd(8)} | ${pf(r.c2).padEnd(7)} | ${pf(r.c3).padEnd(8)} | ${pf(r.c4).padEnd(6)} | ${pf(r.c5)}`
    );
  }
  // Failure detail
  const detail: string[] = [];
  for (const file of BILL_FILES) {
    const r = results.get(file);
    if (!r) continue;
    if (r.error) detail.push(`\n[${file}] ERROR: ${r.error}`);
    const checks: [string, CheckResult][] = [['Check1 tier-sum', r.c1], ['Check2 section-subtotal', r.c2], ['Check3 total-due', r.c3], ['Check4 VAT', r.c4], ['Check5 finding-columns', r.c5]];
    for (const [name, c] of checks) {
      for (const f of c.fails) {
        detail.push(`\n[${file}] ${name} FAIL:\n    line:     ${f.line}\n    expected: ${f.expected}\n    actual:   ${f.actual}\n    delta:    ${f.delta}`);
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(rows.join('\n') + (detail.length ? '\n\nFAILURE DETAIL:' + detail.join('\n') : '\n\nAll checks passed.'));
});

// ── Assertions ────────────────────────────────────────────────────────────────

describe('CoCT bill reconciliation (internal arithmetic consistency)', () => {
  it('found bills to test', () => {
    expect(BILL_FILES.length).toBeGreaterThan(0);
  });

  describe.each(BILL_FILES)('%s', (file) => {
    const detail = (c: CheckResult) => c.fails.map((f) => `${f.line}: expected ${f.expected}, actual ${f.actual} (delta ${f.delta})`).join(' | ');
    const injectedAmount = INJECTED.get(file);

    it('parses without error', () => {
      const r = results.get(file)!;
      expect(r.error, r.error).toBeUndefined();
      expect(r.parsed).not.toBeNull();
    });

    // Check 1 (parser tier integrity) is asserted on EVERY bill — clean or injected.
    // A tier-wrap parse regression turns this red regardless of injected status.
    it('Check 1 — multi-tier charges sum to their printed total', () => {
      const r = results.get(file)!;
      expect(r.c1.pass, detail(r.c1)).toBe(true);
    });

    if (injectedAmount === undefined) {
      // CLEAN bill (absent from the answer key): must reconcile on every check.
      it('Check 2 — section lines sum to section subtotal', () => {
        const r = results.get(file)!;
        expect(r.c2.pass, detail(r.c2)).toBe(true);
      });
      it('Check 3 — subtotals + VAT equal Total due', () => {
        const r = results.get(file)!;
        expect(r.c3.pass, detail(r.c3)).toBe(true);
      });
      it('Check 4 — printed VAT equals 15% of &-marked amounts', () => {
        const r = results.get(file)!;
        expect(r.c4.pass, detail(r.c4)).toBe(true);
      });
      it('Check 5 — recoverable findings have self-consistent columns', () => {
        const r = results.get(file)!;
        expect(r.c5.pass, detail(r.c5)).toBe(true);
      });
    } else {
      // INJECTED bill: the labelled error must still be DETECTED by a reconciliation check,
      // at approximately the keyed amount. (Checks 2–4 are EXPECTED to fail here — that
      // failure IS the detection.) If detection ever stops, this turns red.
      it(`detects the injected error (≈ R${injectedAmount}) via a reconciliation check`, () => {
        const r = results.get(file)!;
        const deltas = [r.c2, r.c3, r.c4].flatMap((c) => c.fails.map((f) => Math.abs(f.delta)));
        const detected = deltas.some((d) => Math.abs(d - injectedAmount) <= DETECT_TOL);
        expect(detected, `expected a reconciliation delta ≈ ${injectedAmount}; observed deltas [${deltas.join(', ')}]`).toBe(true);
      });
    }
  });
});
