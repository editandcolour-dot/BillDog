-- Migration: 025_cases_soft_delete.sql
-- Description: Adds soft-delete support to the cases table via a deleted_at column.
--   Cases with deleted_at IS NOT NULL are excluded from all user-facing queries.
--   Actual row data is preserved for audit trail.

-- 1. Add deleted_at column (nullable = not deleted)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Index for efficient filtering of non-deleted cases
CREATE INDEX IF NOT EXISTS idx_cases_deleted_at ON cases(user_id, deleted_at)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN cases.deleted_at IS 'Soft-delete timestamp. NULL = active. Non-NULL = hidden from user, retained for audit.';

-- ============================================================
-- Rollback
-- ============================================================
-- DROP INDEX IF EXISTS idx_cases_deleted_at;
-- ALTER TABLE cases DROP COLUMN IF EXISTS deleted_at;
