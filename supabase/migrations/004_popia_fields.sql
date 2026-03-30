-- Migration 004: POPIA compliance fields
-- Adds marketing_consent and deletion_scheduled_at to profiles table.
-- consent_given, consent_timestamp, consent_version already exist from 001_initial_schema.sql.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;
