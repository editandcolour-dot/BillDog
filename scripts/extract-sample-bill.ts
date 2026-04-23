import fs from 'fs';
import path from 'path';
import { parseBillFile } from '../lib/pdf/parse';

async function main() {
  const dir = path.join(__dirname, '../tests/bills');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).slice(0, 2);
  
  for (const file of files) {
    const buffer = fs.readFileSync(path.join(dir, file));
    const text = await parseBillFile(buffer, 'application/pdf');
    const outPath = path.join(__dirname, '../.tmp', `sample_${file.replace('.pdf', '.txt')}`);
    fs.writeFileSync(outPath, text);
    console.log(`Extracted ${file} → ${text.length} chars → ${outPath}`);
  }
}

main().catch(console.error);
