-- Migration: 022_municipal_autofetch.sql
-- Description: Creates tables for municipal portal auto-fetch feature (Phase 1).
--   municipal_credentials: encrypted portal login credentials per user
--   scrape_jobs: background job tracking for backfill and monthly scraping
--   scraped_bills: individual bill records from automated scraping
--   Also extends consent_events CHECK constraint with autofetch event types.

-- ============================================================
-- 1. CREATE municipal_credentials
-- ============================================================

CREATE TABLE municipal_credentials (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  municipality_id       UUID NOT NULL REFERENCES municipalities(id),
  encrypted_credentials TEXT,                -- AES-256-GCM ciphertext of JSON {username, password}. NULL after revocation.
  encryption_iv         TEXT,                -- hex-encoded IV (unique per encryption). NULL after revocation.
  verified_at           TIMESTAMPTZ,         -- NULL = never verified
  last_login_at         TIMESTAMPTZ,         -- last successful portal login
  last_login_error      TEXT,                -- last failure reason (never contains creds)
  revoked_at            TIMESTAMPTZ,         -- NULL = active
  revocation_reason     TEXT CHECK (revocation_reason IN (
    'user_request', 'mfa_required', 'account_locked',
    'password_change_required', 'permanent_failure'
  )),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, municipality_id)
);

COMMENT ON TABLE municipal_credentials IS 'Encrypted municipal portal credentials for auto-fetch. One row per user per municipality.';
COMMENT ON COLUMN municipal_credentials.encrypted_credentials IS 'AES-256-GCM ciphertext of JSON {username, password}. Never log or expose.';
COMMENT ON COLUMN municipal_credentials.encryption_iv IS 'Hex-encoded 12-byte IV. Unique per encryption operation.';
COMMENT ON COLUMN municipal_credentials.revocation_reason IS 'Why credentials were revoked. user_request = manual, others = auto-revoke on failure.';

CREATE INDEX idx_muni_creds_user ON municipal_credentials(user_id);
CREATE INDEX idx_muni_creds_active ON municipal_credentials(user_id)
  WHERE revoked_at IS NULL AND verified_at IS NOT NULL;

-- RLS: users can read own credentials metadata. All writes via service_role.
ALTER TABLE municipal_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_creds"
  ON municipal_credentials FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. CREATE scrape_jobs
-- ============================================================

CREATE TABLE scrape_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  credential_id     UUID NOT NULL REFERENCES municipal_credentials(id) ON DELETE CASCADE,
  job_type          TEXT NOT NULL CHECK (job_type IN ('backfill', 'monthly')),
  status            TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','running','completed','failed','cancelled')),
  total_bills       INT DEFAULT 0,
  processed_bills   INT DEFAULT 0,
  failed_bills      INT DEFAULT 0,
  error_message     TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE scrape_jobs IS 'Background job tracking for automated bill fetching. One row per scrape run.';
COMMENT ON COLUMN scrape_jobs.job_type IS 'backfill = initial 36-month fetch. monthly = recurring single-bill fetch.';

CREATE INDEX idx_scrape_jobs_user ON scrape_jobs(user_id, created_at DESC);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status) WHERE status IN ('queued','running');

ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_jobs"
  ON scrape_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. CREATE scraped_bills
-- ============================================================

CREATE TABLE scraped_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  credential_id   UUID NOT NULL REFERENCES municipal_credentials(id),
  bill_period     TEXT,
  bill_url        TEXT,                       -- Supabase Storage path
  case_bill_id    UUID REFERENCES case_bills(id),  -- linked after analysis
  status          TEXT NOT NULL DEFAULT 'downloaded'
                    CHECK (status IN ('downloaded','parsed','analysed','skipped','failed')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE scraped_bills IS 'Individual bill records from automated scraping. Links to case_bills after analysis.';
COMMENT ON COLUMN scraped_bills.case_bill_id IS 'FK to case_bills. NULL until bill is analysed and linked to a case.';
COMMENT ON COLUMN scraped_bills.status IS 'skipped = dedup detected user already uploaded this period manually.';

CREATE INDEX idx_scraped_bills_job ON scraped_bills(job_id);
CREATE INDEX idx_scraped_bills_user_period ON scraped_bills(user_id, bill_period);

ALTER TABLE scraped_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_scraped"
  ON scraped_bills FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. Extend consent_events CHECK constraint
-- ============================================================

ALTER TABLE consent_events
  DROP CONSTRAINT IF EXISTS consent_events_event_type_check;
ALTER TABLE consent_events
  ADD CONSTRAINT consent_events_event_type_check
  CHECK (event_type IN (
    'popia_granted','mandate_granted','mandate_revoked','fee_consent_granted',
    'autofetch_granted','autofetch_revoked'
  ));

-- ============================================================
-- Rollback
-- ============================================================
-- ALTER TABLE consent_events DROP CONSTRAINT IF EXISTS consent_events_event_type_check;
-- ALTER TABLE consent_events ADD CONSTRAINT consent_events_event_type_check
--   CHECK (event_type IN ('popia_granted','mandate_granted','mandate_revoked','fee_consent_granted'));
-- DROP TABLE IF EXISTS scraped_bills;
-- DROP TABLE IF EXISTS scrape_jobs;
-- DROP TABLE IF EXISTS municipal_credentials;
