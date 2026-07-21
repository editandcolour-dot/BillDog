import { describe, it, expect } from 'vitest';
import { verifyDeletedCount } from '@/lib/cases/soft-delete';

describe('verifyDeletedCount', () => {
  it('ok when every expected row came back from the update', () => {
    const v = verifyDeletedCount([{ id: 'a' }, { id: 'b' }], ['a', 'b']);
    expect(v.ok).toBe(true);
    expect(v.missing).toEqual([]);
  });

  it('NOT ok when RLS/filters silently dropped rows — lists the missing ids', () => {
    const v = verifyDeletedCount([{ id: 'a' }], ['a', 'b']);
    expect(v.ok).toBe(false);
    expect(v.missing).toEqual(['b']);
    expect(v.deleted).toEqual(['a']);
  });

  it('NOT ok on zero rows affected (the Supabase 200-with-nothing-deleted trap)', () => {
    expect(verifyDeletedCount([], ['a']).ok).toBe(false);
    expect(verifyDeletedCount(null, ['a']).ok).toBe(false);
    expect(verifyDeletedCount(undefined, ['a']).ok).toBe(false);
  });

  it('NOT ok when nothing was expected — an empty delete is never a success', () => {
    expect(verifyDeletedCount([], []).ok).toBe(false);
  });
});
