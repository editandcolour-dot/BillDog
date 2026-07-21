/**
 * POST /api/cases/bulk-delete
 *
 * Soft-deletes multiple cases by setting deleted_at.
 * Body: { case_ids: string[] }
 * Auth required. Ownership verified via RLS + explicit check.
 *
 * Hard rules:
 * - Resolved cases with billing history cannot be deleted
 * - Sets deleted_at = NOW(), does NOT physically delete rows
 * - Max 50 cases per request
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyDeletedCount } from '@/lib/cases/soft-delete';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { case_ids } = body;

    if (!Array.isArray(case_ids) || case_ids.length === 0) {
      return NextResponse.json({ error: 'case_ids must be a non-empty array' }, { status: 400 });
    }

    if (case_ids.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 cases per bulk delete' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch all requested cases — verify ownership and check for resolved status
    const { data: cases, error: fetchError } = await supabaseAdmin
      .from('cases')
      .select('id, user_id, status, deleted_at')
      .in('id', case_ids)
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('[bulk-delete] Fetch error:', fetchError.message);
      return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 });
    }

    if (!cases || cases.length === 0) {
      return NextResponse.json({ error: 'No matching cases found' }, { status: 404 });
    }

    // Filter: skip resolved cases and already-deleted cases
    const blocked = cases.filter((c) => c.status === 'resolved');
    const alreadyDeleted = cases.filter((c) => c.deleted_at !== null);
    const toDelete = cases.filter((c) => c.status !== 'resolved' && c.deleted_at === null);

    if (toDelete.length === 0) {
      return NextResponse.json({
        error: 'No eligible cases to delete',
        blocked: blocked.map((c) => c.id),
        already_deleted: alreadyDeleted.map((c) => c.id),
      }, { status: 400 });
    }

    const deleteIds = toDelete.map((c) => c.id);

    // Soft-delete: set deleted_at. FAIL-CLOSED: verify the affected row count
    // — Supabase returns 200 even when filters/RLS reduced the update to zero
    // rows, and reporting success on 0 rows is exactly the bug class this
    // route must never have.
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('cases')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', deleteIds)
      .eq('user_id', user.id)
      .select('id');

    const verdict = verifyDeletedCount(updatedRows, deleteIds);

    if (updateError || !verdict.ok) {
      console.error('[bulk-delete] Update failed:', updateError?.message ?? `missing rows: ${verdict.missing.join(', ')}`);
      return NextResponse.json({
        error: 'Delete incomplete — some cases were not deleted.',
        deleted: verdict.deleted,
        not_deleted: verdict.missing,
      }, { status: 500 });
    }

    console.log(`[bulk-delete] Soft-deleted ${verdict.deleted.length} cases for user ${user.id}`);

    return NextResponse.json({
      success: true,
      deleted: verdict.deleted,
      blocked: blocked.map((c) => c.id),
      already_deleted: alreadyDeleted.map((c) => c.id),
    });

  } catch (error) {
    console.error('[bulk-delete] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
