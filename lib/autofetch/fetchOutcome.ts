/**
 * Pure routing for a fetch-latest scrape result.
 *
 * One decision table, unit-testable without the route or DB:
 *   scraper failure                     → ERROR              (next_check_at untouched)
 *   success, no rows on portal          → NOT_YET_PUBLISHED  (daily hunt)
 *   success, latest row already stored  → NOT_YET_PUBLISHED  (daily hunt)
 *   success, unseen period              → FOUND_NEW          (store + dormant to next cycle)
 *
 * The stale_latest case is the crux: the portal keeps showing LAST month's
 * statement until the new one is published. Treating that as "found" (the old
 * behaviour) rolled next_check_at a full month forward without ever fetching
 * the real bill — dormancy exactly when the spec demands daily hunting.
 */
import type { ScraperResult, ScraperErrorCode, BillDownload } from '@/lib/scrapers/types';

export type FetchOutcome =
  | { kind: 'FOUND_NEW'; bill: BillDownload }
  | { kind: 'NOT_YET_PUBLISHED'; reason: 'no_rows' | 'stale_latest'; stalePeriod?: string }
  | { kind: 'ERROR'; error: string; errorCode: ScraperErrorCode };

export function classifyFetchOutcome(
  result: ScraperResult<BillDownload>,
  latestPeriodAlreadyStored: boolean
): FetchOutcome {
  if (!result.success) {
    return {
      kind: 'ERROR',
      error: result.error ?? 'Scrape failed',
      errorCode: result.errorCode ?? 'UNKNOWN',
    };
  }
  if (!result.data) {
    return { kind: 'NOT_YET_PUBLISHED', reason: 'no_rows' };
  }
  if (latestPeriodAlreadyStored) {
    return { kind: 'NOT_YET_PUBLISHED', reason: 'stale_latest', stalePeriod: result.data.period };
  }
  return { kind: 'FOUND_NEW', bill: result.data };
}
