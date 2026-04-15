import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function sign(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.entries(data)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, '+')}`)
    .join('&');
  const raw = `${paramString}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

function signNoEncodePassphrase(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.entries(data)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, '+')}`)
    .join('&');
  const raw = `${paramString}&passphrase=${passphrase.trim()}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized — log in first', { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const merchantId = process.env['PAYFAST_MERCHANT_ID']!;
    const merchantKey = process.env['PAYFAST_MERCHANT_KEY']!;
    const passphrase = process.env['PAYFAST_PASSPHRASE']!;
    const isSandbox = String(process.env['PAYFAST_SANDBOX']).trim() === 'true';
    const action = isSandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    let appUrl = String(process.env['NEXT_PUBLIC_APP_URL']).trim();
    if (!appUrl || appUrl === 'undefined') appUrl = 'https://www.billdog.co.za';
    if (appUrl.endsWith('/')) appUrl = appUrl.slice(0, -1);

    const firstName = String(profile?.full_name ?? 'User').split(' ')[0].trim();
    const email = user.email ?? '';

    // =============== VARIANT A: Full (current) with encoded passphrase ===============
    const dataA: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${appUrl}/dashboard?card=saved`,
      cancel_url: `${appUrl}/settings?card=cancelled`,
      notify_url: String(process.env['PAYFAST_ITN_URL']).trim(),
      name_first: firstName,
      email_address: email,
      m_payment_id: user.id,
      amount: '5.00',
      item_name: 'Billdog - Save Card',
      subscription_type: '2',
      email_confirmation: '0',
    };
    dataA.signature = sign(dataA, passphrase);

    // =============== VARIANT B: Full with UN-encoded passphrase ===============
    const dataB = { ...dataA };
    delete (dataB as Record<string, string | undefined>).signature;
    dataB.signature = signNoEncodePassphrase(dataB, passphrase);

    // =============== VARIANT C: No email_confirmation, encoded passphrase ===============
    const dataC: Record<string, string> = { ...dataA };
    delete (dataC as Record<string, string | undefined>).email_confirmation;
    delete (dataC as Record<string, string | undefined>).signature;
    dataC.signature = sign(dataC, passphrase);

    // =============== VARIANT D: No email_confirmation, UN-encoded passphrase ===============
    const dataD: Record<string, string> = { ...dataC };
    delete (dataD as Record<string, string | undefined>).signature;
    dataD.signature = signNoEncodePassphrase(dataD, passphrase);

    // =============== VARIANT E: BARE MINIMUM (no subscription, no email_confirmation) ===============
    const dataE: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${appUrl}/dashboard?card=saved`,
      cancel_url: `${appUrl}/settings?card=cancelled`,
      notify_url: String(process.env['PAYFAST_ITN_URL']).trim(),
      name_first: firstName,
      email_address: email,
      amount: '5.00',
      item_name: 'Billdog Test Payment',
    };
    dataE.signature = sign(dataE, passphrase);

    // =============== VARIANT F: BARE MINIMUM with UN-encoded passphrase ===============
    const dataF: Record<string, string> = { ...dataE };
    delete (dataF as Record<string, string | undefined>).signature;
    dataF.signature = signNoEncodePassphrase(dataF, passphrase);

    const variants = [
      { name: 'A: Full + encoded passphrase (current)', data: dataA },
      { name: 'B: Full + RAW passphrase', data: dataB },
      { name: 'C: No email_confirmation + encoded passphrase', data: dataC },
      { name: 'D: No email_confirmation + RAW passphrase', data: dataD },
      { name: 'E: BARE MINIMUM (no sub_type) + encoded passphrase', data: dataE },
      { name: 'F: BARE MINIMUM (no sub_type) + RAW passphrase', data: dataF },
    ];

    const formsHtml = variants.map((v, i) => {
      const fields = Object.entries(v.data)
        .map(([k, val]) => `<input type="hidden" name="${k}" value="${val}" />`)
        .join('\n');
      const fieldList = Object.entries(v.data)
        .map(([k, val]) => `<tr><td style="padding:2px 8px 2px 0;font-weight:bold;font-size:12px">${k}</td><td style="font-size:12px;font-family:monospace">${k === 'signature' ? val.slice(0,10) + '...' : val}</td></tr>`)
        .join('\n');
      return `
        <div style="border:2px solid ${i < 2 ? '#999' : i < 4 ? '#F97316' : '#10B981'};border-radius:12px;padding:16px;margin-bottom:16px">
          <h3 style="margin:0 0 8px 0">${v.name}</h3>
          <table style="margin-bottom:12px">${fieldList}</table>
          <form method="POST" action="${action}">
            ${fields}
            <button type="submit" style="background:${i < 2 ? '#333' : i < 4 ? '#F97316' : '#10B981'};color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:bold">
              Submit Variant ${v.name.charAt(0)} →
            </button>
          </form>
        </div>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html><head><title>PayFast Multi-Variant Test</title></head>
<body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px">
  <h1>PayFast Multi-Variant Test</h1>
  <p style="color:#666">Try each variant top-to-bottom. The first one that works tells us what's wrong.</p>
  <p><strong>Action URL:</strong> <code>${action}</code></p>
  <hr/>
  ${formsHtml}
  <hr/><p style="color:#999;font-size:12px">DELETE this endpoint after debugging.</p>
</body></html>`;

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    console.error('[payfast/test-form] Error:', error);
    return new NextResponse('Error generating test forms', { status: 500 });
  }
}
