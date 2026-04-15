import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function sign(data: Record<string, string>, passphrase: string | null): string {
  const paramString = Object.entries(data)
    .filter(([k, v]) => k !== 'signature' && v !== '' && v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, '+')}`)
    .join('&');
  
  const raw = passphrase 
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : paramString;
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

    const merchantId = process.env['PAYFAST_MERCHANT_ID'] ?? '';
    const merchantKey = process.env['PAYFAST_MERCHANT_KEY'] ?? '';
    const passphrase = process.env['PAYFAST_PASSPHRASE'] ?? '';
    const itnUrl = process.env['PAYFAST_ITN_URL'] ?? '';
    const isSandbox = String(process.env['PAYFAST_SANDBOX']).trim() === 'true';
    const action = isSandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    let appUrl = String(process.env['NEXT_PUBLIC_APP_URL'] ?? '').trim();
    if (!appUrl || appUrl === 'undefined') appUrl = 'https://billdog.co.za';
    if (appUrl.endsWith('/')) appUrl = appUrl.slice(0, -1);

    const firstName = String(profile?.full_name ?? 'User').split(' ')[0].trim();

    // ============ DIAGNOSTIC INFO ============
    const diag = {
      merchant_id_length: merchantId.length,
      merchant_key_length: merchantKey.length,
      passphrase_length: passphrase.length,
      passphrase_first2: passphrase.slice(0, 2) + '***',
      passphrase_last2: '***' + passphrase.slice(-2),
      passphrase_has_whitespace: passphrase !== passphrase.trim(),
      itn_url: itnUrl,
      app_url: appUrl,
      action_url: action,
      sandbox_raw: String(process.env['PAYFAST_SANDBOX']),
      sandbox_resolved: isSandbox,
    };

    // ============ VARIANT 1: With passphrase (encoded) ============
    const data1: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${appUrl}/dashboard?card=saved`,
      cancel_url: `${appUrl}/settings?card=cancelled`,
      notify_url: itnUrl,
      name_first: firstName,
      email_address: user.email ?? '',
      m_payment_id: user.id,
      amount: '5.00',
      item_name: 'Billdog Test',
      subscription_type: '2',
    };
    data1.signature = sign(data1, passphrase);

    // ============ VARIANT 2: WITHOUT passphrase ============
    const data2 = { ...data1 };
    delete (data2 as Record<string, string | undefined>).signature;
    data2.signature = sign(data2, null);

    // ============ VARIANT 3: Bare minimum WITH passphrase ============
    const data3: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${appUrl}/dashboard?card=saved`,
      cancel_url: `${appUrl}/settings?card=cancelled`,
      notify_url: itnUrl,
      amount: '5.00',
      item_name: 'Billdog Test',
    };
    data3.signature = sign(data3, passphrase);

    // ============ VARIANT 4: Bare minimum WITHOUT passphrase ============
    const data4 = { ...data3 };
    delete (data4 as Record<string, string | undefined>).signature;
    data4.signature = sign(data4, null);

    // ============ VARIANT 5: NO signature at all ============
    const data5: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${appUrl}/dashboard?card=saved`,
      cancel_url: `${appUrl}/settings?card=cancelled`,
      notify_url: itnUrl,
      amount: '5.00',
      item_name: 'Billdog Test',
    };

    const variants = [
      { name: '1: Tokenisation + passphrase', data: data1, color: '#333' },
      { name: '2: Tokenisation + NO passphrase', data: data2, color: '#1A56DB' },
      { name: '3: Basic payment + passphrase', data: data3, color: '#F97316' },
      { name: '4: Basic payment + NO passphrase', data: data4, color: '#10B981' },
      { name: '5: Basic payment + NO signature at all', data: data5, color: '#EF4444' },
    ];

    const diagHtml = Object.entries(diag)
      .map(([k, v]) => `<tr><td style="font-weight:bold;padding:2px 12px 2px 0">${k}</td><td style="font-family:monospace">${v}</td></tr>`)
      .join('');

    const formsHtml = variants.map((v) => {
      const fields = Object.entries(v.data)
        .map(([k, val]) => `<input type="hidden" name="${k}" value="${val}" />`)
        .join('\n');
      const fieldList = Object.entries(v.data)
        .map(([k, val]) => `<span style="font-size:11px"><b>${k}</b>=${k === 'signature' ? val.slice(0,12) + '...' : val}</span>`)
        .join(' &nbsp;|&nbsp; ');
      return `
        <div style="border:2px solid ${v.color};border-radius:12px;padding:16px;margin-bottom:12px">
          <h3 style="margin:0 0 4px 0;color:${v.color}">${v.name}</h3>
          <p style="margin:0 0 8px 0;font-size:11px;color:#666">${fieldList}</p>
          <form method="POST" action="${action}">
            ${fields}
            <button type="submit" style="background:${v.color};color:white;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:bold">
              Submit →
            </button>
          </form>
        </div>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html><head><title>PayFast Debug v3</title></head>
<body style="font-family:sans-serif;max-width:750px;margin:30px auto;padding:0 20px">
  <h1>🔧 PayFast Debug v3</h1>
  
  <div style="background:#FEF3C7;border:2px solid #F59E0B;border-radius:12px;padding:16px;margin-bottom:20px">
    <h3 style="margin:0 0 8px 0">⚙️ Environment Diagnostics</h3>
    <table style="font-size:13px">${diagHtml}</table>
  </div>

  <p><strong>Action URL:</strong> <code>${action}</code></p>
  <p style="color:#666">Click each submit button. First one that shows a PayFast card page = answer found.</p>
  
  ${formsHtml}
</body></html>`;

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    console.error('[payfast/test-form] Error:', error);
    return new NextResponse(`Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
}
