import { getClaudeClient } from './client';
import type { AnalysisResult, CrossAnalysis } from '@/types/analysis';

const MODEL = 'claude-sonnet-4-20250514';
const CLAUDE_TIMEOUT_MS = 60_000; // 60s for cross-analysis

const CROSS_ANALYSIS_SYSTEM_PROMPT = `You are a South African municipal billing expert.
You are given individual analysis results for multiple monthly bills from the same
property and municipal account. Your job is to identify PATTERNS of overcharging.

Look for:
1. CONSISTENT OVERCHARGES: The same error type appearing month after month
2. TARIFF DRIFT: Charges that increase beyond gazetted tariff adjustments
3. ESTIMATED READINGS: Repeated high estimates without actual readings
4. BACKDATED ADJUSTMENTS: Bulk charges applied without notice
5. PRESCRIPTION RISK: Errors older than 3 years from today (${new Date().toISOString().slice(0, 10)})
   may be time-barred under the Prescription Act 68 of 1969

Classify the overall pattern as ONE of:
- "consistent_overcharge" — same error repeats most months
- "escalating" — errors are getting worse over time
- "intermittent" — errors appear sporadically
- "single_incident" — only 1 or 2 months are affected

Return valid JSON — no prose, no markdown fences.

Required JSON schema:
{
  "pattern_type": "consistent_overcharge|intermittent|escalating|single_incident",
  "recurring_errors": [{
    "issue": "plain English description of the recurring error",
    "service_type": "electricity|water|gas|rates|sewerage|refuse|other",
    "months_affected": ["2024-01", "2024-02", ...],
    "total_overcharged": 1234.56,
    "legal_basis": "relevant SA act and section"
  }],
  "trend_summary": "Human-readable summary, e.g. 'Water tariff overcharged in 28 of 36 months'",
  "total_recoverable_all": 47230.50,
  "prescription_risk": {
    "at_risk_amount": 0.00,
    "at_risk_periods": []
  },
  "strongest_arguments": [
    "Top legal argument",
    "Second strongest argument",
    "Third strongest argument"
  ]
}`;

interface BillInput {
  bill_id: string;
  bill_period: string;
  analysis: AnalysisResult;
}

export async function analyseCrossBill(bills: BillInput[]): Promise<CrossAnalysis> {
  const client = getClaudeClient();

  // Condense to save tokens — send only errors per bill, not raw text
  const condensed = bills.map(b => ({
    period: b.bill_period,
    total_billed: b.analysis.total_billed,
    total_recoverable: b.analysis.total_recoverable,
    confidence: b.analysis.confidence,
    municipality: b.analysis.municipality_detected,
    errors: b.analysis.errors.map(e => ({
      item: e.line_item,
      service: e.service_type,
      charged: e.amount_charged,
      expected: e.expected_amount,
      issue: e.issue,
      basis: e.legal_basis,
    })),
  }));

  const userMessage = `Analyse these ${bills.length} months of billing data for cross-month patterns:\n${JSON.stringify(condensed, null, 2)}`;

  const startTime = Date.now();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: CROSS_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const duration = Date.now() - startTime;
  console.log(`[claude/cross-analysis] Completed in ${duration}ms for ${bills.length} bills`);

  if (response.content.length === 0 || response.content[0].type !== 'text') {
    throw new Error('Empty or non-text Claude response for cross-analysis');
  }

  const raw = response.content[0].text;
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  let parsed: CrossAnalysis;
  try {
    parsed = JSON.parse(cleaned) as CrossAnalysis;
  } catch (err) {
    console.error('[claude/cross-analysis] JSON parse failed:', {
      raw: raw.substring(0, 500),
      error: err instanceof Error ? err.message : String(err),
    });
    throw new Error('Claude returned invalid JSON for cross-analysis');
  }

  // Validate required fields
  if (!parsed.pattern_type || !parsed.recurring_errors || !parsed.trend_summary) {
    throw new Error('Cross-analysis response missing required fields');
  }

  if (!['consistent_overcharge', 'intermittent', 'escalating', 'single_incident'].includes(parsed.pattern_type)) {
    console.warn('[claude/cross-analysis] Unknown pattern_type:', parsed.pattern_type);
    parsed.pattern_type = 'intermittent'; // safe default
  }

  // Ensure prescription_risk exists
  if (!parsed.prescription_risk) {
    parsed.prescription_risk = { at_risk_amount: 0, at_risk_periods: [] };
  }

  // Ensure strongest_arguments is an array
  if (!Array.isArray(parsed.strongest_arguments)) {
    parsed.strongest_arguments = [];
  }

  return parsed;
}
