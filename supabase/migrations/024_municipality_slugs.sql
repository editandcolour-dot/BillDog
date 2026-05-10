-- Migration: 024_municipality_slugs.sql
-- Description: Adds a slug column to municipalities for canonical identifier-based lookups.
--   The slug is the single canonical key used across the application:
--   - sa-metros.json metro IDs
--   - lib/scrapers/configs/{slug}.json
--   - lib/parsers/configs/{slug}.json
--   - lib/tariff/configs/{slug}.json
--   - frontend form submissions
--
--   The UUID `id` column remains for internal FK joins (municipal_credentials, etc.).
--   All user-facing API lookups must use slug, not UUID.

-- 1. Add slug column (nullable first to populate existing rows)
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Populate slugs for existing rows based on known name → slug mappings
UPDATE municipalities SET slug = 'city-of-cape-town' WHERE name = 'City of Cape Town';
UPDATE municipalities SET slug = 'city-of-johannesburg' WHERE name = 'City of Johannesburg';
UPDATE municipalities SET slug = 'city-of-tshwane' WHERE name = 'City of Tshwane';
UPDATE municipalities SET slug = 'ethekwini' WHERE name = 'eThekwini';
UPDATE municipalities SET slug = 'ekurhuleni' WHERE name = 'Ekurhuleni';
UPDATE municipalities SET slug = 'nelson-mandela-bay' WHERE name = 'Nelson Mandela Bay';
UPDATE municipalities SET slug = 'buffalo-city' WHERE name = 'Buffalo City';
UPDATE municipalities SET slug = 'mangaung' WHERE name = 'Mangaung';

-- 3. Enforce NOT NULL + UNIQUE now that all rows are populated
ALTER TABLE municipalities ALTER COLUMN slug SET NOT NULL;
ALTER TABLE municipalities ADD CONSTRAINT municipalities_slug_unique UNIQUE (slug);

-- 4. Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_municipalities_slug ON municipalities(slug);

COMMENT ON COLUMN municipalities.slug IS 'Canonical kebab-case identifier. Matches sa-metros.json IDs and scraper/parser/tariff config filenames.';

-- ============================================================
-- Rollback
-- ============================================================
-- DROP INDEX IF EXISTS idx_municipalities_slug;
-- ALTER TABLE municipalities DROP CONSTRAINT IF EXISTS municipalities_slug_unique;
-- ALTER TABLE municipalities DROP COLUMN IF EXISTS slug;
