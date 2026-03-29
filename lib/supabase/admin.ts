import { createClient } from '@supabase/supabase-js';

// NEVER import this in client code
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('[FATAL] Missing Supabase URL or Service Role Key');
  }

  // Uses the @supabase/supabase-js client, not the @supabase/ssr package
  // because service role clients do not need to manage cookies.
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
