/**
 * VeriCite Three-Stage Verification — Type Definitions
 *
 * Based on VeriCite SIGIR-AP 2025 pattern:
 *   Stage 1: Initial research (Claude + web search)
 *   Stage 2: Evidence verification (fetch source, verify rate)
 *   Stage 3: Final refinement (strip failures, score confidence)
 *
 * All types are consumed by the gazette-fetcher orchestrator and
 * the tariff-cache-v2 upsert pipeline.
 */

import { TariffCacheRow } from '../types-v2';

// ── Stage 1: Research ─────────────────────────────────────────

/** Raw proposed row from Stage 1 Claude research */
export interface ProposedTariffRow {
  municipality_id: string;
  municipality_name: string;
  utility_type: string;
  tariff_name: string;
  tier_start_unit: number | null;
  tier_end_unit: number | null;
  unit_rate: number;
  vat_rate: number;
  fixed_charge: number | null;
  rebate_amount: number | null;
  rebate_condition: string | null;
  effective_from: string;   // ISO date string YYYY-MM-DD
  effective_to: string;     // ISO date string YYYY-MM-DD
  research_source: string;  // Must be a resolvable URL
  research_notes: string | null;
}

export interface Stage1Result {
  success: boolean;
  proposed_rows: ProposedTariffRow[];
  raw_response: string;
  token_spend: number;
  duration_ms: number;
  error?: string;
}

// ── Stage 2: Verification ─────────────────────────────────────

export type VerificationStatus =
  | 'verified'        // Source fetched, rate confirmed in content
  | 'source_404'      // Source URL returned non-200
  | 'rate_not_found'  // Source fetched but rate not present in content
  | 'source_generic'  // Source is too vague (e.g. "municipal website")
  | 'fetch_timeout'   // Source fetch timed out
  | 'fetch_error';    // Other fetch error

export interface VerifiedTariffRow extends ProposedTariffRow {
  verification_status: VerificationStatus;
  verification_notes: string | null;
  fetched_content_snippet: string | null;  // First 500 chars of fetched content for audit
}

export interface Stage2Result {
  success: boolean;
  verified_rows: VerifiedTariffRow[];
  rejected_rows: VerifiedTariffRow[];
  token_spend: number;
  duration_ms: number;
  error?: string;
}

// ── Stage 3: Refinement ───────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'failed';

export interface RefinedTariffRow extends ProposedTariffRow {
  confidence: ConfidenceLevel;
  is_redetermination: boolean;
}

export interface Stage3Result {
  success: boolean;
  final_rows: RefinedTariffRow[];
  confidence: ConfidenceLevel;
  redetermination_detected: boolean;
  error?: string;
}

// ── Orchestrator ──────────────────────────────────────────────

export interface VeriCiteResult {
  success: boolean;
  rows_upserted: number;
  rows_rejected: number;
  confidence: ConfidenceLevel;
  redetermination_detected: boolean;
  audit_id: string | null;
  error?: string;
}

export interface VeriCiteInput {
  municipality_id: string;
  municipality_name: string;
  billing_month: Date;         // First day of the billing month
  utility_type: string;
}

// ── Audit ─────────────────────────────────────────────────────

export interface ResearchAuditEntry {
  municipality_id: string;
  billing_month: string;       // ISO date
  utility_type: string;
  stage: 'stage1_research' | 'stage2_verify' | 'stage3_refine' | 'orchestrator';
  success: boolean;
  model_response: unknown;
  sources: unknown;
  token_spend: number;
  duration_ms: number;
  error_message: string | null;
}

// ── Reject ────────────────────────────────────────────────────

export type RejectionReason =
  | 'source_url_404'
  | 'rate_not_found_in_source'
  | 'rates_disagree_across_sources'
  | 'tier_overlap'
  | 'negative_unit_rate'
  | 'source_too_generic'
  | 'fetch_timeout'
  | 'fetch_error';

export interface TariffRejectEntry {
  municipality_id: string;
  billing_month: string | null;
  utility_type: string;
  raw_model_response: unknown;
  rejection_reason: RejectionReason;
  sources: unknown;
}
