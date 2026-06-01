const crypto = require('crypto');
function payfastUrlEncode(str) { return encodeURIComponent(str).replace(/%20/g, '+').replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A'); }

async function test(data) {
  const sortedData = {}; Object.keys(data).sort().forEach(k => { sortedData[k] = data[k]; });
  const paramString = Object.entries(sortedData).map(([k, v]) => k + '=' + payfastUrlEncode(v)).join('&');
  const withPassphrase = paramString + '&passphrase=' + payfastUrlEncode('SmellyToad007');
  console.log('Param string:', paramString);
  sortedData.signature = crypto.createHash('md5').update(withPassphrase).digest('hex');
  const formBody = Object.entries(sortedData).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  const res = await fetch('https://www.payfast.co.za/eng/process', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
  const text = await res.text();
  const alertMatch = text.match(/<div[^>]*class=["']error-block__message["'][^>]*>([\s\S]*?)<\/div>/i);
  if(alertMatch) console.log('ERROR IS: ', alertMatch[1].replace(/<[^>]+>/g, '').trim());
  else console.log('Status: ', res.status, text.substring(0, 50));
}

(async () => {
   const base = {
     merchant_id: '33662675',
     merchant_key: '6oxw9pgflqkjs',
     return_url: 'https://www.billdog.co.za/dashboard?card=saved',
     cancel_url: 'https://www.billdog.co.za/settings?card=cancelled',
     notify_url: 'https://www.billdog.co.za/api/webhooks/payfast',
     name_first: 'Test',
     email_address: 'test@example.com',
     m_payment_id: 'a0cc52f6-86c0-48e0-bb17-8e65e6484e03',
     amount: '5.00',
     item_name: 'Billdog - Save Card',
     subscription_type: '2'
   };
   await test(base);
})();
