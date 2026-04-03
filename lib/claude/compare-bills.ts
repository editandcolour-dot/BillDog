import { getClaudeClient } from './client';

const MODEL = 'claude-sonnet-4-20250514';
const TIMEOUT_MS = 110_000; // maxDuration is 120s

export interface BillComparisonResult {
  resolved: boolean;
  amount_recovered: number;
  changes: Array<{
    item: string;
    before: number;
    after: number;
  }>;
}

const COMPARE_SYSTEM_PROMPT = `You are a South African municipal billing auditor.
You will receive data extracted from an original disputed bill (Bill 1) and the raw text of a newly uploaded bill (Bill 2).
Compare them to determine if the municipality has corrected the specific disputed charges or credited the account.

You must return valid JSON only. No prose. No markdown. No code blocks.

Required JSON schema:
{
  "resolved": boolean,
  "amount_recovered": number,
  "changes": [
    {
      "item": "string - name of the line item",
      "before": 1000.00,
      "after": 500.00
    }
  ]
}

RULES:
1. Examine Bill 2 for any "credit" or "reversal" line items that match the disputed amounts from Bill 1.
2. If the total balance or specific line items have been reduced as a result of the dispute, resolved is true.
3. The amount_recovered must equal the exact ZAR difference or credit applied.
4. If there is no reduction or credit, resolved is false and amount_recovered is 0.
`;

export async function compareBills(
  bill1Data: Record<string, unknown>, // We pass the JSON of cases.errors_found + cases.total_billed
  bill2Text: string
): Promise<BillComparisonResult> {
  const client = getClaudeClient();

  const promptContent = `
  --- BILL 1 (DISPUTED) DATA ---
  ${JSON.stringify(bill1Data, null, 2)}
  
  --- BILL 2 (NEW) TEXT ---
  ${bill2Text.substring(0, 10000)}
  `;

  // Manual timeout abort controller for the heavy diff
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: COMPARE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: promptContent }],
    });

    clearTimeout(timeoutId);

    if (response.content.length === 0 || response.content[0].type !== 'text') {
      throw new Error('Empty or non-text response from Claude');
    }

    const rawStr = response.content[0].text;
    const cleaned = rawStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    
    return JSON.parse(cleaned) as BillComparisonResult;

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[claude/compareBills] Failed', error);
    throw new Error('Failed to compare bills via AI.');
  }
}
