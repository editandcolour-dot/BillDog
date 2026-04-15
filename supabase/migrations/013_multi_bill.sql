-- Migration: 013_multi_bill.sql
-- Adds case_bills table for multi-bill upload (up to 36 per case)
-- and cross-analysis columns on cases.

-- ============================================================
-- 1. CREATE case_bills — one row per uploaded bill
-- ============================================================

CREATE TABLE case_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  bill_url        TEXT NOT NULL,
  bill_text       TEXT,
  bill_period     TEXT,
  total_billed    DECIMAL(10,2),
  errors_found    JSONB,
  recoverable     DECIMAL(10,2),
  parse_status    TEXT NOT NULL DEFAULT 'pending'
                    CHECK (parse_status IN ('pending', 'parsing', 'parsed', 'failed')),
  analysis_status TEXT NOT NULL DEFAULT 'pending'
                    CHECK (analysis_status IN ('pending', 'analysing', 'complete', 'failed')),
  sort_order      INT NOT NULL DEFAULT 0,
  original_filename TEXT,
  file_size_bytes INT,
  mime_type       TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE case_bills IS 'Individual bill files for multi-bill cases. One row per uploaded PDF/image.';
COMMENT ON COLUMN case_bills.sort_order IS 'Chronological ordering — auto-sorted by bill_period after analysis.';
COMMENT ON COLUMN case_bills.parse_status IS 'Track text extraction progress per bill.';
COMMENT ON COLUMN case_bills.analysis_status IS 'Track Claude analysis progress per bill.';

-- ============================================================
-- 2. Indexes for performance
-- ============================================================

CREATE INDEX idx_case_bills_case_id ON case_bills(case_id);
CREATE INDEX idx_case_bills_period  ON case_bills(bill_period);

-- ============================================================
-- 3. RLS on case_bills — users can only access via their own cases
-- ============================================================

ALTER TABLE case_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own case bills"
  ON case_bills FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own case bills"
  ON case_bills FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own case bills"
  ON case_bills FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own case bills"
  ON case_bills FOR DELETE TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

-- ============================================================
-- 4. ALTER cases — add cross-analysis fields (additive only)
-- ============================================================

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS cross_analysis      JSONB,
  ADD COLUMN IF NOT EXISTS total_recoverable_all DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS date_range_start    TEXT,
  ADD COLUMN IF NOT EXISTS date_range_end      TEXT;

COMMENT ON COLUMN cases.cross_analysis IS 'Cross-bill pattern analysis JSON (multi-bill cases only).';
COMMENT ON COLUMN cases.total_recoverable_all IS 'Sum of recoverable across all bills in a multi-bill case.';
COMMENT ON COLUMN cases.date_range_start IS 'Earliest bill_period in a multi-bill case.';
COMMENT ON COLUMN cases.date_range_end IS 'Latest bill_period in a multi-bill case.';
