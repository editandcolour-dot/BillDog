const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf8');
const env = {};
dotenv.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const email = `testpayfast_${Date.now()}@billdog.co.za`;
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };
  
  console.log('Creating user...');
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password: 'TestPassword123!', email_confirm: true })
  });
  
  const userData = await res.json();
  if (!userData.id) { console.error('Failed to create user', userData); return; }
  const userId = userData.id;
  
  console.log('Inserting profile...');
  await fetch(`${url}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({ id: userId, full_name: 'PF Tester', email, property_type: 'residential', municipality: 'City of Cape Town', account_number: '123' })
  });
  
  console.log('Inserting case...');
  const cr = await fetch(`${url}/rest/v1/cases`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({ 
      user_id: userId, 
      status: 'letter_ready', 
      municipality: 'City of Cape Town', 
      account_number: '123', 
      total_billed: 1000, 
      recoverable: 200, 
      fee_charged: null,
      bill_period: 'March 2026',
      letter_content: 'Test letter',
      errors_found: [{ line_item: 'Tariff', expected_amount: 100, amount_charged: 300, issue: 'Wrong tariff', legal_basis: 'Sec 102', recoverable: true }]
    })
  });
  
  const caseData = await cr.json();
  console.log(`\nTEST USER CREATED SUCCESSFULLY!`);
  console.log(`Email: ${email}`);
  console.log(`Password: TestPassword123!`);
  console.log(`Case ID: ${caseData[0].id}`);
}
run();
