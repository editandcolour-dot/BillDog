-- Migration: 027_tariff_cache_v2.sql
-- Description: Replaces the flat-rate tariff_cache (v1) with a richer, tier-aware,
--              validity-window-based schema that supports mid-year rate changes
--              (e.g. NERSA redeterminations) and full tier breakdowns.
--
-- Strategy:
--   1. Rename old tables to *_v1 (preserved per AGENTS.md Rule 5 — never delete)
--   2. Create new tariff_cache with expanded schema
--   3. RLS: public SELECT, service-role-only writes

-- ============================================================================
-- 1. Preserve old tables
-- ============================================================================

ALTER TABLE IF EXISTS tariff_cache RENAME TO tariff_cache_v1;
ALTER TABLE IF EXISTS tariff_gaps  RENAME TO tariff_gaps_v1;

-- Drop old indexes (they reference the renamed table, recreate isn't needed for v1)
DROP INDEX IF EXISTS idx_tariff_cache_lookup;
DROP INDEX IF EXISTS idx_tariff_cache_expires;

-- ============================================================================
-- 2. Create new tariff_cache
-- ============================================================================

CREATE TABLE tariff_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Municipality identity
  municipality_id TEXT NOT NULL,            -- e.g., 'cct' for City of Cape Town
  municipality_name TEXT NOT NULL,          -- e.g., 'City of Cape Town'

  -- Validity window (replaces billing_month / financial_year)
  -- Supports both annual FY transitions and mid-year NERSA redeterminations.
  -- Lookup: WHERE effective_from <= bill_date AND effective_to >= bill_date
  -- Mid-year change: close prior row (set effective_to), insert new row.
  effective_from DATE NOT NULL,             -- Start of validity (e.g., 2025-07-01)
  effective_to DATE NOT NULL,               -- End of validity   (e.g., 2026-06-30)

  -- Service classification
  utility_type TEXT NOT NULL,               -- 'electricity', 'water', 'sewer', 'refuse'
  tariff_name TEXT NOT NULL,                -- e.g., 'HOME_USER', 'DOMESTIC_LOW_USAGE'

  -- Tier boundaries (NULL for fixed charges / flat-rate items)
  tier_start_unit NUMERIC,                  -- Lower bound of tier (e.g., 0 for Tier 1)
  tier_end_unit NUMERIC,                    -- Upper bound of tier (e.g., 600 for elec Tier 1)

  -- Rates
  unit_rate NUMERIC NOT NULL,               -- Cost per unit (before VAT)
  vat_rate NUMERIC NOT NULL DEFAULT 0.15,   -- VAT percentage (15% for SA utilities)
  fixed_charge NUMERIC,                     -- Fixed monthly charge, if applicable
  rebate_amount NUMERIC,                    -- Rebate/discount, if applicable
  rebate_condition TEXT,                    -- Condition for rebate (e.g., 'indigent')

  -- Provenance — every rate must be traceable
  research_source TEXT NOT NULL,            -- URL or document reference
  research_notes TEXT,                      -- Additional context or warnings

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one rate per municipality+utility+tariff+tier+window
  UNIQUE(municipality_id, utility_type, tariff_name, tier_start_unit, effective_from)
);

-- ============================================================================
-- 3. Indexes
-- ============================================================================

-- Primary lookup: find rates for a specific bill
CREATE INDEX idx_tariff_cache_lookup
  ON tariff_cache(municipality_id, utility_type, tariff_name);

-- Window scan: supports the WHERE effective_from <= $date AND effective_to >= $date pattern
CREATE INDEX idx_tariff_cache_window
  ON tariff_cache(effective_from, effective_to);

-- Prune scan: DELETE WHERE effective_to < NOW() - INTERVAL '36 months'
CREATE INDEX idx_tariff_cache_prune
  ON tariff_cache(effective_to);

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

ALTER TABLE tariff_cache ENABLE ROW LEVEL SECURITY;

-- Public read access (analysis pipeline, edge functions)
CREATE POLICY "tariff_cache_public_select"
  ON tariff_cache FOR SELECT
  USING (true);

-- Service role bypasses RLS for insert/update/delete (seed script, cron)
-- No explicit policy needed — service role key bypasses RLS by default.

-- ============================================================================
-- 5. Preserve RLS on renamed v1 tables
-- ============================================================================
-- v1 tables already have RLS enabled from migration 018. No changes needed.
