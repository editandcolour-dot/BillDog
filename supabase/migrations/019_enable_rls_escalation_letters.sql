-- Migration: 019_enable_rls_escalation_letters.sql
-- Description: Enables RLS on public.escalation_letters and adds ownership-gated
--   SELECT / INSERT / UPDATE policies. Mirrors the case_events pattern from 003.
--   No DELETE policy — admin client only, matching the cases table pattern.
-- Advisor: Resolves rls_disabled_in_public for public.escalation_letters.

ALTER TABLE escalation_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own escalation letters"
  ON escalation_letters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = escalation_letters.case_id
        AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own escalation letters"
  ON escalation_letters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = escalation_letters.case_id
        AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own escalation letters"
  ON escalation_letters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = escalation_letters.case_id
        AND cases.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = escalation_letters.case_id
        AND cases.user_id = auth.uid()
    )
  );

-- ============================================================
-- Rollback
-- ============================================================
-- DROP POLICY "Users can update own escalation letters" ON escalation_letters;
-- DROP POLICY "Users can insert own escalation letters" ON escalation_letters;
-- DROP POLICY "Users can view own escalation letters"   ON escalation_letters;
-- ALTER TABLE escalation_letters DISABLE ROW LEVEL SECURITY;
