CREATE TABLE IF NOT EXISTS case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for case_events
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own case events"
  ON case_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_events.case_id 
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own case events"
  ON case_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_events.case_id 
      AND cases.user_id = auth.uid()
    )
  );
