import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidSaIdNumber } from '@/lib/popia/luhn';

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Check if profile already has ID stored (write-once)
  const { data: hasId } = await supabase.rpc('has_profile_id');
  if (hasId) {
    const { id: caseId } = await ctx.params;

    // Profile has ID on file — but we still need a case-level Vault entry
    // so get_poppi_id (which looks up by case_id) can find it.
    // Check if case already has the ID stamped first (idempotent).
    const { data: caseRow } = await supabase
      .from('cases')
      .select('id_collected_at')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single();

    if (!caseRow?.id_collected_at) {
      // Decrypt profile-level ID and bridge it to case-level Vault
      const { data: profileIdNumber } = await supabase.rpc('get_profile_id_decrypted');
      if (profileIdNumber) {
        try {
          await supabase.rpc('store_account_holder_id', {
            target_case_id: caseId,
            id_number: profileIdNumber,
          });
        } catch (bridgeErr) {
          // store_account_holder_id also stamps cases.id_collected_at on success.
          // If it throws "already captured", just stamp the case directly.
          console.warn('[capture-id] Bridge write failed (may be duplicate):', bridgeErr);
          await supabase
            .from('cases')
            .update({ id_collected_at: new Date().toISOString() })
            .eq('id', caseId)
            .eq('user_id', user.id);
        }
      } else {
        // Couldn't decrypt — just stamp the case so UI stops prompting
        await supabase
          .from('cases')
          .update({ id_collected_at: new Date().toISOString() })
          .eq('id', caseId)
          .eq('user_id', user.id);
      }
    }

    return NextResponse.json({ already_stored: true, message: 'ID already on file' });
  }

  const { id: caseId } = await ctx.params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id_number } = body ?? {};
  if (typeof id_number !== 'string' || !isValidSaIdNumber(id_number)) {
    return NextResponse.json({ error: 'Invalid SA ID number' }, { status: 400 });
  }

  // Store to both case vault AND profile vault
  const { data, error } = await supabase.rpc('store_account_holder_id', {
    target_case_id: caseId,
    id_number,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Also store on profile (write-once, best-effort)
  try {
    await supabase.rpc('store_profile_id', { id_number });
  } catch {
    // Non-fatal — case-level store succeeded
  }

  return NextResponse.json({ secret_id: data });
}
