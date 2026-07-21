-- Migration: 042_cases_legal_hold.sql
-- Adds the legal-hold flag the 90-day deleted-case purge must respect.
--
-- The cleanup-storage cron hard-purges cases 90 days after soft-deletion
-- (privacy policy v1.2, Section 6 "Deleted cases"). Two carve-outs retain a
-- case regardless: an attached payment record (fee_charged / amount_recovered
-- / payment_charged event) and this explicit legal-hold flag, set manually
-- (service role / SQL editor) when a dispute is subject to proceedings.
--
-- AGENTS.md Rule 5: additive only.

ALTER TABLE cases ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN cases.legal_hold IS
  'Explicit retention hold. true = the 90-day deleted-case purge must skip this case (legal/proceedings). Set manually via service role.';

-- ---------------------------------------------------------------------------
-- ROLLBACK (reference only — never run automatically):
--   ALTER TABLE cases DROP COLUMN IF EXISTS legal_hold;
-- ---------------------------------------------------------------------------
