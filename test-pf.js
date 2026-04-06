const crypto = require('crypto');

const baseUrl = 'https://sandbox.payfast.co.za/eng/process';
const data = {
    merchant_id: '33662675',
    merchant_key: '6oxw9pgflqkjs',
    return_url: 'http://localhost:3000/dashboard?card=saved',
    cancel_url: 'http://localhost:3000/settings?card=cancelled',
    notify_url: 'https://www.billdog.co.za/api/webhooks/payfast',
    name_first: 'User',
    email_address: 'editandcolour@gmail.com',
    m_payment_id: '1234',
    amount: '0.00',
    item_name: 'Billdog - Save Card',
    subscription_type: '2',
    email_confirmation: '0'
};

const cleanData = {};
for (const ObjectEntry of Object.entries(data)) {
    const k = ObjectEntry[0];
    const v = ObjectEntry[1];
    if (v !== '') cleanData[k] = v;
}

const paramString = Object.entries(cleanData)
    .map(function(arr) {
        return arr[0] + '=' + encodeURIComponent(arr[1].trim()).replace(/%20/g, '+');
    })
    .join('&');

const withPassphrase = paramString + '&passphrase=' + encodeURIComponent('SmellyToad007');
const signature = crypto.createHash('md5').update(withPassphrase).digest('hex');

cleanData.signature = signature;

const queryString = Object.entries(cleanData)
    .map(function(arr) {
        return arr[0] + '=' + encodeURIComponent(arr[1]).replace(/%20/g, '+');
    })
    .join('&');

const fullUrl = baseUrl + '?' + queryString;

fetch(fullUrl).then(function(res) {
    return res.text();
}).then(function(txt) {
    console.log("Response text length: " + txt.length);
    if(txt.includes("glitch somewhere")) {
        console.log("PAYFAST GLITCH ERROR 500 DETECTED!");
    } else if (txt.includes("signature")) {
        console.log("PAYFAST SIGNATURE ERROR DETECTED!");
    } else {
        console.log("PAYFAST RENDERED CHECKOUT PAGE (SUCCESS!)");
    }
}).catch(function(err) {
    console.error(err);
});
