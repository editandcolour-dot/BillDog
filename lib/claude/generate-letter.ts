/**
 * Claude-powered dispute letter generator for Billdog.
 *
 * Generates formal Section 102 dispute letters based on
 * billing errors identified in Phase 5 analysis.
 *
 * Model: claude-sonnet-4-20250514 (non-negotiable)
 * Output: plain text only — no markdown, no HTML
 */

import { getClaudeClient } from './client';

const MODEL = 'claude-sonnet-4-20250514';
const LETTER_TIMEOUT_MS = 60_000;

const LETTER_SYSTEM_PROMPT = `You are a formal letter writer specialising in South African municipal billing disputes.
Write a formal dispute letter based on the provided billing errors and legislation.

The letter must be plain text only.
No markdown. No HTML. No formatting symbols. No asterisks. No bullet points with dashes.
Professional, firm, and legally precise tone.

The letter must follow this exact structure:
1. Date (top right, format: DD Month YYYY)
2. Sender details (name, address, account number)
3. Recipient: The Municipal Manager, [municipality]
4. Subject line: FORMAL DISPUTE — Account [number]
5. Opening paragraph citing Section 102 right to dispute
6. One paragraph per disputed item:
   - State the line item and amount charged
   - State why it is incorrect
   - Cite the specific legal basis
   - State what resolution is requested
7. Section 102(2) paragraph — state that services may not be disconnected during investigation
8. Response deadline paragraph (30 calendar days)
9. Closing and signature block

Never be aggressive or emotional. Be firm, professional, and legally precise.
The consumer must continue paying the undisputed portion.`;

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


export interface LetterInput {
  accountHolder: string;
  address: string;
  accountNumber: string;
  municipality: string;
  billPeriod: string;
  errors: Array<{
    line_item: string;
    service_type: string;
    amount_charged: number;
    expected_amount: number;
    issue: string;
    legal_basis: string;
    recoverable: boolean;
  }>;
  prescribedExclusions: string[];
  legislationContext: string;
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

export async function generateDisputeLetter(input: LetterInput): Promise<LetterResult> {
  const client = getClaudeClient();

  const excludedText = input.prescribedExclusions.length > 0
    ? `\n\nExcluded items (prescribed — outside 3-year dispute window):\n${input.prescribedExclusions.join('\n')}`
    : '\n\nNo items were excluded due to prescription.';

  const isMultiBill = (input.billCount || 1) > 1 && input.crossAnalysis;

  const multiBillText = isMultiBill
    ? `\n\nCross-bill analysis (${input.billCount} months):
Pattern Type: ${input.crossAnalysis.pattern_type}
Total Recoverable: ${input.crossAnalysis.total_recoverable_all}
Trend Summary: ${input.crossAnalysis.trend_summary}
Strongest Arguments: ${input.crossAnalysis.strongest_arguments.join('; ')}
Prescription Risk Amount: ${input.crossAnalysis.prescription_risk.at_risk_amount}
At-risk Periods: ${input.crossAnalysis.prescription_risk.at_risk_periods.join(', ')}`
    : '';

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

  const startTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LETTER_TIMEOUT_MS);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: isMultiBill ? MULTI_BILL_LETTER_PROMPT : LETTER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    clearTimeout(timeout);
    const duration = Date.now() - startTime;

    if (response.content.length === 0 || response.content[0].type !== 'text') {
      throw new Error('Empty or non-text Claude response for letter generation');
    }

    const letterContent = response.content[0].text.trim();

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
