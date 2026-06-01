const crypto = require('crypto');
const fs = require('fs');

// Read env directly
let envFile = '';
try { envFile = fs.readFileSync('.env.local', 'utf8'); } catch (e) { envFile = fs.readFileSync('.env', 'utf8'); }

const getEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};

const MERCHANT_ID = getEnv('PAYFAST_MERCHANT_ID');
const MERCHANT_KEY = getEnv('PAYFAST_MERCHANT_KEY');
const PASSPHRASE = getEnv('PAYFAST_PASSPHRASE');
const ITN_URL = getEnv('PAYFAST_ITN_URL');
const appUrl = 'https://www.billdog.co.za';

const data = {
  merchant_id: MERCHANT_ID,
  merchant_key: MERCHANT_KEY,
  return_url: `${appUrl}/dashboard?card=saved`,
  cancel_url: `${appUrl}/settings?card=cancelled`,
  notify_url: ITN_URL,
  name_first: 'Test',
  email_address: 'test@example.com',
  m_payment_id: '1234',
  amount: '5.00',
  item_name: 'Billdog - Save Card',
  subscription_type: '2',
  email_confirmation: '0'
};

const sortedData = {};
Object.keys(data).sort().forEach(key => {
  if (data[key] !== '' && data[key] !== 'undefined' && data[key] !== undefined) {
    sortedData[key] = data[key];
  }
});

const paramString = Object.keys(sortedData)
  .map(key => `${key}=${(sortedData[key] || '').trim()}`)
  .join('&');

const withPassphrase = PASSPHRASE ? `${paramString}&passphrase=${PASSPHRASE.trim()}` : paramString;

// --- THIS IS THE REQUESTED LOG ---
console.log('');
console.log('--- RAW HASH STRING REQUESTED BY USER ---');
console.log(withPassphrase);
console.log('-----------------------------------------');
console.log('');

sortedData.signature = crypto.createHash('md5').update(withPassphrase).digest('hex');

async function run() {
  const formParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sortedData)) {
    formParams.append(key, value);
  }

  const endpoint = 'https://www.payfast.co.za/eng/process';
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formParams.toString()
  });

  const text = await res.text();
  if (text.includes('1. Generated signature does not match submitted signature.')) {
     console.log('Response Error: Signature Mismatch!');
  }
}

run().catch(console.error);
