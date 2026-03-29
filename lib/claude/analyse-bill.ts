import { getClaudeClient } from './client';
import { AnalysisResult } from '@/types/analysis';

const CLAUDE_TIMEOUT_MS = 45_000;
const MODEL = 'claude-sonnet-4-20250514';

const ANALYSIS_SYSTEM_PROMPT = `You are an expert South African municipal billing analyst.
You specialise in identifying overcharges, incorrect tariffs, and billing errors in
municipal accounts from City of Cape Town, eThekwini, Johannesburg, Tshwane, and Ekurhuleni.

Analyse the municipal bill text provided and identify ALL billing errors.

ERROR DETECTION RULES — flag each of these as an error:

1. ESTIMATED WATER READINGS: If the bill shows "Estimated" consumption that is more than 150% above the historical or average consumption, flag it. Compare the billed consumption against any average or previous actual readings mentioned on the bill. Estimated readings inflated beyond 150% of historical usage are billing errors.

2. SEWERAGE OVERCHARGES: If sewerage is calculated as a percentage of water consumption AND the water consumption is estimated/inflated (see rule 1), then the sewerage charge is also inflated. Flag it as a separate error linked to the water estimate.

3. PROPERTY RATES VALUATION: If the municipal valuation used on the bill differs from the valuation the consumer believes is correct, or if the valuation appears unreasonable for the property type and area, flag it. Any discrepancy in the valuation figure used for calculating rates is a billing error.

4. UNEXPLAINED CHARGES: Any sundry, miscellaneous, or adjustment charge with no clear description must be flagged.

5. DUPLICATE CHARGES: The same service charged twice in one billing period.

6. MATHEMATICAL ERRORS: Incorrect arithmetic in any line item calculation.

7. BACKDATED CHARGES: Charges applied for a period more than 3 months prior without prior notice.

8. TARIFF ERRORS: Rates that do not match known gazetted tariffs for the municipality.

LEGITIMATE CHARGES — do NOT flag these as errors:
- City of Cape Town Electricity Home User Charge (legitimate fixed monthly fee for prepaid meters, introduced July 2018, applies to residential prepaid users with property value over R1 million)
- Fixed Basic Charges on water or sewerage accounts (legitimate infrastructure fees, these are NOT errors)
- City-wide cleaning charges (legitimate municipal levy)
- Refuse removal charges at standard residential rates
- VAT calculated at 15%

You must respond with valid JSON only.
No prose. No markdown. No code fences. No explanations. Raw JSON only.
If you cannot analyse the bill, return: {"error": "description"}

Required JSON schema:
{
  "errors": [{
    "line_item": "exact line item name from bill",
    "service_type": "electricity|water|gas|rates|sewerage|refuse|other",
    "amount_charged": 1234.56,
    "expected_amount": 1000.00,
    "issue": "plain English explanation of what is wrong",
    "legal_basis": "relevant SA act and section",
    "recoverable": true
  }],
  "total_billed": 5000.00,
  "total_recoverable": 234.56,
  "confidence": "high|medium|low",
  "bill_period": "March 2026",
  "municipality_detected": "City of Cape Town",
  "summary": "1-2 sentence plain English summary"
}

If no errors are found, return errors as an empty array [] and total_recoverable as 0.00.
If you cannot read the bill text, return confidence: low and errors as an empty array []`;

function parseClaudeJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseError) {
    console.error('[claude/parse] Failed to parse JSON', {
      responseLength: raw.length,
      preview: raw.substring(0, 300),
      parseError: parseError instanceof Error ? parseError.message : String(parseError),
    });
    throw new Error('Claude returned invalid JSON');
  }
}

function validateAnalysisResult(parsed: unknown): AnalysisResult {
  const obj = parsed as Record<string, unknown>;

  if ('error' in obj) {
    throw new Error(`Claude analysis refused: ${obj.error}`);
  }

  const requiredKeys = ['errors', 'total_billed', 'total_recoverable', 'confidence', 'summary'];
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      throw new Error(`Missing required key in analysis: ${key}`);
    }
  }

  if (!Array.isArray(obj.errors)) {
    throw new Error('errors must be an array');
  }

  if (!['high', 'medium', 'low'].includes(obj.confidence as string)) {
    throw new Error('confidence must be high, medium, or low');
  }

  return obj as unknown as AnalysisResult;
}

async function callWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number = CLAUDE_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await operation();
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      const e = new Error('Analysis is taking longer than usual. Please try again.');
      e.name = 'CLAUDE_TIMEOUT';
      throw e;
    }
    throw error;
  }
}

async function callWithRetry<T>(operation: () => Promise<T>, maxRetries: number = 1): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    const apiError = error as { status?: number; name?: string };
    if (apiError.status === 429 && maxRetries > 0) {
      console.warn('[claude] Rate limited, retrying in 60s');
      await new Promise(resolve => setTimeout(resolve, 60_000));
      return callWithRetry(operation, maxRetries - 1);
    }
    throw error;
  }
}

export async function analyseBill(billText: string): Promise<AnalysisResult> {
  const client = getClaudeClient();

  const MAX_BILL_TEXT_CHARS = 8000;
  let trimmedText = billText;
  
  if (billText.length > MAX_BILL_TEXT_CHARS) {
    console.warn('[claude/analyse] Bill text exceeds 8000 chars', {
      originalLength: billText.length,
    });
    trimmedText = billText.substring(0, MAX_BILL_TEXT_CHARS);
  }

  const startTime = Date.now();

  const operation = async () => {
    return client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: trimmedText }],
    });
  };

  const response = await callWithRetry(() => callWithTimeout(operation, CLAUDE_TIMEOUT_MS));
  const duration = Date.now() - startTime;

  if (response.content.length === 0 || response.content[0].type !== 'text') {
    throw new Error('Empty or non-text Claude response for bill analysis');
  }

  const parsed = parseClaudeJson<AnalysisResult>(response.content[0].text);
  const validated = validateAnalysisResult(parsed);

  return {
    ...validated,
    _meta: {
      model: MODEL,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      durationMs: duration,
    },
  };
}
