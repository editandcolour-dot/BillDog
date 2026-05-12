-- Migration: 031_municipalities_dispute_procedure.sql
-- Adds dispute_procedure JSONB column to municipalities table.
-- Seeds data for 8 SA metro municipalities.
--
-- AGENTS.md Rule 5: Additive only. No columns dropped.

-- ============================================================
-- 1. Add dispute_procedure JSONB column
-- ============================================================

ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS dispute_procedure JSONB;

COMMENT ON COLUMN municipalities.dispute_procedure IS 'Municipality-specific dispute procedure data: bylaw citation, lodgement address, Section 62 appeal details, reference number requirements.';

-- ============================================================
-- 2. Seed procedure data for 8 SA metros
-- ============================================================

UPDATE municipalities SET dispute_procedure = '{
  "written_required": true,
  "lodgement_address": "accounts@capetown.gov.za",
  "ombudsman_email": "ombudsman@capetown.gov.za",
  "bylaw_citation": "Item 7 of the City of Cape Town Credit Control and Debt Collection Policy",
  "average_payment_required": true,
  "sec62_appeal_deadline_days": 21,
  "sec62_appeal_recipient": "The Municipal Manager, City of Cape Town",
  "reference_number_required": true,
  "dispute_portal_url": "https://www.capetown.gov.za/City-Connect/Register/queries-and-complaints"
}'::jsonb WHERE name = 'City of Cape Town';

UPDATE municipalities SET dispute_procedure = '{
  "written_required": true,
  "lodgement_address": "queries@joburg.org.za",
  "ombudsman_email": "ombudsman@joburg.org.za",
  "bylaw_citation": "City of Johannesburg Credit Control and Debt Collection By-law, Section 12",
  "average_payment_required": true,
  "sec62_appeal_deadline_days": 21,
  "sec62_appeal_recipient": "The City Manager, City of Johannesburg",
  "reference_number_required": true,
  "dispute_portal_url": null
}'::jsonb WHERE name = 'City of Johannesburg';

UPDATE municipalities SET dispute_procedure = '{
  "written_required": true,
  "lodgement_address": "accounts@tshwane.gov.za",
  "ombudsman_email": null,
  "bylaw_citation": "City of Tshwane Credit Control and Debt Collection Policy, Clause 8",
  "average_payment_required": true,
  "sec62_appeal_deadline_days": 21,
  "sec62_appeal_recipient": "The City Manager, City of Tshwane",
  "reference_number_required": true,
  "dispute_portal_url": null
}'::jsonb WHERE name = 'City of Tshwane';

UPDATE municipalities SET dispute_procedure = '{
  "written_required": true,
  "lodgement_address": "revenue@durban.gov.za",
  "ombudsman_email": null,
  "bylaw_citation": "eThekwini Municipality Revenue Collection By-law, Section 10",
  "average_payment_required": true,
  "sec62_appeal_deadline_days": 21,
  "sec62_appeal_recipient": "The City Manager, eThekwini Municipality",
  "reference_number_required": true,
  "dispute_portal_url": null
}'::jsonb WHERE name LIKE '%eThekwini%' OR name LIKE '%Durban%';

UPDATE municipalities SET dispute_procedure = '{
  "written_required": true,
  "lodgement_address": "revenue@ekurhuleni.gov.za",
  "ombudsman_email": null,
  "bylaw_citation": "Ekurhuleni Metropolitan Municipality Credit Control and Debt Collection Policy",
  "average_payment_required": true,
  "sec62_appeal_deadline_days": 21,
  "sec62_appeal_recipient": "The City Manager, Ekurhuleni Metropolitan Municipality",
  "reference_number_required": true,
  "dispute_portal_url": null
}'::jsonb WHERE name LIKE '%Ekurhuleni%';

UPDATE municipalities SET dispute_procedure = '{
  "written_required": true,
  "lodgement_address": "accounts@mandelametro.gov.za",
  "ombudsman_email": null,
  "bylaw_citation": "Nelson Mandela Bay Municipality Credit Control By-law, Section 11",
  "average_payment_required": true,
  "sec62_appeal_deadline_days": 21,
  "sec62_appeal_recipient": "The Municipal Manager, Nelson Mandela Bay Municipality",
  "reference_number_required": true,
  "dispute_portal_url": null
}'::jsonb WHERE name LIKE '%Nelson Mandela%' OR name LIKE '%NMBM%';

UPDATE municipalities SET dispute_procedure = '{
  "written_required": true,
  "lodgement_address": "revenue@buffalocity.gov.za",
  "ombudsman_email": null,
  "bylaw_citation": "Buffalo City Metropolitan Municipality Credit Control and Debt Collection By-law",
  "average_payment_required": true,
  "sec62_appeal_deadline_days": 21,
  "sec62_appeal_recipient": "The Municipal Manager, Buffalo City Metropolitan Municipality",
  "reference_number_required": true,
  "dispute_portal_url": null
}'::jsonb WHERE name LIKE '%Buffalo City%' OR name LIKE '%BCM%';

UPDATE municipalities SET dispute_procedure = '{
  "written_required": true,
  "lodgement_address": "revenue@mangaung.co.za",
  "ombudsman_email": null,
  "bylaw_citation": "Mangaung Metropolitan Municipality Credit Control and Debt Collection Policy",
  "average_payment_required": true,
  "sec62_appeal_deadline_days": 21,
  "sec62_appeal_recipient": "The Municipal Manager, Mangaung Metropolitan Municipality",
  "reference_number_required": true,
  "dispute_portal_url": null
}'::jsonb WHERE name LIKE '%Mangaung%';

-- ============================================================
-- ROLLBACK (reference only)
-- ============================================================
-- ALTER TABLE municipalities DROP COLUMN IF EXISTS dispute_procedure;
