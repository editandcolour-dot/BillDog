import { TariffType } from './tariff-resolver';

export interface FetchGazetteParams {
  municipality: string;
  financialYear: string;
  tariffType: TariffType;
  subKey?: string | null;
}

export interface GazetteFetchResult {
  result: 'PASS' | 'SKIP';
  amount?: number;
  source_url?: string;
  reason?: string;
}

export async function fetchGazetteAndParse(params: FetchGazetteParams): Promise<GazetteFetchResult> {
  // STUBBED: Returning SKIP to pipe cache misses into the Tariff Gaps Human Review Queue
  // The actual live PDF buffer fetching and extraction is deferred to a subsequent PR.
  console.log(`[Gazette Fetcher] Stub triggered for ${params.municipality} ${params.tariffType} FY${params.financialYear} sub=${params.subKey}. Skipping.`);
  
  return {
    result: 'SKIP',
    reason: 'PDF Gazette Fetcher is currently stubbed out.'
  };
}
