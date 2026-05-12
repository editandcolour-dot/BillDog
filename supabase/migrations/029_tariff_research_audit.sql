-- Migration: 029_tariff_research_audit.sql
-- Creates audit table for VeriCite research calls and adds retry tracking to tariff_gaps_v1.
--
-- AGENTS.md Rule 5: No tables dropped or renamed. Additive only.

-- ============================================================
-- 1. Tariff Research Audit — logs every VeriCite call (pass or fail)
-- ============================================================

CREATE TABLE tariff_research_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id TEXT NOT NULL,
  billing_month   DATE NOT NULL,
  utility_type    TEXT NOT NULL,
  stage           TEXT NOT NULL CHECK (stage IN ('stage1_research', 'stage2_verify', 'stage3_refine', 'orchestrator')),
  success         BOOLEAN NOT NULL,
  model_response  JSONB,
  sources         JSONB,
  token_spend     INTEGER,
  duration_ms     INTEGER,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE tariff_research_audit IS 'Audit log for every VeriCite tariff research call. Used for debugging, cost tracking, and legal defensibility.';
COMMENT ON COLUMN tariff_research_audit.stage IS 'Which VeriCite stage: stage1_research, stage2_verify, stage3_refine, or orchestrator (top-level).';
COMMENT ON COLUMN tariff_research_audit.token_spend IS 'Total Claude API tokens consumed (input + output).';

-- Indexes
CREATE INDEX idx_research_audit_lookup
  ON tariff_research_audit(municipality_id, billing_month, utility_type);
CREATE INDEX idx_research_audit_created
  ON tariff_research_audit(created_at);

-- RLS: service role only (cron/API writes, admin reads)
ALTER TABLE tariff_research_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Add retry tracking to tariff_gaps_v1
-- ============================================================

ALTER TABLE tariff_gaps_v1 ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE tariff_gaps_v1 ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ;

COMMENT ON COLUMN tariff_gaps_v1.retry_count IS 'Number of VeriCite research attempts for this gap.';
COMMENT ON COLUMN tariff_gaps_v1.last_attempted_at IS 'Timestamp of last research attempt.';

-- ============================================================
-- ROLLBACK (reference only — never run automatically)
-- ============================================================
-- DROP TABLE IF EXISTS tariff_research_audit;
-- ALTER TABLE tariff_gaps_v1 DROP COLUMN IF EXISTS retry_count;
-- ALTER TABLE tariff_gaps_v1 DROP COLUMN IF EXISTS last_attempted_at;
