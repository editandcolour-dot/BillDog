import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTokeniseFormData } from '@/lib/payfast/tokenise';

export const dynamic = 'force-dynamic';

/**
 * TEMPORARY diagnostic endpoint — returns a raw HTML form
 * so we can test PayFast submission in isolation.
 * DELETE THIS FILE after debugging is complete.
 */
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

    const formData = generateTokeniseFormData({
      userId: user.id,
      userEmail: user.email ?? '',
      userName: profile?.full_name ?? 'User',
    });

    // Build a visible HTML form so we can inspect every field before submitting
    const fieldRows = Object.entries(formData.fields)
      .map(([k, v]) => `<tr><td style="font-weight:bold;padding:4px 12px 4px 0">${k}</td><td style="padding:4px 0"><input name="${k}" value="${v}" style="width:500px;padding:4px;font-family:monospace" /></td></tr>`)
      .join('\n');

    const html = `<!DOCTYPE html>
<html>
<head><title>PayFast Diagnostic Form</title></head>
<body style="font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px">
  <h1>PayFast Diagnostic Form</h1>
  <p style="color:#666">This form submits directly to PayFast. All fields are editable for testing.</p>
  <p><strong>Action URL:</strong> <code>${formData.action}</code></p>
  <form method="POST" action="${formData.action}">
    <table style="border-collapse:collapse">${fieldRows}</table>
    <br/>
    <button type="submit" style="background:#F97316;color:white;border:none;padding:12px 32px;font-size:16px;border-radius:8px;cursor:pointer">
      Submit to PayFast →
    </button>
  </form>
  <hr style="margin-top:40px"/>
  <p style="color:#999;font-size:12px">DELETE this endpoint after debugging.</p>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('[payfast/test-form] Error:', error);
    return new NextResponse('Error generating test form', { status: 500 });
  }
}
