/**
 * Gazette Fetcher v2 — VeriCite Three-Stage Orchestrator
 *
 * Replaces the stubbed gazette-fetcher.ts with live research.
 * Pipeline: Stage 1 (research) → Stage 2 (verify) → Stage 3 (refine) → upsert to cache.
 *
 * Anti-hallucination architecture:
 *   - Model fails rather than guesses
 *   - Every rate must have a verifiable source URL
 *   - Conflicts return error, not a guess
 *   - All calls logged to tariff_research_audit
 *
 * Rate limiting: 10 calls/minute per municipality via Upstash Redis.
 * Failure cooldown: 24-hour dedup via tariff_research_audit query.
 *
 * Model: claude-sonnet-4-20250514 (non-negotiable, AGENTS.md Rule 7)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRateLimiter } from '@/lib/rate-limit';
import { populateTariffCache } from './tariff-cache-v2';
import { runStage1 } from './vericite/stage1-research';
import { runStage2 } from './vericite/stage2-verify';
import { runStage3 } from './vericite/stage3-refine';
import type {
  VeriCiteInput,
  VeriCiteResult,
  ResearchAuditEntry,
  TariffRejectEntry,
  VerifiedTariffRow,
  RejectionReason,
} from './vericite/types';
import type { TariffCacheInsert, UtilityType } from './types-v2';

// ── Rate limiter: 10 VeriCite calls per minute per municipality ────────────

const vericiteRateLimiter = getRateLimiter(10, '1 m');

// ── Supabase client ────────────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('[gazette-fetcher] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  _client = createClient(url, key);
  return _client;
}

// ── Audit logging ──────────────────────────────────────────────────────────

async function logAudit(entry: ResearchAuditEntry): Promise<string | null> {
  try {
    const client = getServiceClient();
    const { data, error } = await client
      .from('tariff_research_audit')
      .insert({
        municipality_id: entry.municipality_id,
        billing_month: entry.billing_month,
        utility_type: entry.utility_type,
        stage: entry.stage,
        success: entry.success,
        model_response: entry.model_response,
        sources: entry.sources,
        token_spend: entry.token_spend,
        duration_ms: entry.duration_ms,
        error_message: entry.error_message,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[gazette-fetcher] Audit log error:', error);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.error('[gazette-fetcher] Audit log exception:', err);
    return null;
  }
}

// ── Reject logging ─────────────────────────────────────────────────────────

async function logRejects(rejects: VerifiedTariffRow[], billingMonth: string): Promise<void> {
  if (rejects.length === 0) return;

  try {
    const client = getServiceClient();
    const rows: TariffRejectEntry[] = rejects.map((r) => ({
      municipality_id: r.municipality_id,
      billing_month: billingMonth,
      utility_type: r.utility_type,
      raw_model_response: {
        tariff_name: r.tariff_name,
        unit_rate: r.unit_rate,
        tier_start_unit: r.tier_start_unit,
        verification_notes: r.verification_notes,
      },
      rejection_reason: mapVerificationToRejection(r.verification_status),
      sources: { research_source: r.research_source, content_snippet: r.fetched_content_snippet },
    }));

    await client.from('tariff_rejects').insert(rows);
  } catch (err) {
    console.error('[gazette-fetcher] Reject log exception:', err);
  }
}

function mapVerificationToRejection(status: string): RejectionReason {
  switch (status) {
    case 'source_404': return 'source_url_404';
    case 'rate_not_found': return 'rate_not_found_in_source';
    case 'source_generic': return 'source_too_generic';
    case 'fetch_timeout': return 'fetch_timeout';
    default: return 'fetch_error';
  }
}

// ── 24-hour failure cooldown ───────────────────────────────────────────────

async function hasRecentFailure(
  municipalityId: string,
  billingMonth: string,
  utilityType: string,
): Promise<boolean> {
  try {
    const client = getServiceClient();
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const { data, error } = await client
      .from('tariff_research_audit')
      .select('id', { count: 'exact', head: true })
      .eq('municipality_id', municipalityId)
      .eq('billing_month', billingMonth)
      .eq('utility_type', utilityType)
      .eq('stage', 'orchestrator')
      .eq('success', false)
      .gte('created_at', cutoff.toISOString());

    if (error) return false;
    return (data as any)?.length > 0 || false;
  } catch {
    return false;
  }
}

// ── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Run the full VeriCite three-stage pipeline for a single
 * (municipality, billing_month, utility_type) tuple.
 *
 * Returns VeriCiteResult with upserted rows on success,
 * or error with audit trail on failure.
 */
export async function researchTariff(input: VeriCiteInput): Promise<VeriCiteResult> {
  const billingMonthStr = input.billing_month.toISOString().split('T')[0];
  const startTime = Date.now();

  // ── 0. Rate limit check ──────────────────────────────────────────────
  const rlResult = await vericiteRateLimiter.limit(`vericite:${input.municipality_id}`);
  if (!rlResult.success) {
    return {
      success: false,
      rows_upserted: 0,
      rows_rejected: 0,
      confidence: 'failed',
      redetermination_detected: false,
      audit_id: null,
      error: 'Rate limited — too many VeriCite calls for this municipality. Try again in 1 minute.',
    };
  }

  // ── 1. 24-hour failure cooldown ──────────────────────────────────────
  const recentFail = await hasRecentFailure(
    input.municipality_id,
    billingMonthStr,
    input.utility_type,
  );
  if (recentFail) {
    return {
      success: false,
      rows_upserted: 0,
      rows_rejected: 0,
      confidence: 'failed',
      redetermination_detected: false,
      audit_id: null,
      error: 'This (municipality, month, utility) was researched in the last 24 hours and failed. Skipping to avoid burning tokens.',
    };
  }

  // ── 2. Stage 1: Research ─────────────────────────────────────────────
  console.log(`[VeriCite] Stage 1: Researching ${input.municipality_id} ${input.utility_type} ${billingMonthStr}`);
  const s1 = await runStage1(
    input.municipality_id,
    input.municipality_name,
    input.billing_month,
    input.utility_type,
  );

  await logAudit({
    municipality_id: input.municipality_id,
    billing_month: billingMonthStr,
    utility_type: input.utility_type,
    stage: 'stage1_research',
    success: s1.success,
    model_response: s1.raw_response,
    sources: s1.proposed_rows.map((r) => r.research_source),
    token_spend: s1.token_spend,
    duration_ms: s1.duration_ms,
    error_message: s1.error || null,
  });

  if (!s1.success) {
    const auditId = await logAudit({
      municipality_id: input.municipality_id,
      billing_month: billingMonthStr,
      utility_type: input.utility_type,
      stage: 'orchestrator',
      success: false,
      model_response: null,
      sources: null,
      token_spend: s1.token_spend,
      duration_ms: Date.now() - startTime,
      error_message: `Stage 1 failed: ${s1.error}`,
    });

    return {
      success: false,
      rows_upserted: 0,
      rows_rejected: 0,
      confidence: 'failed',
      redetermination_detected: false,
      audit_id: auditId,
      error: s1.error,
    };
  }

  // ── 3. Stage 2: Verify ──────────────────────────────────────────────
  console.log(`[VeriCite] Stage 2: Verifying ${s1.proposed_rows.length} proposed rows`);
  const s2 = await runStage2(s1.proposed_rows);

  await logAudit({
    municipality_id: input.municipality_id,
    billing_month: billingMonthStr,
    utility_type: input.utility_type,
    stage: 'stage2_verify',
    success: s2.success,
    model_response: {
      verified_count: s2.verified_rows.length,
      rejected_count: s2.rejected_rows.length,
    },
    sources: s2.verified_rows.map((r) => r.research_source),
    token_spend: s2.token_spend,
    duration_ms: s2.duration_ms,
    error_message: s2.error || null,
  });

  // Log rejects to tariff_rejects table
  await logRejects(s2.rejected_rows, billingMonthStr);

  if (!s2.success) {
    const auditId = await logAudit({
      municipality_id: input.municipality_id,
      billing_month: billingMonthStr,
      utility_type: input.utility_type,
      stage: 'orchestrator',
      success: false,
      model_response: null,
      sources: null,
      token_spend: s1.token_spend + s2.token_spend,
      duration_ms: Date.now() - startTime,
      error_message: `Stage 2 failed: all rows rejected. ${s2.rejected_rows.length} rejects logged.`,
    });

    return {
      success: false,
      rows_upserted: 0,
      rows_rejected: s2.rejected_rows.length,
      confidence: 'failed',
      redetermination_detected: false,
      audit_id: auditId,
      error: `All ${s2.rejected_rows.length} proposed rows failed verification`,
    };
  }

  // ── 4. Stage 3: Refine ──────────────────────────────────────────────
  console.log(`[VeriCite] Stage 3: Refining ${s2.verified_rows.length} verified rows`);
  const s3 = runStage3(s2.verified_rows, s1.proposed_rows.length);

  if (!s3.success) {
    const auditId = await logAudit({
      municipality_id: input.municipality_id,
      billing_month: billingMonthStr,
      utility_type: input.utility_type,
      stage: 'orchestrator',
      success: false,
      model_response: null,
      sources: null,
      token_spend: s1.token_spend + s2.token_spend,
      duration_ms: Date.now() - startTime,
      error_message: `Stage 3 failed: ${s3.error}`,
    });

    return {
      success: false,
      rows_upserted: 0,
      rows_rejected: s2.rejected_rows.length,
      confidence: 'failed',
      redetermination_detected: false,
      audit_id: auditId,
      error: s3.error,
    };
  }

  // ── 5. Upsert to tariff_cache ────────────────────────────────────────
  const cacheInserts: TariffCacheInsert[] = s3.final_rows.map((r) => ({
    municipality_id: r.municipality_id,
    municipality_name: r.municipality_name,
    effective_from: r.effective_from,
    effective_to: r.effective_to,
    utility_type: r.utility_type as UtilityType,
    tariff_name: r.tariff_name,
    tier_start_unit: r.tier_start_unit,
    tier_end_unit: r.tier_end_unit,
    unit_rate: r.unit_rate,
    vat_rate: r.vat_rate,
    fixed_charge: r.fixed_charge,
    rebate_amount: r.rebate_amount,
    rebate_condition: r.rebate_condition,
    research_source: r.research_source,
    research_notes: r.research_notes
      ? `${r.research_notes} | confidence=${r.confidence}`
      : `VeriCite verified | confidence=${r.confidence}`,
  }));

  const { inserted, errors } = await populateTariffCache(cacheInserts);

  const totalTokens = s1.token_spend + s2.token_spend;
  const totalDuration = Date.now() - startTime;

  const auditId = await logAudit({
    municipality_id: input.municipality_id,
    billing_month: billingMonthStr,
    utility_type: input.utility_type,
    stage: 'orchestrator',
    success: inserted > 0,
    model_response: {
      stage1_rows: s1.proposed_rows.length,
      stage2_verified: s2.verified_rows.length,
      stage2_rejected: s2.rejected_rows.length,
      stage3_final: s3.final_rows.length,
      upserted: inserted,
      confidence: s3.confidence,
      redetermination: s3.redetermination_detected,
    },
    sources: s3.final_rows.map((r) => r.research_source),
    token_spend: totalTokens,
    duration_ms: totalDuration,
    error_message: errors.length > 0 ? errors.join('; ') : null,
  });

  console.log(
    `[VeriCite] Complete: ${inserted} rows upserted, ${s2.rejected_rows.length} rejected, ` +
    `confidence=${s3.confidence}, tokens=${totalTokens}, duration=${totalDuration}ms`
  );

  return {
    success: inserted > 0,
    rows_upserted: inserted,
    rows_rejected: s2.rejected_rows.length,
    confidence: s3.confidence,
    redetermination_detected: s3.redetermination_detected,
    audit_id: auditId,
  };
}

// ── Legacy interface compatibility ─────────────────────────────────────────

/** Municipality ID → display name map (extend as needed) */
const MUNICIPALITY_NAMES: Record<string, string> = {
  cct: 'City of Cape Town',
  coj: 'City of Johannesburg',
  cot: 'City of Tshwane',
  eth: 'eThekwini',
  ekr: 'Ekurhuleni',
  nmb: 'Nelson Mandela Bay',
  bcm: 'Buffalo City',
  man: 'Mangaung',
};

export interface FetchGazetteParams {
  municipality: string;
  financialYear: string;
  tariffType: string;
  subKey?: string | null;
}

export interface GazetteFetchResult {
  result: 'PASS' | 'SKIP';
  amount?: number;
  source_url?: string;
  reason?: string;
}

/**
 * Legacy-compatible wrapper that maps the old gazette-fetcher interface
 * to the new VeriCite pipeline. Called by tariff-resolver.ts.
 */
export async function fetchGazetteAndParse(
  params: FetchGazetteParams,
): Promise<GazetteFetchResult> {
  const municipalityName = MUNICIPALITY_NAMES[params.municipality] || params.municipality;

  // Parse financial year to billing month (use start of FY)
  const fyMatch = params.financialYear.match(/^(\d{4})/);
  const fyStartYear = fyMatch ? parseInt(fyMatch[1]) : new Date().getFullYear();
  const billingMonth = new Date(fyStartYear, 6, 1); // July 1st

  try {
    const result = await researchTariff({
      municipality_id: params.municipality,
      municipality_name: municipalityName,
      billing_month: billingMonth,
      utility_type: params.tariffType,
    });

    if (result.success) {
      return {
        result: 'PASS',
        reason: `VeriCite verified: ${result.rows_upserted} rows cached (confidence=${result.confidence})`,
      };
    }

    return {
      result: 'SKIP',
      reason: result.error || 'VeriCite research failed',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[gazette-fetcher] Exception: ${msg}`);
    return {
      result: 'SKIP',
      reason: `VeriCite exception: ${msg}`,
    };
  }
}
