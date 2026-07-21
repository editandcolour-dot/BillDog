import { describe, it, expect } from 'vitest';
import { classifyFetchOutcome } from '@/lib/autofetch/fetchOutcome';
import type { ScraperResult, BillDownload } from '@/lib/scrapers/types';

const bill = (period: string): BillDownload => ({
  period,
  pdfBuffer: Buffer.from('%PDF-1.4'),
  filename: 'bill_city-of-cape-town_test.pdf',
});

describe('classifyFetchOutcome', () => {
  it('routes scraper failure to ERROR with its code', () => {
    const r: ScraperResult<BillDownload> = { success: false, error: 'boom', errorCode: 'PORTAL_DOWN' };
    expect(classifyFetchOutcome(r, false)).toEqual({
      kind: 'ERROR',
      error: 'boom',
      errorCode: 'PORTAL_DOWN',
    });
  });

  it('defaults ERROR code to UNKNOWN when the scraper omits it', () => {
    const r: ScraperResult<BillDownload> = { success: false };
    const o = classifyFetchOutcome(r, false);
    expect(o.kind).toBe('ERROR');
    if (o.kind === 'ERROR') expect(o.errorCode).toBe('UNKNOWN');
  });

  it('routes success-with-no-data to NOT_YET_PUBLISHED (no_rows)', () => {
    const r: ScraperResult<BillDownload> = { success: true };
    expect(classifyFetchOutcome(r, false)).toEqual({
      kind: 'NOT_YET_PUBLISHED',
      reason: 'no_rows',
    });
  });

  it('routes an already-stored latest bill to NOT_YET_PUBLISHED (stale_latest), never dormancy', () => {
    const r: ScraperResult<BillDownload> = { success: true, data: bill('May 14, 2026') };
    expect(classifyFetchOutcome(r, true)).toEqual({
      kind: 'NOT_YET_PUBLISHED',
      reason: 'stale_latest',
      stalePeriod: 'May 14, 2026',
    });
  });

  it('routes a genuinely new bill to FOUND_NEW carrying the bill', () => {
    const r: ScraperResult<BillDownload> = { success: true, data: bill('June 14, 2026') };
    const o = classifyFetchOutcome(r, false);
    expect(o.kind).toBe('FOUND_NEW');
    if (o.kind === 'FOUND_NEW') expect(o.bill.period).toBe('June 14, 2026');
  });
});
