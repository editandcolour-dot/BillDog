-- profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  municipality TEXT,
  account_number TEXT,
  property_type TEXT CHECK (property_type IN ('residential', 'commercial')),
  payfast_token TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  consent_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- cases table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'uploading' 
    CHECK (status IN ('uploading', 'analysing', 'letter_ready', 'sent', 'acknowledged', 'resolved', 'escalated', 'closed')),
  bill_url TEXT,
  bill_text TEXT,
  municipality TEXT,
  account_number TEXT,
  bill_period TEXT,
  total_billed DECIMAL(10,2),
  errors_found JSONB,
  recoverable DECIMAL(10,2),
  letter_content TEXT,
  letter_sent_at TIMESTAMPTZ,
  municipality_email TEXT,
  resolved_at TIMESTAMPTZ,
  amount_recovered DECIMAL(10,2),
  fee_charged DECIMAL(10,2),
  prescription_warnings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for cases
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cases"
  ON cases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cases"
  ON cases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases"
  ON cases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- municipalities table
CREATE TABLE municipalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  province TEXT NOT NULL,
  dispute_email TEXT NOT NULL,
  dispute_phone TEXT,
  ombudsman_email TEXT,
  typical_response_days INTEGER DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy for municipalities
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view municipalities"
  ON municipalities FOR SELECT
  TO authenticated
  USING (true);

-- Seed data for municipalities
INSERT INTO municipalities 
  (name, province, dispute_email, dispute_phone) 
VALUES
  ('City of Cape Town', 'Western Cape', 'accounts@capetown.gov.za', '0860103089'),
  ('City of Johannesburg', 'Gauteng', 'joburgconnect@joburg.org.za', '0860562874'),
  ('City of Tshwane', 'Gauteng', 'meterrecords@tshwane.gov.za', '0123589999'),
  ('eThekwini', 'KwaZulu-Natal', 'revline@durban.gov.za', '0313245000'),
  ('Ekurhuleni', 'Gauteng', 'callcentre@ekurhuleni.gov.za', '0860543000'),
  ('Nelson Mandela Bay', 'Eastern Cape', 'customercare@mandelametro.gov.za', '0415065555'),
  ('Buffalo City', 'Eastern Cape', 'customercare@buffalocity.gov.za', '0437052000'),
  ('Mangaung', 'Free State', 'enquiry@mangaung.co.za', '0800111300');
