-- Migration: 032_disputes_lifecycle.sql
-- Tracks the full lifecycle of a billing dispute from letter sent → resolution.
-- Enables reference number tracking, municipal response recording,
-- and Section 62 appeal deadline management.
--
-- AGENTS.md Rule 5: Additive only.

CREATE TABLE disputes_lifecycle (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id                         UUID NOT NULL REFERENCES profiles(id),
  
  -- Letter details
  letter_sent_at                  TIMESTAMPTZ NOT NULL,
  letter_type                     TEXT NOT NULL DEFAULT 'section_102'
                                    CHECK (letter_type IN ('section_102', 'section_62_appeal', 'follow_up')),
  
  -- Municipal response tracking
  municipal_reference_number      TEXT,
  municipal_response_received_at  TIMESTAMPTZ,
  municipal_response_outcome      TEXT CHECK (municipal_response_outcome IN (
                                    'accepted', 'rejected', 'partial', 'no_response'
                                  )),
  municipal_response_document_url TEXT,
  municipal_response_notes        TEXT,
  
  -- Section 62 appeal tracking
  sec62_appeal_deadline           TIMESTAMPTZ,    -- response date + 21 days
  sec62_appeal_lodged_at          TIMESTAMPTZ,
  
  -- Overall lifecycle status
  status                          TEXT NOT NULL DEFAULT 'letter_sent'
                                    CHECK (status IN (
                                      'letter_sent',
                                      'reference_received',
                                      'awaiting_response',
                                      'response_received',
                                      'appeal_eligible',
                                      'appeal_lodged',
                                      'resolved',
                                      'closed_unresolved'
                                    )),
  
  created_at                      TIMESTAMPTZ DEFAULT now(),
  updated_at                      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE disputes_lifecycle IS 'Tracks the full lifecycle of each billing dispute — from letter to resolution.';
COMMENT ON COLUMN disputes_lifecycle.municipal_reference_number IS 'Reference number assigned by the municipality. User enters this manually.';
COMMENT ON COLUMN disputes_lifecycle.sec62_appeal_deadline IS 'Calculated: municipal_response_received_at + 21 days. User must appeal before this date.';

-- Indexes
CREATE INDEX idx_disputes_lifecycle_case_id ON disputes_lifecycle(case_id);
CREATE INDEX idx_disputes_lifecycle_user_id ON disputes_lifecycle(user_id);
CREATE INDEX idx_disputes_lifecycle_status ON disputes_lifecycle(status);
CREATE INDEX idx_disputes_lifecycle_deadline ON disputes_lifecycle(sec62_appeal_deadline)
  WHERE sec62_appeal_deadline IS NOT NULL AND sec62_appeal_lodged_at IS NULL;

-- RLS
ALTER TABLE disputes_lifecycle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dispute lifecycle"
  ON disputes_lifecycle FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own dispute lifecycle"
  ON disputes_lifecycle FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own dispute lifecycle"
  ON disputes_lifecycle FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- ROLLBACK (reference only)
-- ============================================================
-- DROP TABLE IF EXISTS disputes_lifecycle;
