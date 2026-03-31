-- Migration: 008_encrypted_id.sql
-- Description: Enable Vault extension and add columns for Public Protector ID collection.

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

ALTER TABLE cases 
  ADD COLUMN IF NOT EXISTS id_secret_id uuid REFERENCES vault.secrets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS id_deletion_scheduled_at timestamptz;

-- Create an RPC to safely insert secrets into Vault and return the UUID, 
-- bypassing PostgREST schema mapping issues.
CREATE OR REPLACE FUNCTION store_poppi_id(case_id uuid, id_number text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_secret_id uuid;
BEGIN
  -- Insert into vault securely (only service_role or functions can do this)
  new_secret_id := vault.create_secret(
    id_number,          -- secret value
    'pp_id_' || case_id, -- name
    'POPIA ID Capture'   -- description
  );

  -- Update cases table 
  UPDATE cases 
  SET 
    id_secret_id = new_secret_id,
    id_collected_at = now(),
    id_deletion_scheduled_at = now() + interval '30 days',
    escalation_stage = 4,
    next_action_at = now()
  WHERE id = case_id;

  RETURN new_secret_id;
END;
$$;

-- Create an RPC to safely retrieve the secret
CREATE OR REPLACE FUNCTION get_poppi_id(case_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_val text;
BEGIN
  -- Fetch the secret string based on the case's secret_id
  SELECT v.decrypted_secret
  INTO secret_val
  FROM vault.decrypted_secrets v
  JOIN cases c ON c.id_secret_id = v.id
  WHERE c.id = case_id;

  RETURN secret_val;
END;
$$;

-- Create an RPC to permanently wipe the secret
CREATE OR REPLACE FUNCTION wipe_poppi_ids()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int := 0;
  expired_record RECORD;
BEGIN
  FOR expired_record IN 
    SELECT id, id_secret_id 
    FROM cases 
    WHERE id_secret_id IS NOT NULL 
    AND id_deletion_scheduled_at <= now()
  LOOP
    -- Delete from vault
    DELETE FROM vault.secrets WHERE id = expired_record.id_secret_id;
    
    -- Nullify on cases table
    UPDATE cases 
    SET id_secret_id = NULL 
    WHERE id = expired_record.id;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$;
