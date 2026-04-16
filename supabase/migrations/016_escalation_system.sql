-- Migration: 016_escalation_system.sql
-- Escalation letter tracking (one row per letter sent)
CREATE TABLE IF NOT EXISTS escalation_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  step INT NOT NULL CHECK (step IN (1, 2, 3, 4)),
  step_label TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  cc_emails TEXT[],
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  resend_message_id TEXT,
  response_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-case escalation state
ALTER TABLE cases 
  ADD COLUMN IF NOT EXISTS escalation_step INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_block_reason TEXT;

-- Index for cron queries
CREATE INDEX IF NOT EXISTS idx_cases_escalation 
  ON cases(escalation_step, last_escalation_at) 
  WHERE escalation_blocked = false;
