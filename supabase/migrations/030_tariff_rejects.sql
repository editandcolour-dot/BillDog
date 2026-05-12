-- Migration: 030_tariff_rejects.sql
-- Creates table for VeriCite Stage 2/3 rejections.
-- Surfaces failed verifications for admin review.
--
-- AGENTS.md Rule 5: Additive only. No tables dropped or renamed.

CREATE TABLE tariff_rejects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id     TEXT NOT NULL,
  billing_month       DATE,
  utility_type        TEXT NOT NULL,
  raw_model_response  JSONB,
  rejection_reason    TEXT NOT NULL,
  sources             JSONB,
  created_at          TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE tariff_rejects IS 'VeriCite verification failures. Rows where the model proposed a rate but the source could not be verified.';
COMMENT ON COLUMN tariff_rejects.rejection_reason IS 'e.g. source_url_404, rate_not_found_in_source, rates_disagree_across_sources, source_too_generic';

CREATE INDEX idx_tariff_rejects_lookup ON tariff_rejects(municipality_id, utility_type);
CREATE INDEX idx_tariff_rejects_created ON tariff_rejects(created_at);

ALTER TABLE tariff_rejects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ROLLBACK (reference only)
-- ============================================================
-- DROP TABLE IF EXISTS tariff_rejects;
