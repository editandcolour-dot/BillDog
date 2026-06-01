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
 * Source of truth: implementation_plan v3 Â§2b.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptCredentials } from '@/lib/crypto/credentials';
import { getScraper, isMunicipalitySupported } from '@/lib/scrapers/registry';
import { getRateLimiter, rateLimitExceededResponse } from '@/lib/rate-limit';
import { getMetroByName } from '@/lib/municipalities/sa-metros';

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
    const { municipality_id: municipality_slug, portal_username, portal_password } = body;

    if (!municipality_slug || !portal_username || !portal_password) {
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
    // Look up the municipality row by slug (canonical identifier from frontend)
    const { data: municipality } = await supabaseAdmin
      .from('municipalities')
      .select('id, name, slug')
      .eq('slug', municipality_slug)
      .single();

    if (!municipality) {
      return NextResponse.json({ error: 'Municipality not found' }, { status: 404 });
    }

    const slug = municipality.slug;

    // Check metro config for discovery status
    const metroConfig = getMetroByName(municipality.name);
    const isLive = isMunicipalitySupported(slug);
    const isDiscoveryPending = metroConfig?.scraper_status === 'discovery_pending';

    if (!isLive && !isDiscoveryPending) {
      return NextResponse.json(
        { error: `Auto-fetch is not yet available for ${municipality.name}` },
        { status: 400 }
      );
    }

    // 6. Check for existing active credential (one per user per municipality)
    const { data: existingCred } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id, revoked_at, last_login_error')
      .eq('user_id', user.id)
      .eq('municipality_id', municipality.id)
      .single();

    // Block POST only when there's a *healthy* active credential. A credential
    // that's active but marked stale (last_login_error set â€” e.g. user changed
    // their CoCT password) MUST be overwritable, otherwise the user has no way
    // to reconnect without first revoking + losing the row.
    if (existingCred && !existingCred.revoked_at && !existingCred.last_login_error) {
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
    let targetCredId: string;

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

      targetCredId = existingCred.id;
      console.log(`[autofetch/credentials] Re-activated credential ${targetCredId} for user ${user.id}`);
    } else {
      // Insert new credential
      const { data: newCred, error: insertError } = await supabaseAdmin
        .from('municipal_credentials')
        .insert({
          user_id: user.id,
          municipality_id: municipality.id,
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

      targetCredId = newCred.id as string;
      console.log(`[autofetch/credentials] Stored credential ${targetCredId} for user ${user.id}`);
    }

    // 10. Pre-flight: assert QStash and app URL are configured
    const qstashToken = process.env.QSTASH_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!qstashToken || !appUrl) {
      // Roll back the credential â€” dead state without QStash
      // For re-activated creds: re-revoke. For new creds: delete.
      if (existingCred) {
        await supabaseAdmin.from('municipal_credentials').update({ revoked_at: new Date().toISOString() }).eq('id', targetCredId);
      } else {
        await supabaseAdmin.from('municipal_credentials').delete().eq('id', targetCredId);
      }
      console.error(`[autofetch/credentials] QSTASH_TOKEN or NEXT_PUBLIC_APP_URL not set. Credential ${targetCredId} rolled back.`);
      await sendAdminAlert(
        `QStash not configured â€” credential rolled back`,
        `User ${user.id} submitted credentials for ${municipality.name} but QSTASH_TOKEN=${qstashToken ? 'set' : 'MISSING'}, NEXT_PUBLIC_APP_URL=${appUrl || 'MISSING'}. Credential ${targetCredId} was rolled back.`,
      );
      return NextResponse.json(
        { error: 'Server misconfigured. Admin notified.', code: 'QSTASH_NOT_CONFIGURED' },
        { status: 500 },
      );
    }

    // 11. Enqueue job via QStash â€” backfill for live, discovery for pending

    try {
      const { getQstashClient } = await import('@/lib/qstash/client');
      const qstash = getQstashClient();
      if (isLive) {
        // Live municipality â€” enqueue backfill
        await qstash.publish({
          url: `${appUrl}/api/autofetch/worker/backfill`,
          body: JSON.stringify({ credential_id: targetCredId }),
          retries: 3,
        });
        console.log(`[autofetch/credentials] Enqueued backfill job for credential ${targetCredId}`);
      } else if (isDiscoveryPending) {
        // Discovery pending â€” enqueue Model B discovery
        await qstash.publish({
          url: `${appUrl}/api/autofetch/worker/discovery`,
          body: JSON.stringify({
            credential_id: targetCredId,
            municipality_slug: slug,
            portal_url: metroConfig?.portal_url || '',
          }),
          retries: 1, // Discovery is expensive, don't retry aggressively
        });
        console.log(`[autofetch/credentials] Enqueued Model B discovery for ${municipality.name} (credential ${targetCredId})`);
      }
    } catch (qstashErr) {
      // QStash publish failed â€” roll back credential to avoid dead state
      if (existingCred) {
        await supabaseAdmin.from('municipal_credentials').update({ revoked_at: new Date().toISOString() }).eq('id', targetCredId);
      } else {
        await supabaseAdmin.from('municipal_credentials').delete().eq('id', targetCredId);
      }
      const errMsg = qstashErr instanceof Error ? qstashErr.message : String(qstashErr);
      console.error(`[autofetch/credentials] QStash publish failed. Credential ${targetCredId} rolled back. Error:`, errMsg);
      await sendAdminAlert(
        `QStash publish failed â€” credential rolled back`,
        `User ${user.id} verified credentials for ${municipality.name} but QStash publish failed.\nCredential ${targetCredId} was rolled back.\nError: ${errMsg}\nApp URL: ${appUrl}`,
      );
      return NextResponse.json(
        { error: 'Could not queue your bill fetch. Please try again or contact support.', code: 'QSTASH_PUBLISH_FAILED' },
        { status: 500 },
      );
    }

    // 12. Send "standby" email â€” only AFTER successful QStash enqueue
    try {
      const { sendAutofetchStandbyEmail } = await import('@/lib/resend/autofetch-standby');
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      if (userProfile?.email) {
        await sendAutofetchStandbyEmail({
          userEmail: userProfile.email,
          userName: userProfile.full_name || 'there',
          municipalityName: municipality.name,
          accountUrl: `${appUrl}/account`,
        });
        console.log(`[autofetch/credentials] Standby email sent to ${userProfile.email}`);
      }
    } catch (emailErr) {
      // Standby email is non-blocking â€” QStash job is already enqueued
      console.error('[autofetch/credentials] Standby email failed (non-blocking):', emailErr);
    }

    return NextResponse.json({ verified: true, credential_id: targetCredId, discovery: isDiscoveryPending });

  } catch (error) {
    console.error('[autofetch/credentials] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Send admin alert email when credential submission fails.
 * Non-blocking â€” catch and log any email errors.
 */
async function sendAdminAlert(subject: string, detail: string): Promise<void> {
  try {
    const { getResendClient } = await import('@/lib/resend/client');
    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

    await resend.emails.send({
      from: `Billdog Alerts <${fromEmail}>`,
      to: ['editandcolour@gmail.com'],
      subject: `âš ï¸ ${subject}`,
      html: `<h2>${subject}</h2><pre>${detail}</pre><p>Time: ${new Date().toISOString()}</p>`,
    });
  } catch (alertErr) {
    console.error('[autofetch/credentials] Admin alert email failed:', alertErr);
  }
}
