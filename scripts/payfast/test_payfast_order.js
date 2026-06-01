const crypto = require('crypto');
const fs = require('fs');

let envFile = '';
try { envFile = fs.readFileSync('.env.local', 'utf8'); } catch (e) { try { envFile = fs.readFileSync('.env', 'utf8'); } catch (e) {} }

const getEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};

const MERCHANT_ID = getEnv('PAYFAST_MERCHANT_ID');
const MERCHANT_KEY = getEnv('PAYFAST_MERCHANT_KEY');
const PASSPHRASE = getEnv('PAYFAST_PASSPHRASE');

// EXACT ORDER AS PER PAYFAST DOCS
const dataMap = new Map();
dataMap.set('merchant_id', MERCHANT_ID);
dataMap.set('merchant_key', MERCHANT_KEY);
dataMap.set('return_url', 'https://www.billdog.co.za/dashboard?card=saved');
dataMap.set('cancel_url', 'https://www.billdog.co.za/settings?card=cancelled');
dataMap.set('notify_url', 'https://www.billdog.co.za/api/webhooks/payfast');
dataMap.set('name_first', 'Test');
dataMap.set('email_address', 'test@example.com');
dataMap.set('m_payment_id', '1234');
dataMap.set('amount', '5.00');
dataMap.set('item_name', 'Billdog - Save Card');
dataMap.set('subscription_type', '2');
dataMap.set('email_confirmation', '0');

function _encode(s) { return encodeURIComponent(s).replace(/%20/g, '+').replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A'); }

async function run() {
  let s_raw = '';
  let s_encoded = '';
  
  for (const [k, v] of dataMap) {
    if (s_raw !== '') { s_raw += '&'; s_encoded += '&'; }
    s_raw += `${k}=${v}`;
    s_encoded += `${k}=${_encode(v)}`;
  }
  
  if (PASSPHRASE) {
    s_raw += `&passphrase=${PASSPHRASE}`;
    s_encoded += `&passphrase=${_encode(PASSPHRASE)}`;
  }

  const sig_raw = crypto.createHash('md5').update(s_raw).digest('hex');
  const sig_encoded = crypto.createHash('md5').update(s_encoded).digest('hex');

  async function test(sig, desc) {
    const p = new URLSearchParams();
    for (const [k, v] of dataMap) { p.append(k, v); }
    p.append('signature', sig);

    const r = await fetch('https://www.payfast.co.za/eng/process', { method: 'POST', body: p.toString(), headers: {'Content-Type': 'application/x-www-form-urlencoded'} });
    const text = await r.text();
    console.log(`[${desc}] Status:`, r.status, text.includes('Signature Mismatch') || text.includes('Generated signature does not match submitted signature.') ? 'Mismatch!' : text.substring(0, 100).replace(/\n/g, ''));
  }

  await test(sig_raw, 'RAW HASH (DOCUMENTED ORDER)');
  await test(sig_encoded, 'URL ENCODED HASH (DOCUMENTED ORDER)');
}

run();
