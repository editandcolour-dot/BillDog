-- Migration 035: Create case_events table
-- 
-- This table has been referenced by 41 insert/select calls across 16 files
-- since the project began, but was never created in production.
-- Creating it now instantly enables the full audit trail.

CREATE TABLE IF NOT EXISTS case_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  note        text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_case_events_case_id ON case_events(case_id);
CREATE INDEX idx_case_events_event_type ON case_events(event_type);
CREATE INDEX idx_case_events_created_at ON case_events(created_at);

-- RLS: Row Level Security
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;

-- Users can read events for their own cases
CREATE POLICY "Users can read own case events"
  ON case_events FOR SELECT
  USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

-- Users can insert events for their own cases
CREATE POLICY "Users can insert own case events"
  ON case_events FOR INSERT
  WITH CHECK (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

-- Service role has full access (for cron jobs, webhooks, admin)
CREATE POLICY "Service role full access"
  ON case_events FOR ALL
  USING (auth.role() = 'service_role');

-- Service role can delete (for case deletion cascade cleanup)
CREATE POLICY "Service role can delete"
  ON case_events FOR DELETE
  USING (auth.role() = 'service_role');
