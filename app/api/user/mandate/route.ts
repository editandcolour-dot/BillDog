// POST   = grant or re-grant mandate (used by signup + post-revocation re-grant)
// DELETE = revoke mandate (sets mandate_revoked_at, then sends confirmation email)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CURRENT_MANDATE_CONSENT } from '@/lib/popia/consent';
import { getResendClient } from '@/lib/resend/client';
import { getClientIp } from '@/lib/utils/get-client-ip';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { error } = await supabase
    .from('profiles')
    .update({
      mandate_consent_at: new Date().toISOString(),
      mandate_consent_version: CURRENT_MANDATE_CONSENT.version,
      mandate_revoked_at: null,
    })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Append-only audit log (best-effort; failure does not roll back the profile change)
  try {
    await supabase.from('consent_events').insert({
      user_id: user.id,
      event_type: 'mandate_granted',
      consent_version: CURRENT_MANDATE_CONSENT.version,
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent'),
    });
  } catch (logErr) {
    console.error('[api/user/mandate] consent_events log failed', logErr);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const revokedAt = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .update({ mandate_revoked_at: revokedAt })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Append-only audit log (best-effort)
  try {
    await supabase.from('consent_events').insert({
      user_id: user.id,
      event_type: 'mandate_revoked',
      consent_version: null,
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent'),
    });
  } catch (logErr) {
    console.error('[api/user/mandate] consent_events log failed', logErr);
  }

  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: 'Billdog <support@billdog.co.za>',
      to: user.email,
      subject: 'Your Billdog mandate has been revoked',
      text: `Your authorisation for Billdog to act on your behalf in municipal billing disputes has been revoked as of ${revokedAt}. Active disputes will not advance further. To re-grant, visit https://www.billdog.co.za/account.`,
    });
  } catch (e) {
    console.error('[api/user/mandate] confirmation email failed', e);
  }

  return NextResponse.json({ ok: true });
}
