import { createClient } from '@supabase/supabase-js';
import { getTariffYearForDate } from './tariffLookup';
import { fetchGazetteAndParse } from './gazette-fetcher';

// Singleton instantiated exactly once globally for the Server context
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL or Service Role Key is undefined. Cannot initialize Tariff Resolver.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export type TariffType = 'WATER_FIXED_BASIC' | 'HUC' | 'REFUSE' | 'RATES';

export interface TariffResult {
  result: 'PASS' | 'SKIP';
  amount?: number;
  source?: 'cache' | 'gazette';
  verified?: boolean;
  reason?: string;
}

export async function resolveTariff(params: {
  municipality: string;
  tariffType: TariffType;
  billingDate: string; // MM.YYYY or DD/MM/YYYY
  subKey?: string | null;
  billId?: string;
}): Promise<TariffResult> {
  const financialYear = getTariffYearForDate(params.billingDate);

  if (financialYear === 'UNKNOWN') {
    return { result: 'SKIP', reason: 'Invalid or unknown billing date' };
  }

  // 1. Check Cache
  let query = supabase
    .from('tariff_cache')
    .select('amount_excl_vat, verified, source_url')
    .eq('municipality', params.municipality)
    .eq('tariff_type', params.tariffType)
    .eq('financial_year', financialYear);

  if (params.subKey) {
    query = query.eq('sub_key', params.subKey);
  } else {
    query = query.is('sub_key', null);
  }

  const { data: cacheData, error: cacheError } = await query;

  if (cacheError) {
    console.error(`[Tariff Resolver] Cache read error for ${params.tariffType}:`, cacheError);
  }

  if (cacheData && cacheData.length > 0) {
    return {
      result: 'PASS',
      amount: parseFloat(cacheData[0].amount_excl_vat),
      source: 'cache',
      verified: cacheData[0].verified
    };
  }

  // 2. Cache Miss -> Fetch Gazette
  const fetchResult = await fetchGazetteAndParse({
    municipality: params.municipality,
    financialYear,
    tariffType: params.tariffType,
    subKey: params.subKey
  });

  if (fetchResult.result === 'SKIP') {
    // 3. Fallback: Log to Human Review Queue (tariff_gaps)
    const { error: gapError } = await supabase
      .from('tariff_gaps')
      .insert({
        municipality: params.municipality,
        tariff_type: params.tariffType,
        financial_year: financialYear,
        sub_key: params.subKey || null,
        bill_id: params.billId || null,
        status: 'PENDING'
      });
      
    if (gapError) {
      console.error(`[Tariff Resolver] Failed to log tariff gap:`, gapError);
    }
    
    return fetchResult;
  }

  // 4. Gazette fetch successful -> Write to Cache Unverified
  const { error: insertError } = await supabase
    .from('tariff_cache')
    .insert({
      municipality: params.municipality,
      tariff_type: params.tariffType,
      financial_year: financialYear,
      sub_key: params.subKey || null,
      amount_excl_vat: fetchResult.amount,
      source_url: fetchResult.source_url,
      verified: false
    });

  if (insertError) {
    console.error(`[Tariff Resolver] Failed to write fetched rate to cache:`, insertError);
  }

  return {
    result: 'PASS',
    amount: fetchResult.amount,
    source: 'gazette',
    verified: false
  };
}
