/**
 * POST /api/autofetch/credentials
 *
 * Submit and verify municipal portal credentials.
 * Auth required + prior autofetch consent.
 *
 * Flow:
 * 1. Validate consent exists
 * 2. Check municipality is supported
 * 3. Verify credentials via Playwright login
 * 4. On success: encrypt + store in municipal_credentials
 * 5. On failure: discard credentials, return typed error
 *
 * Phase 1: No backfill enqueue. Returns { verified, credential_id } and stops.
 * Rate limited: 5 per user per hour.
 *
 * SECURITY:
 * - Never log username or password.
 * - Plaintext credentials exist only in-memory during this request.
 * - Encrypted via AES-256-GCM before storage.
 *
 * Source of truth: implementation_plan v3 §2b.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptCredentials } from '@/lib/crypto/credentials';
import { getScraper, isMunicipalitySupported } from '@/lib/scrapers/registry';
import { getRateLimiter, rateLimitExceededResponse } from '@/lib/rate-limit';

const credentialLimiter = getRateLimiter(5, '1 h');

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit
    const { success: withinLimit } = await credentialLimiter.limit(`autofetch-creds:${user.id}`);
    if (!withinLimit) {
      return rateLimitExceededResponse();
    }

    // 3. Parse and validate input
    const body = await request.json();
    const { municipality_id, portal_username, portal_password } = body;

    if (!municipality_id || !portal_username || !portal_password) {
      return NextResponse.json(
        { error: 'municipality_id, portal_username, and portal_password are required' },
        { status: 400 }
      );
    }

    if (typeof portal_username !== 'string' || typeof portal_password !== 'string') {
      return NextResponse.json({ error: 'Credentials must be strings' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 4. Verify autofetch consent exists
    const { data: consentEvents } = await supabaseAdmin
      .from('consent_events')
      .select('event_type')
      .eq('user_id', user.id)
      .in('event_type', ['autofetch_granted', 'autofetch_revoked'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (!consentEvents?.length || consentEvents[0].event_type !== 'autofetch_granted') {
      return NextResponse.json(
        { error: 'Autofetch consent required before submitting credentials' },
        { status: 403 }
      );
    }

    // 5. Check municipality is supported
    // Look up the municipality row to get the slug
    const { data: municipality } = await supabaseAdmin
      .from('municipalities')
      .select('id, name')
      .eq('id', municipality_id)
      .single();

    if (!municipality) {
      return NextResponse.json({ error: 'Municipality not found' }, { status: 404 });
    }

    // Derive slug from municipality name (kebab-case)
    const slug = municipality.name.toLowerCase().replace(/\s+/g, '-');

    if (!isMunicipalitySupported(slug)) {
      return NextResponse.json(
        { error: `Auto-fetch is not yet available for ${municipality.name}` },
        { status: 400 }
      );
    }

    // 6. Check for existing active credential (one per user per municipality)
    const { data: existingCred } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id, revoked_at')
      .eq('user_id', user.id)
      .eq('municipality_id', municipality_id)
      .single();

    if (existingCred && !existingCred.revoked_at) {
      return NextResponse.json(
        { error: 'Active credentials already exist for this municipality. Revoke existing credentials first.' },
        { status: 409 }
      );
    }

    // 7. Verify credentials via scraper (Playwright login)
    console.log(`[autofetch/credentials] Verifying credentials for user ${user.id}, municipality: ${municipality.name}`);

    const scraper = getScraper(slug)!;
    const verifyResult = await scraper.verifyCredentials(portal_username, portal_password);

    if (!verifyResult.success) {
      console.log(`[autofetch/credentials] Verification failed for user ${user.id}: ${verifyResult.errorCode}`);
      return NextResponse.json(
        {
          verified: false,
          error: verifyResult.error,
          errorCode: verifyResult.errorCode,
        },
        { status: 422 }
      );
    }

    // 8. Encrypt credentials
    const { ciphertext, iv } = encryptCredentials(portal_username, portal_password);

    // 9. Store or upsert credential row
    if (existingCred) {
      // Re-activate previously revoked credential
      const { error: updateError } = await supabaseAdmin
        .from('municipal_credentials')
        .update({
          encrypted_credentials: ciphertext,
          encryption_iv: iv,
          verified_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          last_login_error: null,
          revoked_at: null,
          revocation_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCred.id);

      if (updateError) {
        console.error('[autofetch/credentials] Update failed:', updateError.message);
        return NextResponse.json({ error: 'Failed to store credentials' }, { status: 500 });
      }

      console.log(`[autofetch/credentials] Re-activated credential ${existingCred.id} for user ${user.id}`);
      return NextResponse.json({ verified: true, credential_id: existingCred.id });
    }

    // Insert new credential
    const { data: newCred, error: insertError } = await supabaseAdmin
      .from('municipal_credentials')
      .insert({
        user_id: user.id,
        municipality_id,
        encrypted_credentials: ciphertext,
        encryption_iv: iv,
        verified_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError || !newCred) {
      console.error('[autofetch/credentials] Insert failed:', insertError?.message);
      return NextResponse.json({ error: 'Failed to store credentials' }, { status: 500 });
    }

    console.log(`[autofetch/credentials] Stored credential ${newCred.id} for user ${user.id}`);

    // 10. Enqueue backfill job via QStash
    const { qstashClient } = await import('@/lib/qstash/client');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let targetCredId = existingCred ? existingCred.id : (newCred as any).id;

    try {
      await qstashClient.publish({
        url: `${appUrl}/api/autofetch/worker/backfill`,
        body: JSON.stringify({ credential_id: targetCredId }),
        retries: 3,
      });
      console.log(`[autofetch/credentials] Enqueued backfill job for credential ${targetCredId}`);
    } catch (qstashErr) {
      console.error('[autofetch/credentials] Failed to enqueue backfill job:', qstashErr);
      // We don't fail the verification if QStash publish fails, but we log it
    }

    return NextResponse.json({ verified: true, credential_id: targetCredId });

  } catch (error) {
    console.error('[autofetch/credentials] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
