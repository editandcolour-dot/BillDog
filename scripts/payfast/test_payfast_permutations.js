const crypto = require('crypto');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};

const MERCHANT_ID = getEnv('PAYFAST_MERCHANT_ID');
const PASSPHRASE = getEnv('PAYFAST_PASSPHRASE');

const data = {
  merchant_id: MERCHANT_ID, merchant_key: getEnv('PAYFAST_MERCHANT_KEY'),
  return_url: 'https://billdog.co.za', cancel_url: 'https://billdog.co.za', notify_url: 'https://billdog.co.za',
  name_first: 'Test', email_address: 'test@example.com', m_payment_id: '1234',
  amount: '5.00', item_name: 'Billdog', subscription_type: '2', email_confirmation: '0'
};

const sortedData = {}; Object.keys(data).sort().forEach(k => sortedData[k] = data[k]);

function _encode(s) { return encodeURIComponent(s).replace(/%20/g, '+').replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A'); }

async function tryHash(desc, hashFunc) {
  const payload = { ...sortedData, signature: hashFunc(sortedData) };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) p.append(k, v);
  const r = await fetch('https://www.payfast.co.za/eng/process', { method: 'POST', body: p.toString(), headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
  const text = await r.text();
  console.log(desc, '=>', r.status, text.includes('Signature Mismatch') ? 'Mismatch' : text.substring(0, 100).replace(/\n/g, ' '));
}

async function run() {
  await tryHash('RAW NO-ENCODING', (d) => {
    let s = Object.keys(d).map(k => `${k}=${d[k]}`).join('&');
    if (PASSPHRASE) s += `&passphrase=${PASSPHRASE}`;
    return crypto.createHash('md5').update(s).digest('hex');
  });

  await tryHash('URL ENCODED (PHP PARITY)', (d) => {
    let s = Object.keys(d).map(k => `${k}=${_encode(d[k])}`).join('&');
    if (PASSPHRASE) s += `&passphrase=${_encode(PASSPHRASE)}`;
    return crypto.createHash('md5').update(s).digest('hex');
  });
  
  await tryHash('PASS ENCODED / VALUE RAW', (d) => {
    let s = Object.keys(d).map(k => `${k}=${d[k]}`).join('&');
    if (PASSPHRASE) s += `&passphrase=${_encode(PASSPHRASE)}`;
    return crypto.createHash('md5').update(s).digest('hex');
  });
}
run();
