-- Migration 036: Server-side profile creation trigger
--
-- Fixes the consent timestamp race condition:
-- 1. Supabase auth creates the user in auth.users
-- 2. This trigger immediately creates a profiles row with basic fields
-- 3. The SignupForm then .upsert()s consent fields onto the existing row
-- Without this trigger, if the client-side insert fails or is delayed,
-- the profile row may never get consent timestamps, causing
-- CONSENT_OR_ID_MISSING blocks on letter generation.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
