const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const testEmail = 'payfast_' + Date.now() + '@billdog.co.za';
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  if (authError) {
    console.error('Error creating user', authError);
    return;
  }
  
  const user = authData.user;
  console.log('Created User:', testEmail, 
              '| Password: TestPassword123!', 
              '| ID:', user.id);

  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    full_name: 'PayFast Test User',
    email: testEmail,
    property_type: 'residential',
    municipality: 'City of Cape Town',
    account_number: '123456789'
  });

  if (profileError) {
     console.error('Profile err', profileError);
  }

  const { data: caseData, error: caseError } = await supabase.from('cases').insert({
    user_id: user.id,
    status: 'sent',
    municipality: 'City of Cape Town',
    account_number: '123456789',
    total_billed: 10000,
    recoverable: 2000,
    fee_charged: null,
    amount_recovered: null,
    letter_content: 'Test letter',
    bill_period: 'March 2026'
  }).select().single();

  if (caseError) {
     console.error('Case err', caseError);
  } else {
     console.log('Created Case:', caseData.id);
  }
}

run();
