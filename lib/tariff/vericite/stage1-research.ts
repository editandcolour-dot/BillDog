/**
 * VeriCite Stage 1: Initial Tariff Research
 *
 * Uses Claude Sonnet 4 with web search tool to research
 * tariff rates for a given municipality, billing month, and utility type.
 *
 * Anti-hallucination rules:
 * - Model must cite specific URLs (not "municipal website")
 * - Model must return structured JSON with one row per tier
 * - On uncertainty, model returns error rather than guessing
 *
 * Model: claude-sonnet-4-20250514 (non-negotiable, per AGENTS.md Rule 7)
 */

import { getClaudeClient } from '@/lib/claude/client';
import type { ProposedTariffRow, Stage1Result } from './types';

const MODEL = 'claude-sonnet-4-20250514';
const STAGE1_TIMEOUT_MS = 30_000;

/**
 * Derives the SA financial year boundaries (1 Jul – 30 Jun) for a given date.
 */
export function getFYBoundaries(date: Date): { fyStart: string; fyEnd: string; fyLabel: string } {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const fyStartYear = month >= 6 ? year : year - 1; // Jul=6 → current year, Jan-Jun → prior year
  return {
    fyStart: `${fyStartYear}-07-01`,
    fyEnd: `${fyStartYear + 1}-06-30`,
    fyLabel: `${fyStartYear}/${fyStartYear + 1}`,
  };
}

function buildStage1Prompt(
  municipalityId: string,
  municipalityName: string,
  billingMonth: Date,
  utilityType: string,
): string {
  const fy = getFYBoundaries(billingMonth);
  const monthStr = billingMonth.toISOString().slice(0, 7); // YYYY-MM

  return `You are a South African municipal tariff researcher. Research the EXACT tariff rates for:

Municipality: ${municipalityName} (ID: ${municipalityId})
Utility type: ${utilityType}
Billing month: ${monthStr}
Financial year: ${fy.fyLabel} (1 July ${fy.fyLabel.split('/')[0]} to 30 June ${fy.fyLabel.split('/')[1]})

RULES — FOLLOW EXACTLY:
1. Search for the official gazetted tariff schedule for this municipality and financial year.
2. Return the TIERED rate structure (step/block tariffs for water and electricity).
3. Every row MUST have a research_source that is a SPECIFIC, resolvable URL — not "municipal website" or "council resolution". The URL must point to the actual document containing the rate.
4. If you cannot find a specific source URL for a rate, DO NOT include that rate. Return fewer rows rather than guessing.
5. If you find conflicting rates from different sources, return an error — do not pick one.
6. Include fixed/basic charges as separate rows with tier_start_unit = null.
7. Include rebates where applicable.
8. If a mid-year tariff redetermination occurred (e.g. NERSA order), return TWO sets of rows with different effective_from/effective_to dates. Add research_notes flagging "LEGAL_HOLD: mid-year redetermination".

Return ONLY valid JSON. No markdown. No prose. No code fences.

Schema:
{
  "success": true,
  "rows": [
    {
      "utility_type": "${utilityType}",
      "tariff_name": "string — e.g. 'Domestic Tier 1' or 'Basic Charge 20mm'",
      "tier_start_unit": number | null,
      "tier_end_unit": number | null,
      "unit_rate": number (in Rand, excl VAT),
      "vat_rate": 0.15,
      "fixed_charge": number | null,
      "rebate_amount": number | null,
      "rebate_condition": "string" | null,
      "effective_from": "${fy.fyStart}",
      "effective_to": "${fy.fyEnd}",
      "research_source": "https://specific-url-to-gazette-or-tariff-document",
      "research_notes": "string" | null
    }
  ]
}

If you CANNOT find reliable tariff data, return:
{ "success": false, "error": "description of what was searched and why it failed" }`;
}

/**
 * Stage 1: Research tariff rates via Claude with web search.
 */
export async function runStage1(
  municipalityId: string,
  municipalityName: string,
  billingMonth: Date,
  utilityType: string,
): Promise<Stage1Result> {
  const client = getClaudeClient();
  const startTime = Date.now();

  const prompt = buildStage1Prompt(municipalityId, municipalityName, billingMonth, utilityType);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search', max_uses: 5 }],
      messages: [{ role: 'user', content: prompt }],
    });

    const duration = Date.now() - startTime;
    const tokenSpend = response.usage.input_tokens + response.usage.output_tokens;

    // Extract text content from response (may contain tool_use blocks)
    const textBlocks = response.content.filter((b) => b.type === 'text');
    if (textBlocks.length === 0) {
      return {
        success: false,
        proposed_rows: [],
        raw_response: JSON.stringify(response.content),
        token_spend: tokenSpend,
        duration_ms: duration,
        error: 'No text response from Claude — only tool_use blocks returned.',
      };
    }

    const rawText = textBlocks.map((b) => (b as any).text).join('\n');

    // Parse JSON from response
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return {
        success: false,
        proposed_rows: [],
        raw_response: rawText,
        token_spend: tokenSpend,
        duration_ms: duration,
        error: `Failed to parse JSON from Stage 1 response: ${rawText.substring(0, 200)}`,
      };
    }

    if (!parsed.success) {
      return {
        success: false,
        proposed_rows: [],
        raw_response: rawText,
        token_spend: tokenSpend,
        duration_ms: duration,
        error: parsed.error || 'Model indicated research failure',
      };
    }

    if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      return {
        success: false,
        proposed_rows: [],
        raw_response: rawText,
        token_spend: tokenSpend,
        duration_ms: duration,
        error: 'Model returned success but no rows',
      };
    }

    // Map to ProposedTariffRow with municipality fields
    const proposed: ProposedTariffRow[] = parsed.rows.map((r: any) => ({
      municipality_id: municipalityId,
      municipality_name: municipalityName,
      utility_type: r.utility_type || utilityType,
      tariff_name: r.tariff_name || 'Unknown',
      tier_start_unit: r.tier_start_unit ?? null,
      tier_end_unit: r.tier_end_unit ?? null,
      unit_rate: Number(r.unit_rate) || 0,
      vat_rate: Number(r.vat_rate) || 0.15,
      fixed_charge: r.fixed_charge != null ? Number(r.fixed_charge) : null,
      rebate_amount: r.rebate_amount != null ? Number(r.rebate_amount) : null,
      rebate_condition: r.rebate_condition || null,
      effective_from: r.effective_from || '',
      effective_to: r.effective_to || '',
      research_source: r.research_source || '',
      research_notes: r.research_notes || null,
    }));

    return {
      success: true,
      proposed_rows: proposed,
      raw_response: rawText,
      token_spend: tokenSpend,
      duration_ms: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      proposed_rows: [],
      raw_response: '',
      token_spend: 0,
      duration_ms: duration,
      error: `Stage 1 exception: ${msg}`,
    };
  }
}
