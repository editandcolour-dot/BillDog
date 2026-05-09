/**
 * Production path end-to-end test for ISU108012156854.
 * Exercises the EXACT same code path as /api/analyse:
 *   parseBillFile → parseCoctBill → validateBill → analyseBill (Ground Truth override)
 * 
 * This proves findings survive the full pipeline.
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseBillFile } from '../pdf/parse';
import { getParser } from '../parsers/registry';
import { validateBill } from '../validators/bill-validator';

// Mock Claude client so we don't need a real API key
vi.mock('../claude/client', () => ({
  getClaudeClient: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            errors: [],
            total_billed: 0,
            total_recoverable: 0,
            confidence: 'high',
            bill_period: 'Test',
            municipality_detected: 'City of Cape Town',
            summary: 'Test summary'
          })
        }],
        usage: { input_tokens: 100, output_tokens: 100 }
      })
    }
  })
}));

const BILLS_DIR = path.join(__dirname, '../../tests/bills');

describe('Production pipeline E2E — ISU108012156854 (R200 rates error)', () => {
  it('findings survive parser → validator → analyseBill', async () => {
    const { analyseBill } = await import('../claude/analyse-bill');
    
    // Step 1: Parse PDF (same as API route step 7)
    const buffer = fs.readFileSync(path.join(BILLS_DIR, 'ISU108012156854.pdf'));
    const extractedText = await parseBillFile(buffer, 'application/pdf');
    console.log(`\n[E2E] Step 1 — PDF parsed. Text length: ${extractedText.length}`);

    // Step 2: Deterministic parser (same as analyseBill step 1)
    const parser = getParser('city-of-cape-town');
    const parsedBill = parser?.parse(extractedText);
    expect(parsedBill).not.toBeNull();
    console.log(`[E2E] Step 2 — Parser output: totalDue=${parsedBill!.totalDue}, rates=${parsedBill!.rates.length}, subtotals=${parsedBill!.sectionSubtotals.length}`);

    // Step 3: Validator (same as analyseBill step 2)
    const findings = await validateBill(parsedBill!, 'CoCT');
    console.log(`[E2E] Step 3 — Validator output: ${findings.length} findings`);
    findings.forEach((f, i) => console.log(`  [${i}] ${f.type}: "${f.description}" billed=${f.billedAmount} expected=${f.expectedAmount} disc=${f.overchargeZar}`));
    expect(findings.length).toBeGreaterThan(0);

    // Step 4: Full analyseBill (same as API route /api/analyse)
    const analysis = await analyseBill(extractedText, 'CoCT');
    console.log(`[E2E] Step 4 — analyseBill output: ${analysis.errors.length} errors, recoverable=${analysis.total_recoverable}`);
    analysis.errors.forEach((e, i) => console.log(`  [${i}] ${e.service_type}: "${e.issue}" charged=${e.amount_charged} expected=${e.expected_amount}`));
    
    // THE CRITICAL ASSERTION: findings must survive the full pipeline
    expect(analysis.errors.length).toBeGreaterThan(0);
    expect(analysis.errors.length).toBe(findings.length);
    expect(analysis._meta?.groundTruth).toBe(true);
    expect(analysis._meta?.findingsCount).toBe(findings.length);
    
    console.log(`\n[E2E] ✅ PRODUCTION PATH VERIFIED — ${analysis.errors.length} findings survived the full pipeline.`);
  });
  
  it('all 12 error bills produce findings in production path', async () => {
    const { analyseBill } = await import('../claude/analyse-bill');
    
    // All 12 bills that should have injected errors
    const errorBills = [
      'ISU106006147353.pdf',
      'ISU108012156854.pdf',
      'ISU109011686920.pdf',
      'ISU109012042310.pdf',
      'ISU140009995549.pdf',
      'ISU190010157842.pdf',
      'ISU201010924705.pdf',
      'ISU201011483082.pdf',
      'ISU202011208647.pdf',
      'ISU220009857915.pdf',
      'ISU240009029749.pdf',
      'ISU260009230832.pdf',
    ];
    
    const results: { file: string; findings: number; errors: number }[] = [];
    
    for (const file of errorBills) {
      const buffer = fs.readFileSync(path.join(BILLS_DIR, file));
      const text = await parseBillFile(buffer, 'application/pdf');
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      if (!parsed) { results.push({ file, findings: -1, errors: -1 }); continue; }
      
      const findings = await validateBill(parsed, 'CoCT');
      const analysis = await analyseBill(text, 'CoCT');
      
      results.push({ file, findings: findings.length, errors: analysis.errors.length });
      
      if (analysis.errors.length === 0) {
        console.error(`[E2E FAIL] ${file}: validator found ${findings.length} findings but analyseBill returned 0 errors!`);
      }
    }
    
    console.log('\n[E2E] Production Pipeline Scorecard:');
    console.table(results);
    
    const allHaveErrors = results.every(r => r.errors > 0);
    expect(allHaveErrors).toBe(true);
  });
});
