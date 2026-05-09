import { getClaudeClient } from './client';
import { AnalysisResult, ValidationFinding, FindingType, BillingError } from '@/types/analysis';
import { getParser } from '@/lib/parsers/registry';
import { validateBill } from '@/lib/validators/bill-validator';
import { buildGroundedSystemPrompt } from './grounded-prompt';

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

async function callWithRetry<T>(operation: () => Promise<T>, maxRetries: number = 3, attempt: number = 1): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    const apiError = error as { status?: number; name?: string };
    if (apiError.status === 429 && maxRetries > 0) {
      const waitTime = Math.pow(2, attempt) * 1000;
      console.warn(`[claude] Rate limited, retrying in ${waitTime}ms (attempt ${attempt})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callWithRetry(operation, maxRetries - 1, attempt + 1);
    }
    throw error;
  }
}

export async function analyseBill(billText: string, municipalityCode: string = 'city-of-cape-town'): Promise<AnalysisResult> {
  const client = getClaudeClient();

  // Try deterministic parser first
  const parser = getParser(municipalityCode);
  const parsedBill = parser ? parser.parse(billText) : null;
  let systemPrompt = ANALYSIS_SYSTEM_PROMPT;
  let isGroundTruth = false;
  let findingsCount = 0;
  let validatorFindings: ValidationFinding[] = [];

  if (parsedBill) {
    validatorFindings = await validateBill(parsedBill, municipalityCode);
    systemPrompt = buildGroundedSystemPrompt(validatorFindings, parsedBill);
    isGroundTruth = true;
    findingsCount = validatorFindings.length;
    console.log(`[claude/analyse] Using Ground Truth architecture. Found ${findingsCount} validated errors.`);
  } else {
    console.log('[claude/analyse] Bill not recognized as CoCT. Falling back to AI-only analysis.');
  }

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
      system: systemPrompt,
      // If we have grounded truth, we don't strictly need to pass all the text,
      // but passing it helps Claude write the summary in case we need extra context.
      messages: [{ role: 'user', content: isGroundTruth && findingsCount === 0 ? "No findings. Generate clean bill JSON." : trimmedText }],
    });
  };

  const response = await callWithRetry(() => callWithTimeout(operation, CLAUDE_TIMEOUT_MS));
  const duration = Date.now() - startTime;

  if (response.content.length === 0 || response.content[0].type !== 'text') {
    throw new Error('Empty or non-text Claude response for bill analysis');
  }

  const parsed = parseClaudeJson<AnalysisResult>(response.content[0].text);
  const validated = validateAnalysisResult(parsed);

  // ── CRITICAL: Ground Truth Override ─────────────────────────────────────
  // When the deterministic validator produced findings, those findings ARE the
  // errors array. Claude's re-interpretation is unreliable — it frequently
  // drops or rewords findings, producing zero errors when there are many.
  //
  // The fix: convert ValidationFinding[] → BillingError[] deterministically.
  // Claude's response is only used for: summary, municipality_detected, bill_period.
  // ────────────────────────────────────────────────────────────────────────
  if (isGroundTruth && parsedBill) {
    const groundTruthErrors: BillingError[] = validatorFindings.map(f => ({
      line_item: f.lineReference,
      service_type: mapFindingTypeToServiceType(f.type),
      amount_charged: f.billedAmount,
      expected_amount: f.expectedAmount ?? 0,
      overchargeZar: f.overchargeZar ?? 0,
      issue: f.description,
      legal_basis: f.legalBasis || getLegalBasis(f.type),
      recoverable: f.recoverable !== false,
    }));

    const totalRecoverable = validatorFindings.reduce(
      (sum, f) => sum + (f.recoverable !== false ? (f.overchargeZar ?? 0) : 0), 0
    );

    console.log(`[claude/analyse] Ground Truth override: ${groundTruthErrors.length} errors injected directly. Claude summary used for display only.`);

    return {
      ...validated,
      errors: groundTruthErrors,
      total_billed: parsedBill.totalDue,
      total_recoverable: totalRecoverable,
      confidence: 'high' as const,
      bill_period: validated.bill_period || parsedBill.billingDate,
      _meta: {
        model: MODEL,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        durationMs: duration,
        groundTruth: true,
        findingsCount,
        parserUsed: 'coct-regex',
      },
    };
  }

  return {
    ...validated,
    _meta: {
      model: MODEL,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      durationMs: duration,
      groundTruth: isGroundTruth,
      findingsCount,
      parserUsed: isGroundTruth ? 'coct-regex' : undefined,
    },
  };
}

/** Maps internal FindingType to the UI-facing service_type enum */
function mapFindingTypeToServiceType(type: FindingType): BillingError['service_type'] {
  switch (type) {
    case 'RATES_CALC_ERROR':
    case 'REBATE_CALC_ERROR':
    case 'UNKNOWN_RATE_APPLIED':
      return 'rates';
    case 'HUC_AMOUNT_WRONG':
      return 'electricity';
    case 'WATER_FIXED_CHARGE_WRONG':
    case 'METER_READING_MISMATCH':
      return 'water';
    case 'SEWERAGE_RATIO_ERROR':
      return 'sewerage';
    case 'VAT_MISMATCH':
    case 'PARSER_MISMATCH':
    case 'OVER_APPROVED_INCREASE':
    case 'UNKNOWN_TARIFF':
    default:
      return 'other';
  }
}

/** Fallback legal basis when the finding doesn't carry one */
function getLegalBasis(type: FindingType): string {
  switch (type) {
    case 'RATES_CALC_ERROR':
    case 'REBATE_CALC_ERROR':
    case 'UNKNOWN_RATE_APPLIED':
      return 'Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality\'s rates policy as gazetted.';
    case 'HUC_AMOUNT_WRONG':
      return 'Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.';
    case 'WATER_FIXED_CHARGE_WRONG':
      return 'Water Services Act 108 of 1997, s 10 — water charges must align with the approved tariff structure.';
    case 'VAT_MISMATCH':
      return 'Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.';
    case 'PARSER_MISMATCH':
      return 'Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.';
    case 'SEWERAGE_RATIO_ERROR':
      return 'Municipal Systems Act 32 of 2000 — sewerage charges linked to water consumption must use the correct consumption figure.';
    default:
      return 'Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.';
  }
}
