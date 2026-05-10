-- Migration: 023_profile_id_number.sql
-- Description: Add Vault-backed ID number storage to profiles (user-level, not case-level).
--   Fixes the bug where ID number is prompted per-case instead of stored once.
--   Adds id_secret_id (FK to vault.secrets) and id_collected_at to profiles.
--   Creates RPCs for storing and checking profile-level ID.

-- ============================================================
-- 1. ADD COLUMNS to profiles
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS id_secret_id UUID REFERENCES vault.secrets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_collected_at TIMESTAMPTZ;

-- ============================================================
-- 2. RPC: store_profile_id — stores ID in Vault, links to profile
-- ============================================================

CREATE OR REPLACE FUNCTION store_profile_id(id_number text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_secret_id uuid;
  caller_id uuid;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has an ID stored
  IF EXISTS (SELECT 1 FROM profiles WHERE id = caller_id AND id_secret_id IS NOT NULL) THEN
    RAISE EXCEPTION 'ID number already stored. Use edit flow to update.';
  END IF;

  new_secret_id := vault.create_secret(
    id_number,
    'profile_id_' || caller_id,
    'Profile ID Number'
  );

  UPDATE profiles
  SET id_secret_id = new_secret_id,
      id_collected_at = now(),
      updated_at = now()
  WHERE id = caller_id;

  RETURN new_secret_id;
END;
$$;

-- ============================================================
-- 3. RPC: has_profile_id — boolean check (no decryption)
-- ============================================================

CREATE OR REPLACE FUNCTION has_profile_id()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND id_secret_id IS NOT NULL
  );
END;
$$;

-- ============================================================
-- Rollback
-- ============================================================
-- DROP FUNCTION IF EXISTS has_profile_id();
-- DROP FUNCTION IF EXISTS store_profile_id(text);
-- ALTER TABLE profiles DROP COLUMN IF EXISTS id_collected_at;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS id_secret_id;
