import { createAdminClient } from '@/lib/supabase/admin';

export async function revokeCredential(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  credentialId: string,
  userId: string,
  reason: string,
  ipAddress: string = 'unknown',
  userAgent: string = 'worker-auto-revocation'
): Promise<void> {
  // Hard-delete credential data + mark as revoked
  const { error: updateError } = await supabaseAdmin
    .from('municipal_credentials')
    .update({
      encrypted_credentials: null,
      encryption_iv: null,
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', credentialId);

  if (updateError) {
    console.error(`[autofetch/revocation] Update failed for ${credentialId}:`, updateError.message);
    throw new Error('Failed to update credential revocation status');
  }

  // Record revocation in consent_events
  await supabaseAdmin
    .from('consent_events')
    .insert({
      user_id: userId,
      event_type: 'autofetch_revoked',
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: { reason }
    });

  console.log(`[autofetch/revocation] Credential ${credentialId} revoked for user ${userId}. Reason: ${reason}`);
}
