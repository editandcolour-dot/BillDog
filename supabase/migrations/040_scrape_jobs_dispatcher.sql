-- Migration: 040_scrape_jobs_dispatcher.sql
-- Let the daily dispatcher's own job rows persist.
--
-- ROOT CAUSE FIXED HERE:
--   app/api/autofetch/worker/daily/route.ts records a run-level row
--     { user_id: <zero-uuid sentinel>, credential_id: null, job_type: 'daily_dispatcher' }
--   which 022's schema rejects THREE ways:
--     (a) job_type CHECK only allows ('backfill','monthly');
--     (b) credential_id is NOT NULL;
--     (c) the zero-UUID user_id violates the FK to profiles(id).
--   The insert error was never checked, so the dispatcher's 2-hour in-flight
--   guard and its run accounting have silently never worked.
--
-- FIX (relaxing/additive only — AGENTS.md Rule 5: no drops, no renames):
--   extend the CHECK with 'daily_dispatcher', and make the two per-credential
--   identity columns nullable — a dispatcher run belongs to no user and no
--   credential. The route switches its sentinel user_id to NULL.
--
-- RLS note: "users_read_own_jobs" (auth.uid() = user_id) never matches a NULL
-- user_id, so dispatcher rows stay invisible to end users — intended. Workers
-- read/write via the service-role client.

-- ---------------------------------------------------------------------------
-- 1. Replace the inline job_type CHECK from 022 (auto-named — match by its
--    definition rather than a guessed name).
-- ---------------------------------------------------------------------------
DO $$
DECLARE con_name text;
BEGIN
  SELECT c.conname INTO con_name
  FROM pg_constraint c
  WHERE c.conrelid = 'scrape_jobs'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%job_type%'
  LIMIT 1;
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE scrape_jobs DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE scrape_jobs
  ADD CONSTRAINT scrape_jobs_job_type_check
  CHECK (job_type IN ('backfill', 'monthly', 'daily_dispatcher'));

-- ---------------------------------------------------------------------------
-- 2. Dispatcher rows are run-level, not per-user / per-credential.
-- ---------------------------------------------------------------------------
ALTER TABLE scrape_jobs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE scrape_jobs ALTER COLUMN credential_id DROP NOT NULL;

COMMENT ON COLUMN scrape_jobs.job_type IS
  'backfill = initial 36-month fetch. monthly = recurring single-bill fetch. daily_dispatcher = run-level row for the daily fan-out (NULL user_id/credential_id).';

-- ---------------------------------------------------------------------------
-- ROLLBACK (reference only — never run automatically):
--   ALTER TABLE scrape_jobs DROP CONSTRAINT IF EXISTS scrape_jobs_job_type_check;
--   ALTER TABLE scrape_jobs ADD CONSTRAINT scrape_jobs_job_type_check
--     CHECK (job_type IN ('backfill','monthly'));
--   -- NOT NULL can only be restored after DELETEing dispatcher rows:
--   -- DELETE FROM scrape_jobs WHERE job_type = 'daily_dispatcher';
--   -- ALTER TABLE scrape_jobs ALTER COLUMN user_id SET NOT NULL;
--   -- ALTER TABLE scrape_jobs ALTER COLUMN credential_id SET NOT NULL;
-- ---------------------------------------------------------------------------
