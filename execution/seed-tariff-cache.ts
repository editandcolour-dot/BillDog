/**
 * Seed Script: Populate tariff_cache (v2) from static CoCT JSON files.
 *
 * Usage:
 *   npx tsx execution/seed-tariff-cache.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * This script reads all CoCT JSON data files from lib/tariff/data/CoCT/
 * and the city-of-cape-town.json config, converts them to tariff_cache v2
 * rows (validity-window-based), and upserts them into Supabase.
 *
 * Idempotent: safe to re-run. Uses upsert on the unique constraint.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env from .env.local (project root) — dynamic require to avoid TS errors
// when dotenv types aren't installed in the main project.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
} catch {
  // dotenv not available — env vars must be set externally
}


// ── Types ───────────────────────────────────────────────────────────────────

interface TariffCacheInsert {
  municipality_id: string;
  municipality_name: string;
  effective_from: string;
  effective_to: string;
  utility_type: string;
  tariff_name: string;
  tier_start_unit: number | null;
  tier_end_unit: number | null;
  unit_rate: number;
  vat_rate: number;
  fixed_charge: number | null;
  rebate_amount: number | null;
  rebate_condition: string | null;
  research_source: string;
  research_notes: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonData = Record<string, any>;

// ── Constants ───────────────────────────────────────────────────────────────

const MUNICIPALITY_ID = 'cct';
const MUNICIPALITY_NAME = 'City of Cape Town';
const VAT_RATE = 0.15;

// CoCT water tier boundaries (kl)
const WATER_TIERS = [
  { name: 'WATER_TIER_1', start: 0,    end: 6 },
  { name: 'WATER_TIER_2', start: 6,    end: 10.5 },
  { name: 'WATER_TIER_3', start: 10.5, end: 35 },
  { name: 'WATER_TIER_4', start: 35,   end: 99999 },
];

// CoCT sewer tier boundaries (kl) — same as water for CoCT
const SEWER_TIERS = [
  { name: 'SEWER_TIER_1', start: 0,    end: 4.2 },
  { name: 'SEWER_TIER_2', start: 4.2,  end: 10.5 },
  { name: 'SEWER_TIER_3', start: 10.5, end: 35 },
  { name: 'SEWER_TIER_4', start: 35,   end: 99999 },
];

// CoCT electricity block boundaries (kWh)
const ELEC_BLOCKS = [
  { name: 'ELEC_BLOCK_1', start: 0,   end: 600 },
  { name: 'ELEC_BLOCK_2', start: 600, end: 99999 },
];

// ── Supabase Client ─────────────────────────────────────────────────────────

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  return createClient(url, key);
}

// ── JSON File Reader ────────────────────────────────────────────────────────

function loadJsonFile(filePath: string): JsonData | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`❌ Failed to read ${filePath}:`, err);
    return null;
  }
}

// ── Extractors — Convert JSON data to tariff_cache rows ─────────────────────

function extractFromDataFile(data: JsonData): TariffCacheInsert[] {
  const rows: TariffCacheInsert[] = [];
  const effectiveFrom = data.effective_from;
  const effectiveTo = data.effective_to;
  const source = data.source_url || data.gazette_source || 'Unknown';
  const vatRate = data.vat_rate ?? VAT_RATE;

  if (!effectiveFrom || !effectiveTo) {
    console.warn(`⚠️  Skipping file — missing effective_from/effective_to`);
    return rows;
  }

  // ── Electricity ──
  if (data.electricity) {
    const elec = data.electricity;

    // Home User tariff
    if (elec.home_user) {
      const hu = elec.home_user;

      // Fixed charge
      if (hu.fixed_charge_excl_vat != null && hu.fixed_charge_excl_vat > 0) {
        rows.push({
          municipality_id: MUNICIPALITY_ID,
          municipality_name: MUNICIPALITY_NAME,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          utility_type: 'electricity',
          tariff_name: 'HOME_USER_FIXED',
          tier_start_unit: null,
          tier_end_unit: null,
          unit_rate: 0,
          vat_rate: vatRate,
          fixed_charge: hu.fixed_charge_excl_vat,
          rebate_amount: null,
          rebate_condition: null,
          research_source: source,
          research_notes: hu.notes || hu.description || null,
        });
      }

      // Consumption blocks (rates are in cents → convert to rands)
      if (hu.energy_block1_rate_excl_vat_cents != null) {
        rows.push({
          municipality_id: MUNICIPALITY_ID,
          municipality_name: MUNICIPALITY_NAME,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          utility_type: 'electricity',
          tariff_name: 'HOME_USER',
          tier_start_unit: ELEC_BLOCKS[0].start,
          tier_end_unit: hu.energy_block1_limit_kwh || ELEC_BLOCKS[0].end,
          unit_rate: hu.energy_block1_rate_excl_vat_cents / 100,
          vat_rate: vatRate,
          fixed_charge: null,
          rebate_amount: null,
          rebate_condition: null,
          research_source: source,
          research_notes: null,
        });
      }

      if (hu.energy_block2_rate_excl_vat_cents != null) {
        rows.push({
          municipality_id: MUNICIPALITY_ID,
          municipality_name: MUNICIPALITY_NAME,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          utility_type: 'electricity',
          tariff_name: 'HOME_USER',
          tier_start_unit: hu.energy_block1_limit_kwh || ELEC_BLOCKS[1].start,
          tier_end_unit: ELEC_BLOCKS[1].end,
          unit_rate: hu.energy_block2_rate_excl_vat_cents / 100,
          vat_rate: vatRate,
          fixed_charge: null,
          rebate_amount: null,
          rebate_condition: null,
          research_source: source,
          research_notes: null,
        });
      }
    }

    // Domestic tariff
    if (elec.domestic) {
      const dom = elec.domestic;

      if (dom.fixed_charge_excl_vat != null && dom.fixed_charge_excl_vat > 0) {
        rows.push({
          municipality_id: MUNICIPALITY_ID,
          municipality_name: MUNICIPALITY_NAME,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          utility_type: 'electricity',
          tariff_name: 'DOMESTIC_FIXED',
          tier_start_unit: null,
          tier_end_unit: null,
          unit_rate: 0,
          vat_rate: vatRate,
          fixed_charge: dom.fixed_charge_excl_vat,
          rebate_amount: null,
          rebate_condition: null,
          research_source: source,
          research_notes: dom.description || null,
        });
      }

      if (dom.energy_block1_rate_excl_vat_cents != null) {
        rows.push({
          municipality_id: MUNICIPALITY_ID,
          municipality_name: MUNICIPALITY_NAME,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          utility_type: 'electricity',
          tariff_name: 'DOMESTIC',
          tier_start_unit: 0,
          tier_end_unit: ELEC_BLOCKS[0].end,
          unit_rate: dom.energy_block1_rate_excl_vat_cents / 100,
          vat_rate: vatRate,
          fixed_charge: null,
          rebate_amount: null,
          rebate_condition: null,
          research_source: source,
          research_notes: null,
        });
      }

      if (dom.energy_block2_rate_excl_vat_cents != null) {
        rows.push({
          municipality_id: MUNICIPALITY_ID,
          municipality_name: MUNICIPALITY_NAME,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          utility_type: 'electricity',
          tariff_name: 'DOMESTIC',
          tier_start_unit: ELEC_BLOCKS[1].start,
          tier_end_unit: ELEC_BLOCKS[1].end,
          unit_rate: dom.energy_block2_rate_excl_vat_cents / 100,
          vat_rate: vatRate,
          fixed_charge: null,
          rebate_amount: null,
          rebate_condition: null,
          research_source: source,
          research_notes: null,
        });
      }
    }

    // Lifeline tariff (single block)
    if (elec.lifeline?.energy_all_blocks_rate_excl_vat_cents != null) {
      rows.push({
        municipality_id: MUNICIPALITY_ID,
        municipality_name: MUNICIPALITY_NAME,
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        utility_type: 'electricity',
        tariff_name: 'LIFELINE',
        tier_start_unit: 0,
        tier_end_unit: 99999,
        unit_rate: elec.lifeline.energy_all_blocks_rate_excl_vat_cents / 100,
        vat_rate: vatRate,
        fixed_charge: null,
        rebate_amount: null,
        rebate_condition: null,
        research_source: source,
        research_notes: elec.lifeline.description || null,
      });
    }
  }

  // ── Water ──
  if (data.water) {
    const water = data.water;

    // Fixed charge — meter size based (pre-2025/26)
    if (water.fixed_basic_charge_by_meter_size_incl_vat) {
      const fixedCharges = water.fixed_basic_charge_by_meter_size_incl_vat;
      for (const [size, value] of Object.entries(fixedCharges)) {
        if (size === 'notes' || value == null) continue;
        // Convert incl VAT → excl VAT
        const exclVat = Math.round(((value as number) / (1 + vatRate)) * 100) / 100;
        rows.push({
          municipality_id: MUNICIPALITY_ID,
          municipality_name: MUNICIPALITY_NAME,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          utility_type: 'water',
          tariff_name: `WATER_FIXED_METER_${size.toUpperCase()}`,
          tier_start_unit: null,
          tier_end_unit: null,
          unit_rate: 0,
          vat_rate: vatRate,
          fixed_charge: exclVat,
          rebate_amount: null,
          rebate_condition: null,
          research_source: source,
          research_notes: `Meter size ${size}. Method: ${water.fixed_charge_method}`,
        });
      }
    }

    // Fixed charge — property value based (2025/26+)
    if (water.fixed_basic_charge_by_property_value_excl_vat) {
      const bands = water.fixed_basic_charge_by_property_value_excl_vat;
      for (const [band, value] of Object.entries(bands)) {
        if (band === 'notes' || value == null || typeof value !== 'number') continue;
        rows.push({
          municipality_id: MUNICIPALITY_ID,
          municipality_name: MUNICIPALITY_NAME,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          utility_type: 'water',
          tariff_name: `WATER_FIXED_PROPVAL_${band.toUpperCase()}`,
          tier_start_unit: null,
          tier_end_unit: null,
          unit_rate: 0,
          vat_rate: vatRate,
          fixed_charge: value,
          rebate_amount: null,
          rebate_condition: null,
          research_source: source,
          research_notes: `Property value band: ${band}. Method: ${water.fixed_charge_method}`,
        });
      }
    }

    // Consumption tiers
    if (water.consumption_rates_domestic_full_excl_vat) {
      const rates = water.consumption_rates_domestic_full_excl_vat;
      const tierMap: [string, typeof WATER_TIERS[0]][] = [
        ['step1_0_to_6kl', WATER_TIERS[0]],
        ['step2_6_to_10_5kl', WATER_TIERS[1]],
        ['step3_10_5_to_35kl', WATER_TIERS[2]],
        ['step4_above_35kl', WATER_TIERS[3]],
      ];

      for (const [key, tier] of tierMap) {
        const rate = rates[key];
        if (rate == null) continue;
        rows.push({
          municipality_id: MUNICIPALITY_ID,
          municipality_name: MUNICIPALITY_NAME,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          utility_type: 'water',
          tariff_name: tier.name,
          tier_start_unit: tier.start,
          tier_end_unit: tier.end,
          unit_rate: rate,
          vat_rate: vatRate,
          fixed_charge: null,
          rebate_amount: null,
          rebate_condition: null,
          research_source: source,
          research_notes: null,
        });
      }
    }
  }

  // ── Property Rates ──
  if (data.property_rates?.residential_rate_in_rand != null) {
    const pr = data.property_rates;
    rows.push({
      municipality_id: MUNICIPALITY_ID,
      municipality_name: MUNICIPALITY_NAME,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      utility_type: 'refuse',  // Rates don't have a utility_type — use a special one
      tariff_name: 'PROPERTY_RATES_RESIDENTIAL',
      tier_start_unit: null,
      tier_end_unit: null,
      unit_rate: pr.residential_rate_in_rand,
      vat_rate: 0,  // Property rates are VAT-exempt
      fixed_charge: null,
      rebate_amount: pr.primary_residence_reduction || null,
      rebate_condition: pr.primary_residence_reduction ? 'primary_residence' : null,
      research_source: source,
      research_notes: pr.notes || null,
    });
  }

  // ── Refuse ──
  if (data.refuse?.residential_240l_bin_weekly_incl_vat != null) {
    // Convert incl VAT → excl VAT
    const inclVat = data.refuse.residential_240l_bin_weekly_incl_vat;
    const exclVat = Math.round((inclVat / (1 + vatRate)) * 100) / 100;
    rows.push({
      municipality_id: MUNICIPALITY_ID,
      municipality_name: MUNICIPALITY_NAME,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      utility_type: 'refuse',
      tariff_name: 'REFUSE_240L',
      tier_start_unit: null,
      tier_end_unit: null,
      unit_rate: 0,
      vat_rate: vatRate,
      fixed_charge: exclVat,
      rebate_amount: null,
      rebate_condition: null,
      research_source: source,
      research_notes: data.refuse.notes || null,
    });
  }

  // ── Sewerage ──
  if (data.sewerage?.disposal_rate_per_kl_excl_vat != null) {
    rows.push({
      municipality_id: MUNICIPALITY_ID,
      municipality_name: MUNICIPALITY_NAME,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      utility_type: 'sewer',
      tariff_name: 'SEWER_FLAT',
      tier_start_unit: 0,
      tier_end_unit: 99999,
      unit_rate: data.sewerage.disposal_rate_per_kl_excl_vat,
      vat_rate: vatRate,
      fixed_charge: null,
      rebate_amount: null,
      rebate_condition: null,
      research_source: source,
      research_notes: data.sewerage.notes || null,
    });
  }

  return rows;
}

/**
 * Extract sewer tier data from the configs/city-of-cape-town.json file
 * which has richer tier-level data than the per-FY data files.
 */
function extractFromConfigFile(config: JsonData): TariffCacheInsert[] {
  const rows: TariffCacheInsert[] = [];

  if (!config.tariffs) return rows;

  // FY → validity window mapping
  const fyWindows: Record<string, { from: string; to: string }> = {
    '2022/23': { from: '2022-07-01', to: '2023-06-30' },
    '2023/24': { from: '2023-07-01', to: '2024-06-30' },
    '2024/25': { from: '2024-07-01', to: '2025-06-30' },
    '2025/26': { from: '2025-07-01', to: '2026-06-30' },
  };

  // Process sewer tiers from config (these have more detail than the data files)
  for (const [tariffCode, entries] of Object.entries(config.tariffs)) {
    if (!tariffCode.startsWith('SEWER_TIER_')) continue;

    const tierIdx = parseInt(tariffCode.replace('SEWER_TIER_', '')) - 1;
    const tier = SEWER_TIERS[tierIdx];
    if (!tier) continue;

    for (const entry of entries as JsonData[]) {
      const window = fyWindows[entry.fiscal_year];
      if (!window) continue;

      rows.push({
        municipality_id: MUNICIPALITY_ID,
        municipality_name: MUNICIPALITY_NAME,
        effective_from: window.from,
        effective_to: window.to,
        utility_type: 'sewer',
        tariff_name: tariffCode,
        tier_start_unit: tier.start,
        tier_end_unit: tier.end,
        unit_rate: entry.rate_value,
        vat_rate: VAT_RATE,
        fixed_charge: null,
        rebate_amount: null,
        rebate_condition: null,
        research_source: entry.source_url || 'Config file',
        research_notes: entry.source_document_title
          ? `${entry.source_document_title}, page ${entry.source_page}`
          : null,
      });
    }
  }

  // ── Property Rates from config ──────────────────────────────────────────
  // The CoCT data files have residential_rate_in_rand: null for most FYs,
  // but the config has actual gazetted rates for all FYs. Seed those here
  // so the v2 cache has RATES data and VeriCite is never triggered for
  // lookups that already have a deterministic local answer.
  if (config.tariffs.RATES) {
    for (const entry of config.tariffs.RATES as JsonData[]) {
      if (entry.category !== 'residential' || entry.rate_value == null) continue;
      const window = fyWindows[entry.fiscal_year];
      if (!window) continue;

      rows.push({
        municipality_id: MUNICIPALITY_ID,
        municipality_name: MUNICIPALITY_NAME,
        effective_from: window.from,
        effective_to: window.to,
        utility_type: 'rates',
        tariff_name: 'PROPERTY_RATES_RESIDENTIAL',
        tier_start_unit: null,
        tier_end_unit: null,
        unit_rate: entry.rate_value,
        vat_rate: 0,  // Property rates are VAT-exempt
        fixed_charge: null,
        rebate_amount: null,
        rebate_condition: null,
        research_source: entry.source_url || 'Config file',
        research_notes: entry.source_document_title
          ? `${entry.source_document_title}, page ${entry.source_page}`
          : null,
      });
    }
  }

  return rows;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Tariff Cache v2 Seed Script');
  console.log('═'.repeat(50));

  const supabase = getSupabaseClient();
  const allRows: TariffCacheInsert[] = [];

  // 1. Load data files (lib/tariff/data/CoCT/)
  const dataDir = path.join(process.cwd(), 'lib', 'tariff', 'data', 'CoCT');
  const dataFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  console.log(`\n📂 Found ${dataFiles.length} CoCT data files:`);
  for (const file of dataFiles) {
    const filePath = path.join(dataDir, file);
    const data = loadJsonFile(filePath);
    if (!data) continue;

    const rows = extractFromDataFile(data);
    console.log(`   ${file}: ${rows.length} rows extracted`);
    allRows.push(...rows);
  }

  // 2. Load config file for richer sewer tier data
  const configPath = path.join(process.cwd(), 'lib', 'tariff', 'configs', 'city-of-cape-town.json');
  const config = loadJsonFile(configPath);
  if (config) {
    const configRows = extractFromConfigFile(config);
    console.log(`\n📂 Config file: ${configRows.length} sewer tier rows extracted`);
    allRows.push(...configRows);
  }

  // 3. Deduplicate by unique key
  const seen = new Set<string>();
  const uniqueRows = allRows.filter(row => {
    const key = `${row.municipality_id}|${row.utility_type}|${row.tariff_name}|${row.tier_start_unit}|${row.effective_from}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n📊 Total unique rows: ${uniqueRows.length} (${allRows.length - uniqueRows.length} duplicates removed)`);

  // 4. Upsert to Supabase
  console.log('\n⬆️  Upserting to Supabase tariff_cache...');

  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const batch = uniqueRows.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('tariff_cache')
      .upsert(batch, {
        onConflict: 'municipality_id,utility_type,tariff_name,tier_start_unit,effective_from',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors++;
    } else {
      inserted += data?.length ?? 0;
      console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length ?? 0} rows`);
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Seed complete: ${inserted} rows inserted/updated, ${errors} batch errors`);

  // 5. Verify
  const { count } = await supabase
    .from('tariff_cache')
    .select('id', { count: 'exact', head: true })
    .eq('municipality_id', MUNICIPALITY_ID);

  console.log(`📊 Total CoCT rows in tariff_cache: ${count}`);

  // Show breakdown by utility type
  for (const ut of ['electricity', 'water', 'sewer', 'refuse', 'rates']) {
    const { count: utCount } = await supabase
      .from('tariff_cache')
      .select('id', { count: 'exact', head: true })
      .eq('municipality_id', MUNICIPALITY_ID)
      .eq('utility_type', ut);
    console.log(`   ${ut}: ${utCount} rows`);
  }
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
