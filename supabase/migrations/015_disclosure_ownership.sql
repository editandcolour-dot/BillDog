-- Migration: 015_disclosure_ownership.sql
-- Moves disclosure process out of case_bills (user level) and into municipalities (system level)

-- 1. Clean up case_bills (undoing the staging logic introduced previously)
ALTER TABLE case_bills
  DROP COLUMN IF EXISTS disclosure_request_sent_at,
  DROP COLUMN IF EXISTS disclosure_request_content;

-- 2. Add system-level tracking to municipalities
ALTER TABLE municipalities 
  ADD COLUMN IF NOT EXISTS disclosure_request_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disclosure_response_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disclosure_status TEXT DEFAULT 'not_sent' 
    CHECK (disclosure_status IN ('not_sent', 'sent', 'responded', 'fulfilled'));

-- 3. Add an index to speed up the cron job query
CREATE INDEX IF NOT EXISTS idx_municipalities_disclosure_status ON municipalities(disclosure_status);
