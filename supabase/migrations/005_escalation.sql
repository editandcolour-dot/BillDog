-- Migration: 005_escalation.sql
-- Adds escalation tracking columns to cases and creates cron_errors table.

-- ============================================================
-- 1. ALTER cases — add escalation columns
-- ============================================================

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS escalation_stage    int          DEFAULT 1,
  ADD COLUMN IF NOT EXISTS next_action_at      timestamptz,
  ADD COLUMN IF NOT EXISTS last_escalation_at  timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_history  jsonb        DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dispute_type        text;

-- dispute_type: water | electricity | rates | refuse | sewerage | other
-- Set after bill analysis based on the primary disputed service.

COMMENT ON COLUMN cases.escalation_stage    IS 'Current escalation stage (1-7). Stage 1 = initial letter sent.';
COMMENT ON COLUMN cases.next_action_at      IS 'When the next escalation action should fire. NULL = no scheduled action.';
COMMENT ON COLUMN cases.last_escalation_at  IS 'Timestamp of last escalation send. Prevents double-sends within same stage.';
COMMENT ON COLUMN cases.escalation_history  IS 'JSONB array of {stage, action, timestamp, resend_id, recipient} entries.';
COMMENT ON COLUMN cases.dispute_type        IS 'Primary disputed service type (water, electricity, rates, refuse, sewerage, other).';


-- ============================================================
-- 2. CREATE cron_errors — log escalation failures
-- ============================================================

CREATE TABLE IF NOT EXISTS cron_errors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid REFERENCES cases(id) ON DELETE SET NULL,
  stage       int,
  error       text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE cron_errors IS 'Logs failures from the nightly escalation cron. One row per failed case per run.';


-- ============================================================
-- 3. RLS on cron_errors — service role only (no user access)
-- ============================================================

ALTER TABLE cron_errors ENABLE ROW LEVEL SECURITY;

-- No user-facing policies. Only service role can read/write.
-- This table is internal infrastructure.


-- ============================================================
-- 4. Index for cron query performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cases_escalation_due
  ON cases (next_action_at)
  WHERE status IN ('sent', 'escalated')
    AND next_action_at IS NOT NULL;
