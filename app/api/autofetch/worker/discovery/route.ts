/**
 * POST /api/autofetch/worker/discovery
 *
 * QStash-triggered endpoint for Model B autonomous municipality discovery.
 * Runs hybrid vision+DOM exploration with $5 cost cap to discover
 * how to scrape a previously unsupported municipal portal.
 *
 * Flow:
 * 1. Validate QStash signature
 * 2. Load credential + municipality info
 * 3. Run discovery agent (placeholder — actual Model B agent is in lib/scrapers/)
 * 4. On success: write config JSON, update metro status, trigger backfill
 * 5. On failure: email admin + user, mark discovery_failed
 *
 * Source of truth: Phase 5 spec §model-b-discovery.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyQStashSignature } from '@/lib/qstash/verify';
import { getQstashClient } from '@/lib/qstash/client';
import { decryptCredentials } from '@/lib/crypto/credentials';

export const maxDuration = 300; // 5 minutes for discovery

// Sourced from env (audit S-C1). Used only for failure-notification emails;
// if unset, failure emails are skipped (not a request-blocker).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const COST_CAP_USD = 5;

export async function POST(request: NextRequest) {
  try {
    // 1. Validate QStash signature
    const isValid = await verifyQStashSignature(request);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 });
    }

    const clonedReq = request.clone();
    const body = await clonedReq.json();
    const { credential_id, municipality_slug } = body;

    if (!credential_id || !municipality_slug) {
      return NextResponse.json(
        { error: 'credential_id and municipality_slug are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 2. Load credential
    const { data: credential, error: credError } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id, user_id, municipality_id, encrypted_credentials, encryption_iv, revoked_at')
      .eq('id', credential_id)
      .single();

    if (credError || !credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    if (credential.revoked_at) {
      return NextResponse.json({ error: 'Credentials revoked' }, { status: 400 });
    }

    // 3. Load municipality
    const { data: municipality } = await supabaseAdmin
      .from('municipalities')
      .select('id, name, slug')
      .eq('id', credential.municipality_id)
      .single();

    if (!municipality) {
      return NextResponse.json({ error: 'Municipality not found' }, { status: 404 });
    }

    // 4. Get user profile for notification
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', credential.user_id)
      .single();

    console.log(`[discovery] Starting Model B discovery for ${municipality.name} (slug: ${municipality_slug})`);
    console.log(`[discovery] Cost cap: $${COST_CAP_USD}`);

    // 5. Decrypt credentials for discovery agent
    let portalUsername: string;
    let portalPassword: string;
    try {
      const decrypted = decryptCredentials(
        credential.encrypted_credentials!,
        credential.encryption_iv!
      );
      portalUsername = decrypted.username;
      portalPassword = decrypted.password;
    } catch (decryptErr) {
      const msg = decryptErr instanceof Error ? decryptErr.message : 'Decryption failed';
      console.error('[discovery] Credential decryption failed:', msg);
      await emailAdmin('discovery_decryption_failed', municipality.name, credential.user_id, msg);
      return NextResponse.json({ error: 'Credential decryption failed' }, { status: 500 });
    }

    // 6. Run discovery agent
    // In Phase 5, the discovery agent is implemented in lib/scrapers/discovery/
    // For now, we call the agent and handle success/failure
    let discoverySuccess = false;
    let discoveryError = '';

    try {
      // Import discovery agent dynamically
      const { runDiscovery } = await import('@/lib/scrapers/discovery');
      const result = await runDiscovery({
        slug: municipality_slug,
        portalUrl: body.portal_url || '',
        username: portalUsername,
        password: portalPassword,
        costCapUsd: COST_CAP_USD,
      });

      discoverySuccess = result.success;
      if (!result.success) {
        discoveryError = result.error || 'Discovery agent returned failure';
      }
    } catch (agentErr) {
      discoveryError = agentErr instanceof Error ? agentErr.message : 'Discovery agent crashed';
      console.error('[discovery] Agent error:', discoveryError);
    } finally {
      // Clear credentials from memory
      portalUsername = '';
      portalPassword = '';
    }

    if (discoverySuccess) {
      // 7a. Success — config was written by discovery agent
      console.log(`[discovery] SUCCESS for ${municipality.name}`);

      // Log event
      await supabaseAdmin.from('case_events').insert({
        case_id: null,
        event_type: 'discovery_completed',
        note: `Model B discovery completed for ${municipality.name}. Scraper config generated.`,
        metadata: { municipality_id: municipality.id, slug: municipality_slug, user_id: credential.user_id },
      });

      // Trigger backfill for the user via QStash — same client + base URL as
      // every other publish in the app (region comes from QSTASH_URL / the
      // client default; the old hardcoded EU endpoint failed for a US-region
      // account with "user not found in this region").
      try {
        const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/autofetch/worker/backfill`;
        await getQstashClient().publish({
          url: workerUrl,
          body: JSON.stringify({ credential_id }),
          retries: 3,
        });
        console.log(`[discovery] Backfill triggered for credential ${credential_id}`);
      } catch (backfillErr) {
        console.error('[discovery] Failed to trigger backfill:', backfillErr);
      }

      // Notify user
      if (profile?.email) {
        await emailUser(
          profile.email,
          profile.full_name || 'User',
          municipality.name,
          true,
        );
      }

      return NextResponse.json({ success: true, municipality: municipality.name });
    }

    // 7b. Failure
    console.error(`[discovery] FAILED for ${municipality.name}: ${discoveryError}`);

    // Email admin — ALWAYS
    await emailAdmin('discovery_failed', municipality.name, credential.user_id, discoveryError);

    // Email user
    if (profile?.email) {
      await emailUser(
        profile.email,
        profile.full_name || 'User',
        municipality.name,
        false,
      );
    }

    // Log event
    await supabaseAdmin.from('case_events').insert({
      case_id: null,
      event_type: 'discovery_failed',
      note: `Model B discovery failed for ${municipality.name}: ${discoveryError}`,
      metadata: { municipality_id: municipality.id, slug: municipality_slug, user_id: credential.user_id },
    });

    return NextResponse.json({ success: false, error: discoveryError });

  } catch (error) {
    console.error('[discovery] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Email admin on discovery failure — ALWAYS fires.
 */
async function emailAdmin(
  type: string,
  municipalityName: string,
  userId: string,
  errorMessage: string,
): Promise<void> {
  // ADMIN_EMAIL is env-sourced (audit S-C1). Skip silently if unset \u2014
  // discovery worker must not fail because the alert recipient is missing.
  if (!ADMIN_EMAIL) {
    console.error('[discovery] ADMIN_EMAIL env var is not set \u2014 admin alert skipped.');
    return;
  }

  try {
    const { getResendClient } = await import('@/lib/resend/client');
    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

    await resend.emails.send({
      from: `Billdog System <${fromEmail}>`,
      to: [ADMIN_EMAIL],
      subject: `[Billdog] Discovery ${type}: ${municipalityName}`,
      text: `Model B discovery event.\n\nType: ${type}\nMunicipality: ${municipalityName}\nUser ID: ${userId}\nError: ${errorMessage}\n\nTimestamp: ${new Date().toISOString()}`,
    });
  } catch (emailErr) {
    console.error('[discovery] Admin email failed:', emailErr);
  }
}

/**
 * Email user about discovery status.
 */
async function emailUser(
  email: string,
  name: string,
  municipalityName: string,
  success: boolean,
): Promise<void> {
  try {
    const { getResendClient } = await import('@/lib/resend/client');
    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.billdog.co.za';

    if (success) {
      await resend.emails.send({
        from: `Billdog <${fromEmail}>`,
        to: [email],
        subject: `Good news — ${municipalityName} is now connected`,
        text: `Hi ${name},\n\nGreat news! We've successfully set up automatic bill fetching for ${municipalityName}.\n\nYour bills are being retrieved and analysed now. You'll receive an email once your first analysis is complete.\n\nView your dashboard: ${appUrl}/account\n\nThank you,\nBilldog`,
      });
    } else {
      await resend.emails.send({
        from: `Billdog <${fromEmail}>`,
        to: [email],
        subject: `We're working on adding ${municipalityName}`,
        text: `Hi ${name},\n\nWe're still working on adding support for ${municipalityName} to our automatic bill fetching system. Our team has been notified and is on it.\n\nWe'll email you as soon as your municipality is ready — typically within 48 hours.\n\nThank you for your patience,\nBilldog`,
      });
    }
  } catch (emailErr) {
    console.error('[discovery] User email failed:', emailErr);
  }
}
