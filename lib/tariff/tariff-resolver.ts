import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getTariffYearForDate } from './tariffLookup';
import { fetchGazetteAndParse } from './gazette-fetcher';
import { lookupTariffCache } from './tariff-cache-v2';
import { resolveMunicipality } from './types-v2';

// ── Lazy Supabase Client ────────────────────────────────────────────────────
// Initialised on first use to avoid throwing at import time when env vars
// are missing (e.g. during build or test).

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Tariff Resolver] Supabase env vars missing — v1 cache disabled.');
    return null;
  }

  _supabase = createClient(supabaseUrl, supabaseServiceKey);
  return _supabase;
}

export type TariffType = 'WATER_FIXED_BASIC' | 'HUC' | 'REFUSE' | 'RATES';

export interface TariffResult {
  result: 'PASS' | 'SKIP';
  amount?: number;
  vatRate?: number;  // VAT rate from cache, so verifiers can gross up if needed
  source?: 'cache' | 'cache-v2' | 'gazette';
  verified?: boolean;
  reason?: string;
}

/**
 * Convert a billing date string (MM.YYYY, DD/MM/YYYY, YYYY-MM-DD) to
 * an ISO date string (YYYY-MM-DD) for tariff_cache v2 lookups.
 */
function toIsoDate(billingDate: string): string | null {
  if (billingDate.includes('-') && billingDate.length >= 10) {
    return billingDate.substring(0, 10); // Already YYYY-MM-DD
  }
  if (billingDate.includes('/')) {
    const parts = billingDate.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  if (billingDate.includes('.')) {
    const parts = billingDate.split('.');
    if (parts.length === 2) {
      return `${parts[1]}-${parts[0].padStart(2, '0')}-15`; // Mid-month for MM.YYYY
    }
  }
  return null;
}

/**
 * Map TariffType to the v2 utility_type and tariff_name used in tariff_cache.
 */
function mapToV2(tariffType: TariffType, subKey?: string | null): { utilityType: string; tariffName?: string } {
  switch (tariffType) {
    case 'HUC':
      return { utilityType: 'electricity', tariffName: 'HOME_USER_FIXED' };
    case 'WATER_FIXED_BASIC':
      return { utilityType: 'water', tariffName: subKey ? `WATER_FIXED_METER_${subKey.toUpperCase()}` : undefined };
    case 'REFUSE':
      return { utilityType: 'refuse', tariffName: 'REFUSE_240L' };
    case 'RATES':
      return { utilityType: 'rates', tariffName: 'PROPERTY_RATES_RESIDENTIAL' };
    default:
      return { utilityType: 'electricity' };
  }
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

  const supabase = getSupabase();

  // ── LAYER 1: Check v1 cache (old schema — tariff_cache_v1) ──
  if (supabase) {
    let query = supabase
      .from('tariff_cache_v1')
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
      // Table may not exist yet (migration not run) — that's fine, fall through
      if (!cacheError.message.includes('does not exist')) {
        console.error(`[Tariff Resolver] v1 cache read error for ${params.tariffType}:`, cacheError);
      }
    }

    if (cacheData && cacheData.length > 0) {
      return {
        result: 'PASS',
        amount: parseFloat(cacheData[0].amount_excl_vat),
        source: 'cache',
        verified: cacheData[0].verified
      };
    }
  }

  // ── LAYER 2: Check v2 cache (new schema — tariff_cache, validity windows) ──
  const isoDate = toIsoDate(params.billingDate);
  if (isoDate) {
    const muni = resolveMunicipality(params.municipality);
    const municipalityId = muni?.id || params.municipality;
    const v2Map = mapToV2(params.tariffType, params.subKey);

    try {
      const v2Rows = await lookupTariffCache({
        municipalityId,
        billDate: isoDate,
        utilityType: v2Map.utilityType as 'electricity' | 'water' | 'sewer' | 'refuse' | 'rates',
        tariffName: v2Map.tariffName,
      });

      if (v2Rows.length > 0) {
        // For fixed charges, return the fixed_charge amount; for tiered, return unit_rate
        const row = v2Rows[0];
        const amount = row.fixed_charge && row.fixed_charge > 0
          ? row.fixed_charge
          : row.unit_rate;

        return {
          result: 'PASS',
          amount,
          vatRate: row.vat_rate,  // Pass VAT rate so verifiers can gross up if needed
          source: 'cache-v2',
          verified: true, // v2 data comes from verified JSON sources
        };
      }
    } catch (v2Error) {
      console.error(`[Tariff Resolver] v2 cache read error:`, v2Error);
      // Fall through to gazette
    }
  }

  // ── LAYER 3: Cache Miss → Fetch Gazette (stubbed) ──
  const fetchResult = await fetchGazetteAndParse({
    municipality: params.municipality,
    financialYear,
    tariffType: params.tariffType,
    subKey: params.subKey
  });

  if (fetchResult.result === 'SKIP') {
    // Log to Human Review Queue (tariff_gaps_v1)
    if (supabase) {
      const { error: gapError } = await supabase
        .from('tariff_gaps_v1')
        .insert({
          municipality: params.municipality,
          tariff_type: params.tariffType,
          financial_year: financialYear,
          sub_key: params.subKey || null,
          bill_id: params.billId || null,
          status: 'PENDING'
        });
        
      if (gapError) {
        // Table may not exist yet — suppress gracefully
        if (!gapError.message.includes('does not exist')) {
          console.error(`[Tariff Resolver] Failed to log tariff gap:`, gapError);
        }
      }
    }
    
    return fetchResult;
  }

  // Gazette fetch successful → Write to v1 cache (unverified)
  if (supabase) {
    const { error: insertError } = await supabase
      .from('tariff_cache_v1')
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
      if (!insertError.message.includes('does not exist')) {
        console.error(`[Tariff Resolver] Failed to write fetched rate to v1 cache:`, insertError);
      }
    }
  }

  return {
    result: 'PASS',
    amount: fetchResult.amount,
    source: 'gazette',
    verified: false
  };
}
