-- Migration: 018_tariff_resolver.sql
-- Description: Creates the caching layer and manual review queue for the network-aware Tariff Resolver.

CREATE TABLE IF NOT EXISTS tariff_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality TEXT NOT NULL,
  tariff_type TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  sub_key TEXT,
  amount_excl_vat DECIMAL NOT NULL,
  source_url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  verified BOOLEAN DEFAULT false,
  
  -- Prevent caching exact duplicate definitions
  UNIQUE(municipality, tariff_type, financial_year, sub_key)
);

-- Enable RLS
ALTER TABLE tariff_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (edge functions hitting this cache need read access)
CREATE POLICY "Public profiles are viewable by everyone."
  ON tariff_cache FOR SELECT
  USING ( true );

-- Service Role Key bypasses RLS for inserting/updating

CREATE TABLE IF NOT EXISTS tariff_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality TEXT NOT NULL,
  tariff_type TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  sub_key TEXT,
  bill_id UUID REFERENCES cases(id) ON DELETE SET NULL, -- Use cases or a specific table depending on constraints
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE tariff_gaps ENABLE ROW LEVEL SECURITY;

-- Public cannot read gaps, only admins (or service role)
-- Service Role bypasses RLS for insert.
