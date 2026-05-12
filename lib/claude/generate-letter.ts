/**
 * Dispute Letter Generator — Deterministic Template + Claude Summary
 *
 * Architecture:
 *   - Claude writes ONLY the summaryParagraph (2–3 sentences of human-readable context).
 *   - buildSection102Letter() handles all amounts, citations, legal text deterministically.
 *   - buildVerificationBlock() is prepended for account-holder auth.
 *
 * Model: claude-sonnet-4-20250514 (non-negotiable)
 * Output: plain text only — no markdown, no HTML
 *
 * Multi-bill letters remain Claude-generated end-to-end. Acceptable for now because:
 *   (a) multi-bill is a more sophisticated dispute requiring narrative analysis the
 *       template can't yet express;
 *   (b) zero multi-bill users in pipeline;
 *   (c) when first multi-bill user lands, rewrite as section-102-multibill-template.ts
 *       with same deterministic discipline. Snapshot-test before that ships.
 */

import { getClaudeClient } from './client';
import { buildVerificationBlock, VerificationBlockInput } from '@/lib/letters/verification-block';
import { buildSection102Letter, Section102LetterInput } from '@/lib/letters/section-102-template';
import type { BillingError } from '@/types/analysis';

const MODEL = 'claude-sonnet-4-20250514';
const LETTER_TIMEOUT_MS = 60_000;

// ── Summary-Only Prompt ─────────────────────────────────────────────────────
// Claude writes a 2–3 sentence summary. No legal language, no amounts,
// no citations. Just plain English context for the reader.

const SUMMARY_SYSTEM_PROMPT = `You are writing a brief introductory paragraph for a formal municipal billing dispute letter in South Africa.

Write 2-3 sentences of plain English context explaining what the billing errors are about.
Do NOT include any Rand amounts, legal citations, section numbers, or case law references.
Do NOT repeat the error details — those are handled elsewhere in the letter.
Do NOT include dates, account numbers, or addresses.

Your paragraph should help a non-technical reader understand what went wrong with their bill.
Be clear, concise, and empathetic. One short paragraph only.`;

// ── Multi-Bill Prompt (kept for legacy Claude-generated path) ───────────────

const MULTI_BILL_LETTER_PROMPT = `You are a formal letter writer specialising in South African municipal billing disputes.
Write a formal dispute letter based on the provided cross-bill analysis, identifying patterns of overcharging across multiple months.

The letter must be plain text only.
No markdown. No HTML. No formatting symbols. No asterisks. No bullet points with dashes.
Professional, firm, and legally precise tone.

The letter must follow this exact structure:
1. Date (top right, format: DD Month YYYY)
2. Sender details (name, address, account number)
3. Recipient: The Municipal Manager, [municipality]
4. Subject line: FORMAL DISPUTE — Account [number] — Multiple Billing Periods
5. Opening paragraph citing Section 102 right to dispute and stating the number of months disputed
6. Summary of findings (pattern description, total amount)
7. Itemised breakdown of recurring errors by service type with affected months
8. Legal basis (cite specific SA legislation per error type)
9. Section 102(2) paragraph — state that services may not be disconnected during investigation
10. Response deadline paragraph (30 calendar days)
11. Closing and signature block

If there is a prescription warning (at-risk amount), you MUST include a paragraph demanding immediate resolution to prevent the claim from prescribing under the Prescription Act 68 of 1969.

Never be aggressive or emotional. Be firm, professional, and legally precise.
The consumer must continue paying the undisputed portion.`;


// ── Types ───────────────────────────────────────────────────────────────────

export interface LetterInput {
  accountHolder: string;
  address: string;
  accountNumber: string;
  municipality: string;
  billPeriod: string;
  billingDate: string;
  totalBilled: number;
  verification: VerificationBlockInput;
  errors: BillingError[];
  prescribedExclusions: string[];
  legislationContext: string;
  /** Municipality-specific bylaw citation (from dispute_procedure JSONB) */
  bylawCitation?: string;
  /** Municipality-specific lodgement address */
  lodgementAddress?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  crossAnalysis?: any;
  billCount?: number;
}

export interface LetterResult {
  letterContent: string;
  _meta: {
    model: string;
    tokensUsed: number;
    durationMs: number;
  };
}

// ── Single-Bill Letter (Deterministic Template) ─────────────────────────────

async function generateSingleBillLetter(input: LetterInput): Promise<LetterResult> {
  const client = getClaudeClient();
  const startTime = Date.now();

  // Step 1: Ask Claude for a summary paragraph only
  const errorSummaryForClaude = input.errors
    .filter((e) => e.recoverable)
    .map((e) => `${e.service_type}: ${e.issue}`)
    .join('; ');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LETTER_TIMEOUT_MS);

  let summaryParagraph = '';
  let tokensUsed = 0;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Municipality: ${input.municipality}\nBill period: ${input.billPeriod}\nErrors found: ${errorSummaryForClaude}`,
      }],
    });

    clearTimeout(timeout);
    tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    if (response.content.length > 0 && response.content[0].type === 'text') {
      summaryParagraph = response.content[0].text.trim();
    }
  } catch (error) {
    clearTimeout(timeout);
    // If Claude fails, the letter still works — summary is optional
    console.warn('[generate-letter] Claude summary failed, proceeding without:', error);
    summaryParagraph = '';
  }

  const duration = Date.now() - startTime;

  // Step 2: Build deterministic letter body
  const templateInput: Section102LetterInput = {
    accountHolder: input.accountHolder,
    idNumber: input.verification.idNumber,
    accountNumber: input.accountNumber,
    propertyAddress: input.address,
    municipalityName: input.municipality,
    billPeriod: input.billPeriod,
    billingDate: input.billingDate,
    totalBilled: input.totalBilled,
    summaryParagraph,
    errors: input.errors,
    bylawCitation: input.bylawCitation,
    lodgementAddress: input.lodgementAddress,
  };

  const letterBody = buildSection102Letter(templateInput);

  // Step 3: Prepend verification block
  const letterContent = buildVerificationBlock(input.verification) + '\n\n' + letterBody;

  return {
    letterContent,
    _meta: {
      model: MODEL,
      tokensUsed,
      durationMs: duration,
    },
  };
}

// ── Multi-Bill Letter (Legacy Claude-Generated) ─────────────────────────────

async function generateMultiBillLetter(input: LetterInput): Promise<LetterResult> {
  const client = getClaudeClient();
  const startTime = Date.now();

  const excludedText = input.prescribedExclusions.length > 0
    ? `\n\nExcluded items (prescribed — outside 3-year dispute window):\n${input.prescribedExclusions.join('\n')}`
    : '\n\nNo items were excluded due to prescription.';

  const multiBillText = `\n\nCross-bill analysis (${input.billCount} months):
Pattern Type: ${input.crossAnalysis.pattern_type}
Total Recoverable: ${input.crossAnalysis.total_recoverable_all}
Trend Summary: ${input.crossAnalysis.trend_summary}
Strongest Arguments: ${input.crossAnalysis.strongest_arguments.join('; ')}
Prescription Risk Amount: ${input.crossAnalysis.prescription_risk.at_risk_amount}
At-risk Periods: ${input.crossAnalysis.prescription_risk.at_risk_periods.join(', ')}`;

  const userPrompt = `Account holder: ${input.accountHolder}
Address: ${input.address}
Account number: ${input.accountNumber}
Municipality: ${input.municipality}
Bill period: ${input.billPeriod}

Disputed errors:
${JSON.stringify(input.errors, null, 2)}
${multiBillText}

Relevant legislation:
${input.legislationContext}
${excludedText}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LETTER_TIMEOUT_MS);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: MULTI_BILL_LETTER_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    clearTimeout(timeout);
    const duration = Date.now() - startTime;

    if (response.content.length === 0 || response.content[0].type !== 'text') {
      throw new Error('Empty or non-text Claude response for multi-bill letter generation');
    }

    const claudeOutput = response.content[0].text.trim();
    const letterContent = buildVerificationBlock(input.verification) + '\n\n' + claudeOutput;

    return {
      letterContent,
      _meta: {
        model: MODEL,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        durationMs: duration,
      },
    };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      const e = new Error('Letter generation timed out. Please try again.');
      e.name = 'CLAUDE_TIMEOUT';
      throw e;
    }
    throw error;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function generateDisputeLetter(input: LetterInput): Promise<LetterResult> {
  const isMultiBill = (input.billCount || 1) > 1 && input.crossAnalysis;

  if (isMultiBill) {
    return generateMultiBillLetter(input);
  }

  return generateSingleBillLetter(input);
}
