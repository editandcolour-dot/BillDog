-- Phase 12: SEO Municipality Landing Pages
-- Decouples content via the DB for unique SEO pages

ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS ombudsman_contact TEXT;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS average_response_days INTEGER DEFAULT 30;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS common_error_types TEXT[];

COMMENT ON COLUMN municipalities.ombudsman_contact IS 'Escalation contact — verify on municipality website before use';
COMMENT ON COLUMN municipalities.average_response_days IS 'Estimated response days for municipal billing disputes directly affecting SEO copy';
COMMENT ON COLUMN municipalities.common_error_types IS 'Array of strings detailing common billing errors specifically reported for this municipality to enhance localized searches';
