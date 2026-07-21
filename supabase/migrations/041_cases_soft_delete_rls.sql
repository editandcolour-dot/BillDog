-- Migration: 041_cases_soft_delete_rls.sql
-- Hide soft-deleted cases from EVERY user-client read at the policy level.
--
-- ROOT CAUSE FIXED HERE:
--   025 added cases.deleted_at ("excluded from all user-facing queries"), but
--   only the dashboard query and bulk-delete ever referenced it. Every other
--   user-facing read (case detail page, success page, GET /api/cases/[id],
--   export, send-letter, generate-letter, analyse) still served deleted
--   cases. Filtering at the SELECT policy fixes the whole class in one place
--   instead of patching ~15 queries.
--
-- The UPDATE policy is tightened the same way so a deleted case cannot be
-- mutated through the user client either. Service-role (admin) access is
-- unaffected — background jobs that must see deleted rows still can, and the
-- ones that must NOT act on them carry explicit .is('deleted_at', null)
-- filters in code (escalation engine, autofetch workers).
--
-- AGENTS.md Rule 5: policy replacement only; no table/column changes.

DROP POLICY IF EXISTS "Users can view own cases" ON cases;
CREATE POLICY "Users can view own cases"
  ON cases FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update own cases" ON cases;
CREATE POLICY "Users can update own cases"
  ON cases FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ROLLBACK (reference only — never run automatically):
--   DROP POLICY IF EXISTS "Users can view own cases" ON cases;
--   CREATE POLICY "Users can view own cases"
--     ON cases FOR SELECT USING (auth.uid() = user_id);
--   DROP POLICY IF EXISTS "Users can update own cases" ON cases;
--   CREATE POLICY "Users can update own cases"
--     ON cases FOR UPDATE USING (auth.uid() = user_id)
--     WITH CHECK (auth.uid() = user_id);
-- ---------------------------------------------------------------------------
