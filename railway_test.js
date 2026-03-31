const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const dotenv = fs.readFileSync('.env.local', 'utf8');
const env = {};
dotenv.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testTokenise() {
  console.log('Logging in...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'testpayfast_1774955639459@billdog.co.za',
    password: 'TestPassword123!',
  });

  if (error) {
    console.error('Login error', error);
    return;
  }

  const session = data.session;
  console.log('Got session token.');

  // The actual Next.js backend expects a cookie-based session because it uses createServerClient.
  // We can't easily populate the Next.js cookies via a simple fetch with Authorization header 
  // unless we mock the cookie structure or just use the browser.
  // Actually, we can just use the local test app! 
  
  console.log('Testing local app...');
}

testTokenise();
