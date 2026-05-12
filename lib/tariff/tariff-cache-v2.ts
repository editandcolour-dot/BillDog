/**
 * Tariff Cache v2 — Supabase-backed lookup, populate, and prune operations.
 *
 * Design:
 *   - Validity-window-based: each row has effective_from / effective_to dates.
 *   - Lookup: WHERE effective_from <= bill_date AND effective_to >= bill_date
 *   - Mid-year NERSA redetermination: close prior row, insert new row.
 *   - Prune: DELETE WHERE effective_to < NOW() - INTERVAL '36 months'
 *
 * This module is server-only (uses SUPABASE_SERVICE_ROLE_KEY).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  TariffCacheRow,
  TariffCacheInsert,
  TariffLookupParams,
  UtilityType,
} from './types-v2';

// ── Singleton Supabase Client ───────────────────────────────────────────────

let _client: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[tariff-cache-v2] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Cannot initialise tariff cache.'
    );
  }

  _client = createClient(url, key);
  return _client;
}

// ── Lookup ──────────────────────────────────────────────────────────────────

/**
 * Look up all tariff cache rows matching the given parameters within the
 * validity window that contains `billDate`.
 *
 * @returns Matching rows, or empty array if no cache hit.
 */
export async function lookupTariffCache(
  params: TariffLookupParams
): Promise<TariffCacheRow[]> {
  const client = getServiceClient();

  let query = client
    .from('tariff_cache')
    .select('*')
    .eq('municipality_id', params.municipalityId)
    .eq('utility_type', params.utilityType)
    .lte('effective_from', params.billDate)
    .gte('effective_to', params.billDate);

  if (params.tariffName) {
    query = query.eq('tariff_name', params.tariffName);
  }

  // Order by tier_start_unit for predictable tier iteration
  query = query.order('tariff_name').order('tier_start_unit', { ascending: true, nullsFirst: true });

  const { data, error } = await query;

  if (error) {
    console.error('[tariff-cache-v2] Lookup error:', error);
    return [];
  }

  return (data || []) as TariffCacheRow[];
}

/**
 * Check if a tariff cache entry exists for the given municipality, utility type,
 * and bill date. Lightweight existence check — no full row fetch.
 */
export async function hasTariffCacheHit(
  municipalityId: string,
  utilityType: UtilityType,
  billDate: string
): Promise<boolean> {
  const client = getServiceClient();

  const { count, error } = await client
    .from('tariff_cache')
    .select('id', { count: 'exact', head: true })
    .eq('municipality_id', municipalityId)
    .eq('utility_type', utilityType)
    .lte('effective_from', billDate)
    .gte('effective_to', billDate);

  if (error) {
    console.error('[tariff-cache-v2] Cache hit check error:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

// ── Populate ────────────────────────────────────────────────────────────────

/**
 * Insert one or more tariff cache entries. Uses upsert with the unique
 * constraint (municipality_id, utility_type, tariff_name, tier_start_unit, effective_from)
 * so re-running a seed is idempotent.
 */
export async function populateTariffCache(
  entries: TariffCacheInsert[]
): Promise<{ inserted: number; errors: string[] }> {
  const client = getServiceClient();
  const errors: string[] = [];
  let inserted = 0;

  // Batch in chunks of 100 to avoid payload limits
  const BATCH_SIZE = 100;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    const { data, error } = await client
      .from('tariff_cache')
      .upsert(batch, {
        onConflict: 'municipality_id,utility_type,tariff_name,tier_start_unit,effective_from',
        ignoreDuplicates: false,  // Update on conflict
      })
      .select('id');

    if (error) {
      console.error(`[tariff-cache-v2] Batch insert error (rows ${i}-${i + batch.length}):`, error);
      errors.push(`Batch ${i}: ${error.message}`);
    } else {
      inserted += data?.length ?? 0;
    }
  }

  console.log(`[tariff-cache-v2] Populated ${inserted} rows (${errors.length} batch errors)`);
  return { inserted, errors };
}

// ── Mid-Year Rate Change ────────────────────────────────────────────────────

/**
 * Handle a mid-year rate change (e.g. NERSA redetermination).
 *
 * 1. Close the existing validity window by setting effective_to = changeDate - 1 day
 * 2. Insert a new row with effective_from = changeDate
 *
 * @param municipalityId  e.g. 'cct'
 * @param utilityType     e.g. 'electricity'
 * @param tariffName      e.g. 'HOME_USER'
 * @param tierStartUnit   Tier lower bound (or null for fixed charges)
 * @param changeDate      The date the new rate takes effect (YYYY-MM-DD)
 * @param newEntry        The new rate data
 */
export async function applyMidYearRateChange(
  municipalityId: string,
  utilityType: UtilityType,
  tariffName: string,
  tierStartUnit: number | null,
  changeDate: string,
  newEntry: TariffCacheInsert
): Promise<{ success: boolean; error?: string }> {
  const client = getServiceClient();

  // Find the existing row that contains changeDate
  let query = client
    .from('tariff_cache')
    .select('id, effective_from, effective_to')
    .eq('municipality_id', municipalityId)
    .eq('utility_type', utilityType)
    .eq('tariff_name', tariffName)
    .lte('effective_from', changeDate)
    .gte('effective_to', changeDate);

  if (tierStartUnit !== null) {
    query = query.eq('tier_start_unit', tierStartUnit);
  } else {
    query = query.is('tier_start_unit', null);
  }

  const { data: existing, error: findError } = await query;

  if (findError) {
    return { success: false, error: `Find error: ${findError.message}` };
  }

  if (existing && existing.length > 0) {
    // Close the existing window one day before the change
    const closeDateObj = new Date(changeDate);
    closeDateObj.setDate(closeDateObj.getDate() - 1);
    const closeDate = closeDateObj.toISOString().split('T')[0];

    const { error: closeError } = await client
      .from('tariff_cache')
      .update({ effective_to: closeDate, updated_at: new Date().toISOString() })
      .eq('id', existing[0].id);

    if (closeError) {
      return { success: false, error: `Close error: ${closeError.message}` };
    }
  }

  // Insert the new rate
  const { error: insertError } = await client
    .from('tariff_cache')
    .insert(newEntry);

  if (insertError) {
    return { success: false, error: `Insert error: ${insertError.message}` };
  }

  return { success: true };
}

// ── Prune ───────────────────────────────────────────────────────────────────

/**
 * Delete all tariff cache rows whose validity window closed more than
 * 36 months ago. These rates can't apply to any disputable bill.
 *
 * @returns Number of rows pruned.
 */
export async function pruneExpiredTariffs(): Promise<number> {
  const client = getServiceClient();

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 36);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  const { data, error } = await client
    .from('tariff_cache')
    .delete()
    .lt('effective_to', cutoff)
    .select('id');

  if (error) {
    console.error('[tariff-cache-v2] Prune error:', error);
    return 0;
  }

  const pruned = data?.length ?? 0;
  if (pruned > 0) {
    console.log(`[tariff-cache-v2] Pruned ${pruned} expired tariff rows (effective_to < ${cutoff})`);
  }

  return pruned;
}

// ── Gap Detection ───────────────────────────────────────────────────────────

/**
 * Check which utility types are missing from the cache for a given
 * municipality and bill date. Returns the list of missing utility types.
 */
export async function detectTariffGaps(
  municipalityId: string,
  billDate: string,
  requiredUtilities: UtilityType[] = ['electricity', 'water', 'sewer', 'refuse']
): Promise<UtilityType[]> {
  const gaps: UtilityType[] = [];

  for (const ut of requiredUtilities) {
    const hit = await hasTariffCacheHit(municipalityId, ut, billDate);
    if (!hit) {
      gaps.push(ut);
    }
  }

  return gaps;
}
