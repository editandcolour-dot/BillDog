import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import Anthropic from '@anthropic-ai/sdk';
import { parseBillFile } from '../lib/pdf/parse';
import { getParser } from '../lib/parsers/registry';
import { validateBill } from '../lib/validators/bill-validator';

if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}

const execAsync = promisify(exec);
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const TEST_BILLS_DIR = process.env.TEST_BILLS_DIR || path.join(__dirname, '../tests');
const ANSWER_KEY_PATH = path.join(__dirname, 'answer-key.json');

async function runValidator(dir: string) {
  const results = [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
  
  if (files.length === 0) {
     console.log('WARNING: No PDF files found in ' + dir);
  }

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(dir, file));
    try {
      const text = await parseBillFile(buffer, 'application/pdf');
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      if (parsed) {
        const findings = await validateBill(parsed, 'CoCT');
        results.push({ invoiceNumber: parsed.invoiceNumber, findings });
      }
    } catch (e) {
      console.log(`Failed to parse ${file}: ${e}`);
    }
  }
  return results;
}

function scoreAgainstAnswerKey(results: any[], answerKey: any[]) {
   let truePositives = 0;
   let falsePositives = 0;
   let truePositiveList: string[] = [];
   const remainingAnswers = [...answerKey];
   
   for (const res of results) {
       for (const finding of res.findings) {
           const matchIndex = remainingAnswers.findIndex(a => 
               a.invoiceNumber === res.invoiceNumber && 
               a.errorType === finding.type && 
               Math.abs(Math.abs(a.overchargeZar) - (finding.overchargeZar ?? 0)) <= a.tolerance
           );
           
           if (matchIndex !== -1) {
               truePositives++;
               truePositiveList.push(`${res.invoiceNumber} - ${finding.type}`);
               remainingAnswers.splice(matchIndex, 1);
           } else {
               falsePositives++;
           }
       }
   }
   
   return { truePositives, falsePositives, expected: answerKey.length, remainingAnswers, results };
}

function printScorecard(score: any) {
  console.log(`SCORE: ${score.truePositives}/${score.expected} True Positives | ${score.falsePositives} False Positives`);
}

function diagnose(score: any, results: any[]) {
    if (score.results.length === 0) {
        return "CRITICAL DIAGNOSIS: No test bills (.pdf) were loaded from TEST_BILLS_DIR. Cannot evaluate.";
    }

    if (score.falsePositives > 0) {
        return "false_positives > 0: A clean bill is being flagged incorrectly. Root cause is always in the parser. Trace the first false positive bill and fix misextracted field.";
    }
    
    if (score.truePositives < score.expected && score.falsePositives === 0) {
        const missed = score.remainingAnswers[0];
        return `true_positives < 12: A real error is being missed. Root cause is fallback chain or validator not firing. Missed: Invoice ${missed.invoiceNumber}, type ${missed.errorType}. Trace why validator didn't fire.`;
    }
    
    return "UNKNOWN_DIAGNOSIS";
}

async function tryCompileAndTest(fileToFix: string): Promise<string | null> {
    try {
        await execAsync('npx tsc --noEmit');
    } catch (e: any) {
        return `Compilation Failed on ${fileToFix}:\n${e.stdout}\n${e.stderr}`;
    }
    
    try {
        await execAsync('npx vitest run');
    } catch (e: any) {
        return `Vitest Failed:\n${e.stdout}\n${e.stderr}`;
    }
    
    return null; // success
}

async function writeFix(diagnosis: string) {
    if (diagnosis.includes("CRITICAL DIAGNOSIS")) {
        console.log("Aborting writeFix - no payload bills.");
        return;
    }
    
    const isParserFix = diagnosis.includes('parser');
    const targetFile = isParserFix ? '../lib/parsers/coct-bill-parser.ts' : '../lib/validators/bill-validator.ts';
    const absoluteTarget = path.join(__dirname, targetFile);
    
    let currentCode = fs.readFileSync(absoluteTarget, 'utf-8');
    
    let attempts = 0;
    while (attempts < 3) {
        attempts++;
        console.log(`\nAttempting Anthropic generation for ${targetFile} (Attempt ${attempts}/3)...`);
        
        let prompt = `You are an automated code fixing agent. Modify the following Typescript file to address this exact diagnosis: ${diagnosis}\n\nConstraints:\n1. ONLY return the complete raw file contents in your response without markdown wrappers (do not use \`\`\`typescript).\n2. Preserve all existing exports.\n\n### Current File:\n${currentCode}`;

        let responseText = '';
        try {
            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 8192,
                system: 'You return ONLY raw typescript source code strings. Do not emit markdown block wrappers.',
                messages: [{ role: 'user', content: prompt }]
            });
            if (response.content[0].type === 'text') {
                responseText = response.content[0].text;
            }
        } catch (e) {
            console.log(`[Anthropic Error]: ${e}`);
            break;
        }

        // Clean markdown if accidentally leaked
        responseText = responseText.replace(/^```typescript\n?/i, '').replace(/```$/g, '').trim();

        fs.writeFileSync(absoluteTarget, responseText, 'utf-8');
        
        console.log(`Running health checks...`);
        const errorReport = await tryCompileAndTest(targetFile);
        
        if (!errorReport) {
            console.log(`Fix deployed cleanly! Tests green.`);
            return; // Successful branch!
        } else {
            console.log(`Health check failed. Restoring file.`);
            fs.writeFileSync(absoluteTarget, currentCode, 'utf-8');
            currentCode = currentCode; // Keep original as baseline
            
            console.log(`Attempting correction with error context...`);
            prompt += `\n\nYour previous attempt failed with the following traceback:\n${errorReport}\n\nTry again and FIX the compile/test issue. RETURN ONLY RAW TYPESCRIPT.`;
        }
    }
    
    console.log(`Failed to produce a compiling fix after 3 attempts.`);
}

async function main() {
  const MAX_ITERATIONS = 10;
  
  if (!process.env.ANTHROPIC_API_KEY) {
      console.error("Missing ANTHROPIC_API_KEY environment variable. Cannot boot orchestration.");
      process.exit(1);
  }

  const answerKeyRaw = fs.readFileSync(ANSWER_KEY_PATH, 'utf-8');
  const ANSWER_KEY = JSON.parse(answerKeyRaw);

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    console.log(`\n=== ITERATION ${i} ===`);
    
    // 1. Run validator against all 36 test bills
    const results = await runValidator(TEST_BILLS_DIR);
    
    // 2. Score against answer key
    const score = scoreAgainstAnswerKey(results, ANSWER_KEY);
    
    // 3. Print scorecard
    printScorecard(score);
    
    // 4. Exit condition
    if (score.truePositives === 12 && score.falsePositives === 0) {
      console.log('PASS — 12/12, 0 false positives. Loop complete.');
      process.exit(0);
    }
    
    // 5. Diagnose and write fix
    const diagnosis = diagnose(score, results);
    console.log('ROOT CAUSE:', diagnosis);
    await writeFix(diagnosis);
    
  }
  
  console.log('FAILED — 10 iterations without passing. Manual review needed.');
  process.exit(1);
}

main().catch(console.error);
