import fs from 'fs';
import path from 'path';

// Manual env load
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
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key_for_testing';

import { parseBillFile } from '../lib/pdf/parse';
import { getParser } from '../lib/parsers/registry';

const CORPUS_DIR = path.join(__dirname, '../tests/corpus/v5/billdog-test-corpus-v5/tier1_single_bill');
const billIds = process.argv.slice(2);

async function main() {
  for (const billId of billIds) {
    const pdfPath = path.join(CORPUS_DIR, `${billId}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      console.error(`PDF not found: ${pdfPath}`);
      continue;
    }
    const buf = fs.readFileSync(pdfPath);
    const text = await parseBillFile(buf, 'application/pdf');
    const parser = getParser('city-of-cape-town');
    const bill = parser.parse(text);

    console.log(`\n========= ${billId} PARSED BILL =========`);
    console.log('--- RAW TEXT (first 2000 chars) ---');
    console.log(text.substring(0, 2000));
    console.log('\n--- sundryCharges ---');
    console.log(JSON.stringify(bill.sundryCharges, null, 2));
    console.log('\n--- otherCharges ---');
    console.log(JSON.stringify(bill.otherCharges, null, 2));
    console.log('\n--- parser_anomalies ---');
    console.log(JSON.stringify(bill.parser_anomalies, null, 2));
    console.log('\n--- rates ---');
    console.log(JSON.stringify(bill.rates, null, 2));
    console.log('\n--- waterTierCharges ---');
    console.log(JSON.stringify(bill.waterTierCharges, null, 2));
    console.log('\n--- waterFixedCharges ---');
    console.log(JSON.stringify(bill.waterFixedCharges, null, 2));
    console.log('\n--- sewerageCharges ---');
    console.log(JSON.stringify(bill.sewerageCharges, null, 2));
    console.log('\n--- refuseCharges ---');
    console.log(JSON.stringify(bill.refuseCharges, null, 2));
    console.log('\n--- hucCharges ---');
    console.log(JSON.stringify(bill.hucCharges, null, 2));
    console.log('\n--- subtotals ---');
    console.log(JSON.stringify(bill.subtotals, null, 2));
    console.log('\n--- totalDue ---');
    console.log(bill.totalDue);
    console.log('\n--- billingDate ---');
    console.log(bill.billingDate);
    console.log('\n--- invoiceNumber ---');
    console.log(bill.invoiceNumber);
  }
}

main().catch(console.error);
