-- Migration: 038_rls_gapfill.sql
-- Description: Closes RLS coverage gaps surfaced by the 2026-06-01 security audit
--              (finding S-M4). Adds the missing UPDATE/DELETE policies on the
--              user-owned auto-fetch tables and explicitly write-locks the
--              tariff_cache reference table for authenticated users.
--              Service-role bypasses RLS so seed scripts and workers continue
--              to function unchanged.
--
-- Applied to production: 2026-06-01 via Supabase SQL Editor (verified — see
-- AGENT_BRAIN/AUDIT_2026-06-01.md). This file mirrors prod so the local
-- migration history stays consistent.

-- ============================================================
-- municipal_credentials — owners may revoke / delete their own row
-- ============================================================
CREATE POLICY "users_update_own_creds"
  ON municipal_credentials FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_creds"
  ON municipal_credentials FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- scrape_jobs — owners may cancel / delete their own jobs
-- ============================================================
CREATE POLICY "users_update_own_jobs"
  ON scrape_jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_jobs"
  ON scrape_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- scraped_bills — owners may delete their own scraped artefacts
-- ============================================================
CREATE POLICY "users_update_own_scraped"
  ON scraped_bills FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_scraped"
  ON scraped_bills FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- tariff_cache — reference data; authenticated users are READ-ONLY.
-- Service role (seed scripts, research workers) bypasses RLS automatically.
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON tariff_cache FROM authenticated, anon;

-- Belt-and-braces: explicit denying policies in case the table grants are
-- reset by a future Supabase platform migration.
CREATE POLICY "tariff_cache_no_authenticated_writes_ins"
  ON tariff_cache FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "tariff_cache_no_authenticated_writes_upd"
  ON tariff_cache FOR UPDATE TO authenticated USING (false);
CREATE POLICY "tariff_cache_no_authenticated_writes_del"
  ON tariff_cache FOR DELETE TO authenticated USING (false);

-- ============================================================
-- Rollback
-- ============================================================
-- DROP POLICY IF EXISTS "users_update_own_creds"   ON municipal_credentials;
-- DROP POLICY IF EXISTS "users_delete_own_creds"   ON municipal_credentials;
-- DROP POLICY IF EXISTS "users_update_own_jobs"    ON scrape_jobs;
-- DROP POLICY IF EXISTS "users_delete_own_jobs"    ON scrape_jobs;
-- DROP POLICY IF EXISTS "users_update_own_scraped" ON scraped_bills;
-- DROP POLICY IF EXISTS "users_delete_own_scraped" ON scraped_bills;
-- DROP POLICY IF EXISTS "tariff_cache_no_authenticated_writes_ins" ON tariff_cache;
-- DROP POLICY IF EXISTS "tariff_cache_no_authenticated_writes_upd" ON tariff_cache;
-- DROP POLICY IF EXISTS "tariff_cache_no_authenticated_writes_del" ON tariff_cache;
-- GRANT INSERT, UPDATE, DELETE ON tariff_cache TO authenticated;
