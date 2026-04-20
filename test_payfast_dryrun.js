/**
 * PayFast tokenisation dry-run — zero network calls.
 * Replicates the exact logic from lib/payfast/tokenise.ts
 * 
 * Run: node test_payfast_dryrun.js
 */
const crypto = require('crypto');

// --- PHP-style urlencode parity ---
function payfastUrlEncode(val) {
  return encodeURIComponent(val.trim()).replace(/%20/g, '+');
}

// --- Real env values ---
const MERCHANT_ID   = '33662675';
const MERCHANT_KEY  = '6oxw9pgflqkjs';
const PASSPHRASE    = 'SmellyToad007';
const ITN_URL       = 'https://www.billdog.co.za/api/webhooks/payfast';
const APP_URL       = 'https://www.billdog.co.za';  // production (localhost replaced)

// --- Test user values ---
const NAME_FIRST    = 'Test';
const EMAIL         = 'test@example.com';
const M_PAYMENT_ID  = '1234';

// --- PayFast canonical field order (from Byron's example) ---
const PAYFAST_FIELD_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'email_address',
  'm_payment_id',
  'amount',
  'item_name',
  'subscription_type',
];

const fieldValues = {
  merchant_id:       MERCHANT_ID,
  merchant_key:      MERCHANT_KEY,
  return_url:        `${APP_URL}/dashboard?card=saved`,
  cancel_url:        `${APP_URL}/settings?card=cancelled`,
  notify_url:        ITN_URL,
  name_first:        NAME_FIRST,
  email_address:     EMAIL,
  m_payment_id:      M_PAYMENT_ID,
  amount:            '5.00',
  item_name:         'Billdog - Save Card',
  subscription_type: '2',
};

// Build ordered pairs
const orderedPairs = [];
for (const key of PAYFAST_FIELD_ORDER) {
  const val = fieldValues[key];
  if (val && val !== 'undefined') {
    orderedPairs.push([key, val]);
  }
}

// Build the param string (URL-encoded values, raw passphrase)
const paramString = orderedPairs
  .map(([key, val]) => `${key}=${payfastUrlEncode(val)}`)
  .join('&');

const hashInputString = `${paramString}&passphrase=${PASSPHRASE.trim()}`;

const md5Hash = crypto.createHash('md5').update(hashInputString).digest('hex');

// --- OUTPUT ---
console.log('=== PAYFAST DRY-RUN DIAGNOSTIC ===\n');

console.log('1. HASH INPUT STRING (this is what gets MD5\'d):');
console.log('---');
console.log(hashInputString);
console.log('---\n');

console.log('2. MD5 RESULT:');
console.log(md5Hash);
console.log('');

console.log('3. FORM ACTION:');
console.log('https://www.payfast.co.za/eng/process');
console.log('');

console.log('4. FORM FIELDS (what the browser sends):');
const fields = {};
for (const [key, val] of orderedPairs) {
  fields[key] = val;
}
fields.signature = md5Hash;

for (const [key, val] of Object.entries(fields)) {
  console.log(`  ${key} = ${val}`);
}

console.log('\n5. FIELD ORDER IN HASH STRING:');
orderedPairs.forEach(([key], i) => {
  console.log(`  ${i + 1}. ${key}`);
});

console.log('\n=== END ===');
