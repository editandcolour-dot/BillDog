import { describe, it, expect } from 'vitest';
import { retryWorkerPath } from '@/lib/autofetch/retry-target';

describe('retryWorkerPath', () => {
  it('routes monthly fetch jobs to the fetch-latest worker', () => {
    expect(retryWorkerPath('monthly')).toBe('/api/autofetch/worker/fetch-latest');
  });

  it('routes backfill jobs to the backfill worker', () => {
    expect(retryWorkerPath('backfill')).toBe('/api/autofetch/worker/backfill');
  });

  it('refuses dispatcher runs (not user-retryable)', () => {
    expect(retryWorkerPath('daily_dispatcher')).toBeNull();
  });

  it('refuses unknown job types', () => {
    expect(retryWorkerPath('bogus')).toBeNull();
  });
});
