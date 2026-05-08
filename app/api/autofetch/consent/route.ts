/**
 * POST /api/autofetch/consent
 *
 * Records autofetch consent in the consent_events audit log.
 * Auth required. No subscription gate — auto-fetch is free.
 *
 * Records: event_type = 'autofetch_granted', IP, user-agent, consent version.
 *
 * Source of truth: implementation_plan v3 §2a.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CONSENT_VERSION = 'autofetch_v1';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extract request metadata for audit trail
    const ip = request.headers.get('cf-connecting-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 3. Check for existing active consent (idempotent)
    const supabaseAdmin = createAdminClient();
    const { data: existingConsent } = await supabaseAdmin
      .from('consent_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'autofetch_granted')
      .order('created_at', { ascending: false })
      .limit(1);

    // Check that the most recent autofetch event isn't a revocation
    const { data: latestEvent } = await supabaseAdmin
      .from('consent_events')
      .select('event_type')
      .eq('user_id', user.id)
      .in('event_type', ['autofetch_granted', 'autofetch_revoked'])
      .order('created_at', { ascending: false })
      .limit(1);

    const alreadyConsented =
      existingConsent &&
      existingConsent.length > 0 &&
      latestEvent?.[0]?.event_type === 'autofetch_granted';

    if (alreadyConsented) {
      return NextResponse.json({ consented: true, message: 'Consent already recorded' });
    }

    // 4. Record consent event (append-only via service_role)
    const { error: insertError } = await supabaseAdmin
      .from('consent_events')
      .insert({
        user_id: user.id,
        event_type: 'autofetch_granted',
        consent_version: CONSENT_VERSION,
        ip_address: ip,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error('[autofetch/consent] Insert failed:', insertError.message);
      return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 });
    }

    console.log(`[autofetch/consent] Recorded autofetch consent for user ${user.id}`);
    return NextResponse.json({ consented: true });

  } catch (error) {
    console.error('[autofetch/consent] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
