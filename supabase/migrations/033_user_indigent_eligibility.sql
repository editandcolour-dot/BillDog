-- Migration: 033_user_indigent_eligibility.sql
-- Adds indigent_eligible flag to profiles for rebate detection.
--
-- AGENTS.md Rule 5: Additive only.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS indigent_eligible BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.indigent_eligible IS 'Whether the user self-declared as potentially qualifying for indigent rebates. Used by bill validator to detect missing rebates.';

-- ============================================================
-- ROLLBACK (reference only)
-- ============================================================
-- ALTER TABLE profiles DROP COLUMN IF EXISTS indigent_eligible;
