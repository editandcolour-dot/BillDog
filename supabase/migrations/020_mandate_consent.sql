-- Migration: 020_mandate_consent.sql (CORRECTED)
-- Description: Adds mandate consent fields, captures account-holder ID at first
--   dispute via Vault (name = case_id::text, matching existing get_poppi_id),
--   and provides can_submit_dispute() gate.
--
-- IMPORTANT: This migration also adds tracking columns and the missing
-- store_account_holder_id and wipe_poppi_ids functions that migration 008
-- never created. get_poppi_id already exists and is left untouched.

-- ============================================================
-- 1. Mandate consent columns on profiles
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mandate_consent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mandate_consent_version TEXT,
  ADD COLUMN IF NOT EXISTS mandate_revoked_at      TIMESTAMPTZ;

COMMENT ON COLUMN profiles.mandate_consent_at      IS 'When user authorised Billdog to act as their representative. NULL = no mandate.';
COMMENT ON COLUMN profiles.mandate_consent_version IS 'Versioned mandate text accepted (e.g. v1).';
COMMENT ON COLUMN profiles.mandate_revoked_at      IS 'When user revoked mandate. NULL = active mandate.';

-- ============================================================
-- 2. ID tracking columns on cases (Vault-aligned, no secret_id ref)
-- ============================================================
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS id_collected_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS id_deletion_scheduled_at TIMESTAMPTZ;

COMMENT ON COLUMN cases.id_collected_at          IS 'When account-holder ID was captured into Vault. NULL = not yet captured.';
COMMENT ON COLUMN cases.id_deletion_scheduled_at IS 'When the Vault secret should be wiped (set automatically on case resolution).';

-- ============================================================
-- 3. store_account_holder_id — captures ID into Vault under name = case_id
-- Mirrors how get_poppi_id reads it back. Idempotent guard prevents overwrite.
-- ============================================================
CREATE OR REPLACE FUNCTION store_account_holder_id(target_case_id uuid, id_number text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  case_owner uuid;
  new_secret_id uuid;
BEGIN
  -- Ownership check
  SELECT user_id INTO case_owner FROM cases WHERE id = target_case_id;
  IF case_owner IS NULL OR (case_owner != auth.uid() AND auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Idempotent: refuse if already captured for this case
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = target_case_id::text) THEN
    RAISE EXCEPTION 'ID already captured for this case';
  END IF;

  -- Store with name = case_id::text so get_poppi_id can retrieve it
  new_secret_id := vault.create_secret(
    id_number,
    target_case_id::text,
    'Account-holder ID for dispute verification'
  );

  -- Mark capture timestamp
  UPDATE cases
     SET id_collected_at = now()
   WHERE id = target_case_id;

  RETURN new_secret_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION store_account_holder_id(uuid, text) FROM public;
GRANT  EXECUTE ON FUNCTION store_account_holder_id(uuid, text) TO authenticated;

-- ============================================================
-- 4. Schedule deletion 30 days after case resolution
-- ============================================================
CREATE OR REPLACE FUNCTION schedule_id_deletion_on_resolve()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'resolved'
     AND OLD.status IS DISTINCT FROM 'resolved'
     AND NEW.id_collected_at IS NOT NULL
     AND NEW.id_deletion_scheduled_at IS NULL
  THEN
    NEW.id_deletion_scheduled_at := now() + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schedule_id_deletion ON cases;
CREATE TRIGGER trg_schedule_id_deletion
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION schedule_id_deletion_on_resolve();

-- ============================================================
-- 5. wipe_poppi_ids — cron function to delete expired secrets from Vault
-- AG assumed this existed; it doesn't. Creating it now.
-- Run via pg_cron daily (set up separately in Supabase dashboard).
-- ============================================================
CREATE OR REPLACE FUNCTION wipe_poppi_ids()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wiped_count INTEGER := 0;
  c RECORD;
BEGIN
  FOR c IN
    SELECT id FROM cases
    WHERE id_deletion_scheduled_at IS NOT NULL
      AND id_deletion_scheduled_at <= now()
      AND id_collected_at IS NOT NULL
  LOOP
    -- Remove the Vault secret
    DELETE FROM vault.secrets WHERE name = c.id::text;
    -- Clear tracking on the case
    UPDATE cases
       SET id_collected_at = NULL,
           id_deletion_scheduled_at = NULL
     WHERE id = c.id;
    wiped_count := wiped_count + 1;
  END LOOP;
  RETURN wiped_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION wipe_poppi_ids() FROM public;
GRANT  EXECUTE ON FUNCTION wipe_poppi_ids() TO service_role;

-- ============================================================
-- 6. can_submit_dispute — hard gate used by API routes
-- ============================================================
CREATE OR REPLACE FUNCTION can_submit_dispute(target_case_id uuid)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
SET search_path = public
AS $$
  SELECT
    p.consent_given          = true
    AND p.mandate_consent_at IS NOT NULL
    AND p.mandate_revoked_at IS NULL
    AND c.id_collected_at    IS NOT NULL
  FROM cases c
  JOIN profiles p ON p.id = c.user_id
  WHERE c.id = target_case_id;
$$;

REVOKE EXECUTE ON FUNCTION can_submit_dispute(uuid) FROM public;
GRANT  EXECUTE ON FUNCTION can_submit_dispute(uuid) TO authenticated, service_role;

-- ============================================================
-- Rollback
-- ============================================================
-- DROP FUNCTION IF EXISTS can_submit_dispute(uuid);
-- DROP FUNCTION IF EXISTS wipe_poppi_ids();
-- DROP TRIGGER IF EXISTS trg_schedule_id_deletion ON cases;
-- DROP FUNCTION IF EXISTS schedule_id_deletion_on_resolve();
-- DROP FUNCTION IF EXISTS store_account_holder_id(uuid, text);
-- ALTER TABLE cases
--   DROP COLUMN IF EXISTS id_deletion_scheduled_at,
--   DROP COLUMN IF EXISTS id_collected_at;
-- ALTER TABLE profiles
--   DROP COLUMN IF EXISTS mandate_revoked_at,
--   DROP COLUMN IF EXISTS mandate_consent_version,
--   DROP COLUMN IF EXISTS mandate_consent_at;
