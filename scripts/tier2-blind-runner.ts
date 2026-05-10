/**
 * Tier 2 Blind Runner — processes all T2 bills through Billdog's full pipeline
 * and outputs raw findings with no scoring or filtering.
 */
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

// Fallbacks
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key_for_testing';

import { parseBillFile } from '../lib/pdf/parse';
import { getParser } from '../lib/parsers/registry';
import { validateBill } from '../lib/validators/bill-validator';
import { analyseBill } from '../lib/claude/analyse-bill';

const TIER2_DIR = path.join(__dirname, '../tests/corpus/v5/billdog-tier2-bills/tier2_series');
const OUTPUT_PATH = path.join(__dirname, 'tier2-raw-output.json');

interface BillResult {
  bill_id: string;
  filename: string;
  parse_success: boolean;
  parse_errors: string[];
  parsed_bill_summary: {
    invoiceNumber: string;
    billingDate: string;
    totalDue: number;
    subtotals: Record<string, number>;
    waterReadingStatus?: string;
    sewerageReadingStatus?: string;
    previousBalance?: number;
    paymentsReceived?: number;
    canonicalWaterConsumptionKl: number;
    ratesSegments: number;
    waterTierCharges: number;
    sewerageCharges: number;
    refuseCharges: number;
    hucCharges: number;
    sundryCharges: number;
    waterFixedCharges: number;
    meterReadings: number;
  } | null;
  validator_findings: any[];
  analysis_errors: any[];
  analysis_summary: string | null;
  total_recoverable: number;
}

async function main() {
  console.log('--- Tier 2 Blind Runner ---');
  
  const files = fs.readdirSync(TIER2_DIR)
    .filter(f => f.endsWith('.pdf'))
    .sort();
  
  console.log(`Found ${files.length} Tier 2 bills.`);
  
  const results: BillResult[] = [];
  
  for (const filename of files) {
    const billId = filename.replace('.pdf', '');
    console.log(`\n[${billId}] Processing...`);
    
    const pdfPath = path.join(TIER2_DIR, filename);
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    const result: BillResult = {
      bill_id: billId,
      filename,
      parse_success: false,
      parse_errors: [],
      parsed_bill_summary: null,
      validator_findings: [],
      analysis_errors: [],
      analysis_summary: null,
      total_recoverable: 0
    };
    
    // Step 1: Parse PDF to text
    let billText = '';
    try {
      billText = await parseBillFile(pdfBuffer, 'application/pdf');
    } catch (err: any) {
      result.parse_errors.push(`PDF text extraction failed: ${err.message}`);
      results.push(result);
      continue;
    }
    
    // Step 2: Parse text to structured bill
    let parsedBill: any = null;
    try {
      const parser = getParser('CoCT');
      parsedBill = parser.parse(billText);
      result.parse_success = true;
      result.parsed_bill_summary = {
        invoiceNumber: parsedBill.invoiceNumber,
        billingDate: parsedBill.billingDate,
        totalDue: parsedBill.totalDue,
        subtotals: parsedBill.subtotals,
        waterReadingStatus: parsedBill.waterReadingStatus,
        sewerageReadingStatus: parsedBill.sewerageReadingStatus,
        previousBalance: parsedBill.previousBalance,
        paymentsReceived: parsedBill.paymentsReceived,
        canonicalWaterConsumptionKl: parsedBill.canonicalWaterConsumptionKl,
        ratesSegments: (parsedBill.rates || []).length,
        waterTierCharges: (parsedBill.waterTierCharges || []).length,
        sewerageCharges: (parsedBill.sewerageCharges || []).length,
        refuseCharges: (parsedBill.refuseCharges || []).length,
        hucCharges: (parsedBill.hucCharges || []).length,
        sundryCharges: (parsedBill.sundryCharges || []).length,
        waterFixedCharges: (parsedBill.waterFixedCharges || []).length,
        meterReadings: (parsedBill.meterReadings || []).length,
      };
    } catch (err: any) {
      result.parse_errors.push(`Structured parsing failed: ${err.message}`);
      results.push(result);
      continue;
    }
    
    // Step 3: Run validator
    try {
      const findings = await validateBill(parsedBill, 'CoCT');
      result.validator_findings = findings.map(f => ({
        type: f.type,
        description: f.description,
        billedAmount: f.billedAmount,
        expectedAmount: f.expectedAmount,
        overchargeZar: f.overchargeZar,
        lineReference: f.lineReference,
        recoverable: f.recoverable,
        invoiceNumber: f.invoiceNumber,
        billingDate: f.billingDate,
      }));
    } catch (err: any) {
      result.parse_errors.push(`Validator failed: ${err.message}`);
    }
    
    // Step 4: Run full analysis pipeline
    try {
      const analysis = await analyseBill(billText, 'CoCT');
      result.analysis_errors = analysis.errors.map(e => ({
        finding_type: e.finding_type,
        line_item: e.line_item,
        service_type: e.service_type,
        amount_charged: e.amount_charged,
        expected_amount: e.expected_amount,
        overchargeZar: e.overchargeZar,
        issue: e.issue,
        legal_basis: e.legal_basis,
        recoverable: e.recoverable,
      }));
      result.analysis_summary = analysis.summary;
      result.total_recoverable = analysis.total_recoverable;
    } catch (err: any) {
      result.parse_errors.push(`Analysis pipeline failed: ${err.message}`);
    }
    
    console.log(`[${billId}] Findings: ${result.validator_findings.length}, Analysis errors: ${result.analysis_errors.length}, Recoverable: R${result.total_recoverable.toFixed(2)}`);
    results.push(result);
  }
  
  // Output
  const output = {
    runner: 'tier2-blind-runner',
    timestamp: new Date().toISOString(),
    series_analysis_applied: false,
    series_analysis_note: 'No multi-bill series analysis exists. Each bill processed independently.',
    total_bills: results.length,
    bills_with_findings: results.filter(r => r.analysis_errors.length > 0).length,
    bills_clean: results.filter(r => r.analysis_errors.length === 0).length,
    results
  };
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\n=======================================`);
  console.log(`TIER 2 BLIND RUN COMPLETE`);
  console.log(`=======================================`);
  console.log(`Total: ${output.total_bills}`);
  console.log(`With findings: ${output.bills_with_findings}`);
  console.log(`Clean: ${output.bills_clean}`);
  console.log(`Series analysis: NOT APPLIED (single-bill only)`);
  console.log(`Output saved to: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
