import fs from 'fs';
import path from 'path';

// Manual quick-load for .env and .env.local
for (const envFile of ['.env', '.env.local']) {
  const envPath = path.join(__dirname, '..', envFile);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#\s][^=]*)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

// Fallbacks if not in env
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key_for_testing';

import { parseBillFile } from '../lib/pdf/parse';
import { getParser } from '../lib/parsers/registry';
import { analyseBill } from '../lib/claude/analyse-bill';
import { BillingError } from '../types/analysis';

const CORPUS_DIR = path.join(__dirname, '../tests/corpus/v5/billdog-test-corpus-v5');
const ANSWER_KEY_PATH = path.join(CORPUS_DIR, 'answer_key.json');
const TIER1_DIR = path.join(CORPUS_DIR, 'tier1_single_bill');

interface ExpectedFinding {
  error_type: string;
  type?: string; // Optional: maps to BillingError.finding_type for precise matching
  expected_recoverable: number;
}

interface AnswerKeyBill {
  bill_id: string;
  tier: number;
  category: 'error' | 'clean';
  pdf_filename: string;
  expected_findings: ExpectedFinding[];
  known_detection_gap?: boolean;
}

interface AnswerKey {
  bills: AnswerKeyBill[];
}

async function main() {
  console.log('--- Billdog Local Test Runner ---');
  const answerKey: AnswerKey = JSON.parse(fs.readFileSync(ANSWER_KEY_PATH, 'utf-8'));
  const tier1Bills = answerKey.bills.filter(b => b.tier === 1);

  console.log(`Loaded ${tier1Bills.length} Tier 1 bills from answer key.`);

  const results = {
    total_bills: tier1Bills.length,
    passed_bills: 0,
    failed_bills: 0,
    detection_by_error_type: {} as Record<string, { total: number; detected: number }>,
    false_positives: 0,
    mismatches: [] as any[]
  };

  for (const expectedBill of tier1Bills) {
    const pdfPath = path.join(TIER1_DIR, expectedBill.pdf_filename);
    if (!fs.existsSync(pdfPath)) {
      console.warn(`[WARN] PDF not found: ${pdfPath}`);
      continue;
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    let billText = '';
    try {
      billText = await parseBillFile(pdfBuffer, 'application/pdf');
    } catch (err) {
      console.error(`[ERROR] Failed to extract text for ${expectedBill.pdf_filename}`, err);
      continue;
    }

    let analysisErrors: BillingError[] = [];
    try {
      const analysis = await analyseBill(billText, 'CoCT');
      analysisErrors = analysis.errors;
    } catch (err) {
      console.error(`[ERROR] analyseBill failed for ${expectedBill.pdf_filename}`, err);
    }

    let billPassed = true;
    const unmatchedBilldogErrors = [...analysisErrors];
    const billMismatches: any[] = [];

    // Tally up expected error types
    for (const exp of expectedBill.expected_findings) {
      if (!results.detection_by_error_type[exp.error_type]) {
        results.detection_by_error_type[exp.error_type] = { total: 0, detected: 0 };
      }
      results.detection_by_error_type[exp.error_type].total++;
    }

    if (expectedBill.category === 'clean') {
      if (analysisErrors.length > 0) {
        billPassed = false;
        results.false_positives += analysisErrors.length;
        billMismatches.push({
          type: 'FALSE_POSITIVE',
          expected: '0 errors',
          actual: `${analysisErrors.length} errors`,
          details: analysisErrors
        });
      }
    } else {
      // Error bill
      for (const expected of expectedBill.expected_findings) {
        // Try to match this expected finding against Billdog's output
        // Match on (type, overchargeZar) tuple when type is available,
        // falling back to overchargeZar-only match for backward compatibility.
        const matchIndex = unmatchedBilldogErrors.findIndex(e => {
           const bdogRecoverable = e.overchargeZar || 0;
           const amountMatch = Math.abs(bdogRecoverable - (expected.expected_recoverable || 0)) <= 1.0;
           if (!amountMatch) return false;
           // If expected has a type field, require finding_type to match
           if (expected.type && e.finding_type) {
             return expected.type === e.finding_type;
           }
           return true;
        });

        if (matchIndex !== -1) {
          // Found a match
          unmatchedBilldogErrors.splice(matchIndex, 1);
          results.detection_by_error_type[expected.error_type].detected++;
        } else {
          // Failed to detect
          if (expectedBill.known_detection_gap) {
             // Expected to fail detection, so do not fail the bill
          } else {
             billPassed = false;
             billMismatches.push({
               type: 'FALSE_NEGATIVE',
               expected_finding: expected,
               actual_billdog_errors: analysisErrors
             });
          }
        }
      }

      // Any left over errors in an error bill are technically false positives
      if (unmatchedBilldogErrors.length > 0) {
         billPassed = false;
         results.false_positives += unmatchedBilldogErrors.length;
         billMismatches.push({
           type: 'FALSE_POSITIVE_ON_ERROR_BILL',
           unexpected_errors: unmatchedBilldogErrors
         });
      }
    }

    if (billPassed) {
      results.passed_bills++;
    } else {
      results.failed_bills++;
      results.mismatches.push({
        bill_id: expectedBill.bill_id,
        filename: expectedBill.pdf_filename,
        category: expectedBill.category,
        issues: billMismatches
      });
    }
  }

  // Calculate rates
  console.log('\n=======================================');
  console.log('T1 CORPUS TEST RESULTS');
  console.log('=======================================');
  console.log(`Total Bills: ${results.total_bills}`);
  console.log(`Passed: ${results.passed_bills}`);
  console.log(`Failed: ${results.failed_bills}`);
  console.log(`Pass Rate: ${((results.passed_bills / results.total_bills) * 100).toFixed(1)}%`);
  
  console.log('\n--- Detection Rate by Error Type ---');
  for (const [type, stats] of Object.entries(results.detection_by_error_type)) {
    const rate = ((stats.detected / stats.total) * 100).toFixed(1);
    console.log(`${type}: ${stats.detected}/${stats.total} (${rate}%)`);
  }

  console.log(`\n--- False Positives ---`);
  console.log(`Total FP Findings: ${results.false_positives}`);

  if (results.mismatches.length > 0) {
    console.log('\n--- MISMATCH DETAILS ---');
    console.log(JSON.stringify(results.mismatches, null, 2));
  }

  const outPath = path.join(__dirname, 'corpus-test-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to ${outPath}`);
}

main().catch(console.error);
