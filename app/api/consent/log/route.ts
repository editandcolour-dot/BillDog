import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/utils/get-client-ip';

const ALLOWED_EVENT_TYPES = new Set([
  'popia_granted',
  'mandate_granted',
  'mandate_revoked',
  'fee_consent_granted',
]);

interface ConsentEventInput {
  event_type: string;
  consent_version?: string | null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const events: ConsentEventInput[] = Array.isArray(body?.events) ? body.events : [];
  if (events.length === 0) {
    return NextResponse.json({ error: 'events array is required' }, { status: 400 });
  }

  for (const e of events) {
    if (!e || typeof e.event_type !== 'string' || !ALLOWED_EVENT_TYPES.has(e.event_type)) {
      return NextResponse.json({ error: `Invalid event_type: ${e?.event_type}` }, { status: 400 });
    }
  }

  const ip = getClientIp(request);
  const ua = request.headers.get('user-agent') ?? null;

  const rows = events.map((e) => ({
    user_id: user.id,
    event_type: e.event_type,
    consent_version: e.consent_version ?? null,
    ip_address: ip,
    user_agent: ua,
  }));

  const { error } = await supabase.from('consent_events').insert(rows);
  if (error) {
    // Don't leak DB error details to the client (audit S-H4).
    console.error('[api/consent/log] insert failed', error);
    return NextResponse.json({ error: 'Unable to record consent event' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
