/**
 * Fail-closed verification for case soft-deletes.
 *
 * Supabase returns 200 on an UPDATE/DELETE that RLS or filters reduced to
 * zero rows — "success" with nothing changed. Every delete route must pass
 * the rows returned by `.select('id')` through this check and treat a
 * non-ok verdict as a 500, never as success.
 */
export interface DeleteVerification {
  ok: boolean;
  deleted: string[];
  missing: string[];
}

export function verifyDeletedCount(
  returnedRows: Array<{ id: string }> | null | undefined,
  expectedIds: string[]
): DeleteVerification {
  const deleted = (returnedRows ?? []).map((r) => r.id);
  const missing = expectedIds.filter((id) => !deleted.includes(id));
  return {
    ok: expectedIds.length > 0 && missing.length === 0,
    deleted,
    missing,
  };
}
