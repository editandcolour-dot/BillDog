-- Migration: 037_autofetch_cycle.sql
-- Description: Cycle-aware polling for municipal autofetch.
--
-- Adds four columns to `municipal_credentials` so the daily dispatcher
-- (formerly `monthly`) can skip credentials whose next bill isn't due yet.
--
--   expected_issue_day  — median day-of-month the municipality issues bills
--                          (1–31, NULL until we have a sample).
--   cycle_confidence    — 'tight' (IQR ≤ 2 days), 'loose' (IQR > 2), or
--                          'unknown' (no sample yet). Used to decide a safety
--                          margin when computing next_check_at.
--   last_known_period   — most recent `bill_period` we've successfully fetched
--                          for this credential. Lets the dispatcher dedup
--                          before enqueuing.
--   next_check_at       — earliest UTC time we should poll again. Dispatcher
--                          filters on `next_check_at <= now()`. NULL means
--                          "check on next dispatch run" (e.g. freshly verified
--                          credentials before backfill has learned the cycle).

ALTER TABLE municipal_credentials
  ADD COLUMN expected_issue_day INT
    CHECK (expected_issue_day BETWEEN 1 AND 31),
  ADD COLUMN cycle_confidence   TEXT
    CHECK (cycle_confidence IN ('tight', 'loose', 'unknown')),
  ADD COLUMN last_known_period  TEXT,
  ADD COLUMN next_check_at      TIMESTAMPTZ;

COMMENT ON COLUMN municipal_credentials.expected_issue_day IS
  'Median day-of-month the municipality issues bills. Seeded from backfill PDFs, rolled forward on each successful fetch.';
COMMENT ON COLUMN municipal_credentials.cycle_confidence IS
  'tight = IQR ≤ 2 days across observed issue dates; loose = > 2; unknown = no sample.';
COMMENT ON COLUMN municipal_credentials.last_known_period IS
  'Most recent bill_period string successfully downloaded. Used by daily dispatcher for cheap dedup.';
COMMENT ON COLUMN municipal_credentials.next_check_at IS
  'Earliest UTC time the daily dispatcher should re-poll this credential. NULL = check on next run.';

-- Composite partial index for the daily dispatcher's exact query.
CREATE INDEX idx_muni_creds_due ON municipal_credentials(next_check_at)
  WHERE revoked_at IS NULL AND verified_at IS NOT NULL;
