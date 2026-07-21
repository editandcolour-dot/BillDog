/**
 * Pure mapping: which worker re-executes a failed scrape job.
 * Used by /api/autofetch/jobs/[id]/retry. Returns null for job types that are
 * not user-retryable (dispatcher runs are system-level; unknown types refuse).
 */
export function retryWorkerPath(jobType: string): string | null {
  switch (jobType) {
    case 'monthly':
      return '/api/autofetch/worker/fetch-latest';
    case 'backfill':
      return '/api/autofetch/worker/backfill';
    default:
      return null;
  }
}
