-- Phase 11: Case Resolution Detection
-- Adds columns for Bill 2 comparison, manual review flagging, and escalation tracking.
-- amount_recovered already exists — not re-added.

ALTER TABLE cases ADD COLUMN IF NOT EXISTS bill_2_file_url TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT FALSE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS escalation_sent_at TIMESTAMPTZ;

-- Add 'escalating' to the valid status progression
COMMENT ON COLUMN cases.bill_2_file_url IS 'Supabase Storage path for the second bill uploaded for resolution verification';
COMMENT ON COLUMN cases.needs_manual_review IS 'Flagged when self-reported recovery > 200% of estimated — blocks auto-charge';
COMMENT ON COLUMN cases.escalation_sent_at IS 'Timestamp of most recent follow-up/escalation letter after Bill 2 comparison';
