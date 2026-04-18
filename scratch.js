async function run() {
  const crypto = require('crypto');
  function payfastUrlEncode(str) {
    return encodeURIComponent(str).replace(/%20/g, '+').replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A');
  }

  const base = { merchant_id: '33662675', merchant_key: '6oxw9pgflqkjs', item_name: 'Billdog - Save Card' };

  async function testPay(data) {
    const sortedData = {}; Object.keys(data).sort().forEach(k => { sortedData[k] = data[k]; });
    const paramString = Object.entries(sortedData).map(([k, v]) => k + '=' + payfastUrlEncode(v)).join('&');
    const withPassphrase = paramString + '&passphrase=' + payfastUrlEncode('SmellyToad007');
    sortedData.signature = crypto.createHash('md5').update(withPassphrase).digest('hex');
    const formBody = Object.entries(sortedData).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');

    const res = await fetch('https://www.payfast.co.za/eng/process', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
    const text = await res.text();
    const isOk = !text.includes('400 Bad Request');
    if(!isOk) {
        const match = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if(match) return match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 80);
        return 'FAILED';
    }
    return 'OK';
  }

  console.log('amount=0.00:', await testPay({ ...base, subscription_type: '2', amount: '0.00' }));
  console.log('amount=5.00:', await testPay({ ...base, subscription_type: '2', amount: '5.00' }));
  console.log('amount=10.00:', await testPay({ ...base, subscription_type: '2', amount: '10.00' }));
  console.log('amount=""   :', await testPay({ ...base, subscription_type: '2', amount: '' }));
  
  const noAmountData = { ...base, subscription_type: '2' };
  console.log('amount=OMITTED:', await testPay(noAmountData));
}
run();
