-- Migration: 026_fix_deletion_cascade.sql
-- Description: Fixes POPIA account deletion failure caused by missing ON DELETE CASCADE
--   on scrape_jobs.user_id and scraped_bills.user_id (migration 022).
--   Also makes cases.user_id and consent_events.user_id nullable for anonymisation.
--
-- Root cause: When auth.users is deleted, Postgres cascades to profiles, which cascades
-- to child tables. But scrape_jobs and scraped_bills had default RESTRICT behaviour,
-- causing the entire transaction to roll back. Zero data was deleted.
--
-- Additionally, scraped_bills.credential_id referenced municipal_credentials(id)
-- without CASCADE, creating a second blocker when municipal_credentials cascades.

-- ============================================================
-- 1. Fix scrape_jobs.user_id FK — add ON DELETE CASCADE
-- ============================================================
ALTER TABLE scrape_jobs
  DROP CONSTRAINT scrape_jobs_user_id_fkey;

ALTER TABLE scrape_jobs
  ADD CONSTRAINT scrape_jobs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================================
-- 2. Fix scraped_bills.user_id FK — add ON DELETE CASCADE
-- ============================================================
ALTER TABLE scraped_bills
  DROP CONSTRAINT scraped_bills_user_id_fkey;

ALTER TABLE scraped_bills
  ADD CONSTRAINT scraped_bills_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================================
-- 3. Fix scraped_bills.credential_id FK — add ON DELETE CASCADE
--    (municipal_credentials cascades from profiles; scraped_bills
--     must not block that cascade)
-- ============================================================
ALTER TABLE scraped_bills
  DROP CONSTRAINT scraped_bills_credential_id_fkey;

ALTER TABLE scraped_bills
  ADD CONSTRAINT scraped_bills_credential_id_fkey
    FOREIGN KEY (credential_id) REFERENCES municipal_credentials(id) ON DELETE CASCADE;

-- ============================================================
-- 4. Make cases.user_id nullable for anonymisation
--    (anonymised cases retain financial figures but lose user link)
-- ============================================================
ALTER TABLE cases ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================
-- 5. Make consent_events.user_id nullable for anonymisation
--    (POPIA section 14(2) — retain consent evidence with user_id stripped)
-- ============================================================
ALTER TABLE consent_events ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================
-- 6. Update consent_events FK to SET NULL instead of CASCADE
--    (prevents profile cascade from deleting consent evidence)
-- ============================================================
ALTER TABLE consent_events
  DROP CONSTRAINT consent_events_user_id_fkey;

ALTER TABLE consent_events
  ADD CONSTRAINT consent_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================
-- 7. Update cases FK to SET NULL instead of CASCADE
--    (prevents profile cascade from deleting anonymised cases)
-- ============================================================
ALTER TABLE cases
  DROP CONSTRAINT cases_user_id_fkey;

ALTER TABLE cases
  ADD CONSTRAINT cases_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================
-- Rollback
-- ============================================================
-- ALTER TABLE cases DROP CONSTRAINT cases_user_id_fkey;
-- ALTER TABLE cases ADD CONSTRAINT cases_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- ALTER TABLE cases ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE consent_events DROP CONSTRAINT consent_events_user_id_fkey;
-- ALTER TABLE consent_events ADD CONSTRAINT consent_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- ALTER TABLE consent_events ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE scraped_bills DROP CONSTRAINT scraped_bills_credential_id_fkey;
-- ALTER TABLE scraped_bills ADD CONSTRAINT scraped_bills_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES municipal_credentials(id);
-- ALTER TABLE scraped_bills DROP CONSTRAINT scraped_bills_user_id_fkey;
-- ALTER TABLE scraped_bills ADD CONSTRAINT scraped_bills_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
-- ALTER TABLE scrape_jobs DROP CONSTRAINT scrape_jobs_user_id_fkey;
-- ALTER TABLE scrape_jobs ADD CONSTRAINT scrape_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
