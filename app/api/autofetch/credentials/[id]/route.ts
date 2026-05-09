/**
 * DELETE /api/autofetch/credentials/[id]
 *
 * Revoke and hard-delete municipal portal credentials.
 * Auth + ownership required.
 *
 * Actions:
 * 1. Hard-delete credential data (encrypted_credentials = NULL, encryption_iv = NULL)
 * 2. Set revoked_at + revocation_reason
 * 3. Record autofetch_revoked in consent_events
 *
 * Phase 1: No in-flight job cancellation (no jobs exist yet).
 *
 * Source of truth: implementation_plan v3 §2c.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const credentialId = resolvedParams.id;

    if (!credentialId) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 2. Fetch credential and verify ownership
    const { data: credential, error: fetchError } = await supabaseAdmin
      .from('municipal_credentials')
      .select('id, user_id, revoked_at')
      .eq('id', credentialId)
      .single();

    if (fetchError || !credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    if (credential.user_id !== user.id) {
      console.error(`[autofetch/credentials] Ownership violation: user ${user.id} attempted to delete credential ${credentialId}`);
      return NextResponse.json({ error: 'Unauthorised access' }, { status: 403 });
    }

    if (credential.revoked_at) {
      return NextResponse.json({ error: 'Credential already revoked' }, { status: 400 });
    }

    // 3 & 4. Hard-delete credential data, mark as revoked, and record consent event
    const ip = request.headers.get('cf-connecting-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const { revokeCredential } = await import('@/lib/autofetch/revocation');
    await revokeCredential(
      supabaseAdmin,
      credentialId,
      user.id,
      'user_request',
      ip,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Credentials revoked and deleted. Your existing scraped bills remain accessible.',
    });

  } catch (error) {
    console.error('[autofetch/credentials] Unexpected error during revocation:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
