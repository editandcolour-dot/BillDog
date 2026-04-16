-- Migration: 014_coverage_tiers.sql
-- Adds native coverage tier logic and disclosure tracking to case_bills

ALTER TABLE case_bills 
  ADD COLUMN IF NOT EXISTS coverage_tier INT CHECK (coverage_tier IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS pending_reanalysis BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS transparency_report JSONB,
  ADD COLUMN IF NOT EXISTS disclosure_request_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disclosure_request_content JSONB;

COMMENT ON COLUMN case_bills.coverage_tier IS '1=Verified, 2=Monitored, 3=Undisclosed at time of upload';
COMMENT ON COLUMN case_bills.pending_reanalysis IS 'True for Tier 3 bills queued for reanalysis when data arrives';
COMMENT ON COLUMN case_bills.transparency_report IS 'Snapshot of the transparency report generated for Tier 3';

-- Provide index for Cron job lookups
CREATE INDEX IF NOT EXISTS idx_cases_municipality ON cases(municipality);
