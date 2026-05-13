-- Migration: 034_get_profile_id_decrypted.sql
-- Description: Add RPC to decrypt profile-level ID from Vault.
--   Used by capture-id bridge logic to copy profile-level ID to case-level Vault
--   when a user already has an ID on file from signup.
--
-- Also update get_poppi_id to fallback to profile-level Vault key if no
-- case-level entry exists (defensive, prevents future namespace drift).

-- ============================================================
-- 1. get_profile_id_decrypted — decrypts profile-level ID
-- ============================================================

CREATE OR REPLACE FUNCTION get_profile_id_decrypted()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_id TEXT;
  caller_id uuid;
  secret_id uuid;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the Vault secret ID from the profile
  SELECT p.id_secret_id INTO secret_id
  FROM profiles p
  WHERE p.id = caller_id;

  IF secret_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Decrypt the secret
  SELECT decrypted_secret INTO decrypted_id
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN decrypted_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_profile_id_decrypted() FROM public;
GRANT  EXECUTE ON FUNCTION get_profile_id_decrypted() TO authenticated;

-- ============================================================
-- 2. Update get_poppi_id — add fallback to profile-level Vault
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_poppi_id(target_case_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_id TEXT;
  case_owner UUID;
BEGIN
  -- Verify the user owns this case
  SELECT user_id INTO case_owner
  FROM cases
  WHERE id = target_case_id;

  IF case_owner IS NULL OR (case_owner != auth.uid() AND auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized access to ID';
  END IF;

  -- Primary: look for case-level Vault secret (name = case_id)
  SELECT decrypted_secret INTO decrypted_id
  FROM vault.decrypted_secrets
  WHERE name = target_case_id::text;

  IF decrypted_id IS NOT NULL THEN
    RETURN decrypted_id;
  END IF;

  -- Fallback: look for profile-level Vault secret (name = profile_id_{user_id})
  SELECT decrypted_secret INTO decrypted_id
  FROM vault.decrypted_secrets
  WHERE name = 'profile_id_' || case_owner::text;

  RETURN decrypted_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_poppi_id(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_poppi_id(UUID) TO authenticated;

-- ============================================================
-- Rollback
-- ============================================================
-- DROP FUNCTION IF EXISTS get_profile_id_decrypted();
-- -- Restore original get_poppi_id from migration 010:
-- CREATE OR REPLACE FUNCTION public.get_poppi_id(target_case_id UUID) ...
