const crypto = require('crypto');
const fs = require('fs');

let envFile = '';
try { envFile = fs.readFileSync('.env.local', 'utf8'); } catch (e) { try { envFile = fs.readFileSync('.env', 'utf8'); } catch (e) {} }

const getEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};

const MERCHANT_ID = getEnv('PAYFAST_MERCHANT_ID');

const data = {
  merchant_id: MERCHANT_ID, merchant_key: getEnv('PAYFAST_MERCHANT_KEY'),
  return_url: 'https://billdog.co.za', cancel_url: 'https://billdog.co.za', notify_url: 'https://billdog.co.za',
  name_first: 'Test', email_address: 'test@example.com', m_payment_id: '1234',
  amount: '5.00', item_name: 'Billdog', subscription_type: '2', email_confirmation: '0'
};

const sortedData = {}; Object.keys(data).sort().forEach(k => sortedData[k] = data[k]);

async function run() {
  // Test completely WITHOUT PASSPHRASE
  let paramString = Object.keys(sortedData).map(k => `${k}=${sortedData[k]}`).join('&');
  
  // NOTE: Notice there is NO append of passphrase here at all
  let signature = crypto.createHash('md5').update(paramString).digest('hex');
  
  // Also try URL ENCODED without passphrase
  function _encode(s) { return encodeURIComponent(s).replace(/%20/g, '+').replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A'); }
  let paramStringEncoded = Object.keys(sortedData).map(k => `${k}=${_encode(sortedData[k])}`).join('&');
  let signatureEncoded = crypto.createHash('md5').update(paramStringEncoded).digest('hex');

  async function testPayfast(sigToTest, desc) {
    const payload = { ...sortedData, signature: sigToTest };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(payload)) p.append(k, v);
    
    const r = await fetch('https://www.payfast.co.za/eng/process', { method: 'POST', body: p.toString(), headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
    const text = await r.text();
    console.log(desc, '=> Status:', r.status, text.includes('Signature Mismatch') || text.includes('1. Generated signature does not match submitted signature.') ? 'Signature Mismatch!' : text.substring(0, 100).replace(/\n/g, ''));
  }
  
  await testPayfast(signature, 'TEST 1: RAW HASH (NO PASSPHRASE)');
  await testPayfast(signatureEncoded, 'TEST 2: URL ENCODED HASH (NO PASSPHRASE)');
}
run();
