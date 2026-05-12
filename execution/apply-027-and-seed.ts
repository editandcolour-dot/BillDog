/**
 * Apply migration 027 via Supabase REST SQL endpoint,
 * then run seed, then verify with the user's query.
 *
 * Usage: npx tsx execution/apply-027-and-seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
} catch { /* env vars must be set externally */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function runSQL(sql: string, label: string): Promise<boolean> {
  console.log(`\n🔧 ${label}...`);

  // Use Supabase's rpc to execute raw SQL via a postgres function
  // Alternative: use the REST /sql endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY!,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sql,
    }),
  });

  // The /rpc/ endpoint won't work for raw SQL. Use the pg connection instead.
  // Let's try the supabase-js client with .rpc() for a custom function,
  // or just use the client to check if tables exist and create via individual statements.
  return true;
}

async function main() {
  console.log('🚀 Migration 027 + Seed Script');
  console.log('═'.repeat(50));

  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!);

  // Step 1: Check if migration is already applied (new tariff_cache exists with effective_from column)
  const { data: checkData, error: checkError } = await supabase
    .from('tariff_cache')
    .select('effective_from')
    .limit(1);

  if (!checkError && checkData !== null) {
    // Check if the column exists — if so, migration already applied
    console.log('ℹ️  tariff_cache table with effective_from column already exists.');
    console.log('   Migration 027 appears to be already applied. Skipping to seed.');
  } else {
    // Need to apply migration via individual statements
    console.log('📋 Applying migration 027...');

    // Rename old tables
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql_text: 'ALTER TABLE IF EXISTS tariff_cache RENAME TO tariff_cache_v1;'
    });
    if (e1) {
      // Try alternative: the function might not exist
      console.log('⚠️  Cannot execute raw SQL via RPC. Attempting Supabase Dashboard SQL Editor approach.');
      console.log('   Please apply migration 027 manually via Supabase Dashboard SQL Editor:');
      console.log(`   ${SUPABASE_URL?.replace('.co', '.co')}/project/default/sql`);
      console.log('   File: supabase/migrations/027_tariff_cache_v2.sql');

      // Try to check if maybe the tables were already renamed
      const { error: v1Check } = await supabase.from('tariff_cache_v1').select('id').limit(1);
      if (!v1Check) {
        console.log('   ✅ tariff_cache_v1 exists — migration may have been partially applied.');
      }
      
      // Check if new tariff_cache exists
      const { error: newCheck } = await supabase.from('tariff_cache').select('id').limit(1);
      if (newCheck && newCheck.message.includes('does not exist')) {
        console.error('   ❌ New tariff_cache table does not exist. Migration must be applied first.');
        console.error('   Copy the contents of supabase/migrations/027_tariff_cache_v2.sql');
        console.error('   and run it in the Supabase SQL Editor.');
        process.exit(1);
      }
    }
  }

  // Step 2: Verify new schema
  console.log('\n📊 Verifying tariff_cache schema...');
  const { data: schemaCheck, error: schemaError } = await supabase
    .from('tariff_cache')
    .select('id, municipality_id, effective_from, effective_to, utility_type, tariff_name, unit_rate')
    .limit(1);

  if (schemaError) {
    if (schemaError.message.includes('does not exist')) {
      console.error('❌ tariff_cache table does not exist. Apply migration 027 first.');
      console.log('\n📋 Migration SQL is at: supabase/migrations/027_tariff_cache_v2.sql');
      console.log('   Apply via Supabase Dashboard → SQL Editor');
    } else {
      console.error('❌ Schema check error:', schemaError.message);
    }
    process.exit(1);
  }

  console.log('✅ tariff_cache v2 schema confirmed.');

  // Step 3: Run seed (inline — same logic as seed-tariff-cache.ts but simpler)
  console.log('\n🌱 Seeding tariff data...');

  const MUNICIPALITY_ID = 'cct';
  const MUNICIPALITY_NAME = 'City of Cape Town';
  const VAT_RATE = 0.15;

  const WATER_TIERS = [
    { name: 'WATER_TIER_1', start: 0, end: 6 },
    { name: 'WATER_TIER_2', start: 6, end: 10.5 },
    { name: 'WATER_TIER_3', start: 10.5, end: 35 },
    { name: 'WATER_TIER_4', start: 35, end: 99999 },
  ];
  const SEWER_TIERS = [
    { name: 'SEWER_TIER_1', start: 0, end: 4.2 },
    { name: 'SEWER_TIER_2', start: 4.2, end: 10.5 },
    { name: 'SEWER_TIER_3', start: 10.5, end: 35 },
    { name: 'SEWER_TIER_4', start: 35, end: 99999 },
  ];
  const ELEC_BLOCKS = [
    { start: 0, end: 600 },
    { start: 600, end: 99999 },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type R = Record<string, any>;

  interface CacheRow {
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

  const allRows: CacheRow[] = [];

  // Load data files
  const dataDir = path.join(process.cwd(), 'lib', 'tariff', 'data', 'CoCT');
  const dataFiles = fs.readdirSync(dataDir).filter((f: string) => f.endsWith('.json'));

  for (const file of dataFiles) {
    const data: R = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
    const ef = data.effective_from;
    const et = data.effective_to;
    const src = data.source_url || data.gazette_source || 'Unknown';
    const vr = data.vat_rate ?? VAT_RATE;
    if (!ef || !et) continue;

    // Electricity
    if (data.electricity?.home_user) {
      const hu = data.electricity.home_user;
      if (hu.fixed_charge_excl_vat > 0) {
        allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'electricity', tariff_name: 'HOME_USER_FIXED', tier_start_unit: null, tier_end_unit: null, unit_rate: 0, vat_rate: vr, fixed_charge: hu.fixed_charge_excl_vat, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: hu.notes || null });
      }
      if (hu.energy_block1_rate_excl_vat_cents != null) {
        allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'electricity', tariff_name: 'HOME_USER', tier_start_unit: ELEC_BLOCKS[0].start, tier_end_unit: hu.energy_block1_limit_kwh || ELEC_BLOCKS[0].end, unit_rate: hu.energy_block1_rate_excl_vat_cents / 100, vat_rate: vr, fixed_charge: null, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: null });
      }
      if (hu.energy_block2_rate_excl_vat_cents != null) {
        allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'electricity', tariff_name: 'HOME_USER', tier_start_unit: hu.energy_block1_limit_kwh || ELEC_BLOCKS[1].start, tier_end_unit: ELEC_BLOCKS[1].end, unit_rate: hu.energy_block2_rate_excl_vat_cents / 100, vat_rate: vr, fixed_charge: null, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: null });
      }
    }
    if (data.electricity?.domestic) {
      const dom = data.electricity.domestic;
      if (dom.fixed_charge_excl_vat > 0) {
        allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'electricity', tariff_name: 'DOMESTIC_FIXED', tier_start_unit: null, tier_end_unit: null, unit_rate: 0, vat_rate: vr, fixed_charge: dom.fixed_charge_excl_vat, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: null });
      }
      if (dom.energy_block1_rate_excl_vat_cents != null) {
        allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'electricity', tariff_name: 'DOMESTIC', tier_start_unit: 0, tier_end_unit: ELEC_BLOCKS[0].end, unit_rate: dom.energy_block1_rate_excl_vat_cents / 100, vat_rate: vr, fixed_charge: null, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: null });
      }
      if (dom.energy_block2_rate_excl_vat_cents != null) {
        allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'electricity', tariff_name: 'DOMESTIC', tier_start_unit: ELEC_BLOCKS[1].start, tier_end_unit: ELEC_BLOCKS[1].end, unit_rate: dom.energy_block2_rate_excl_vat_cents / 100, vat_rate: vr, fixed_charge: null, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: null });
      }
    }
    if (data.electricity?.lifeline?.energy_all_blocks_rate_excl_vat_cents != null) {
      allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'electricity', tariff_name: 'LIFELINE', tier_start_unit: 0, tier_end_unit: 99999, unit_rate: data.electricity.lifeline.energy_all_blocks_rate_excl_vat_cents / 100, vat_rate: vr, fixed_charge: null, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: null });
    }

    // Water fixed charges
    if (data.water?.fixed_basic_charge_by_meter_size_incl_vat) {
      for (const [size, value] of Object.entries(data.water.fixed_basic_charge_by_meter_size_incl_vat)) {
        if (size === 'notes' || value == null || typeof value !== 'number') continue;
        allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'water', tariff_name: `WATER_FIXED_METER_${size.toUpperCase()}`, tier_start_unit: null, tier_end_unit: null, unit_rate: 0, vat_rate: vr, fixed_charge: Math.round(((value as number) / (1 + vr)) * 100) / 100, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: `Meter size ${size}` });
      }
    }
    if (data.water?.fixed_basic_charge_by_property_value_excl_vat) {
      for (const [band, value] of Object.entries(data.water.fixed_basic_charge_by_property_value_excl_vat)) {
        if (band === 'notes' || value == null || typeof value !== 'number') continue;
        allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'water', tariff_name: `WATER_FIXED_PROPVAL_${band.toUpperCase()}`, tier_start_unit: null, tier_end_unit: null, unit_rate: 0, vat_rate: vr, fixed_charge: value as number, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: `Property value band: ${band}` });
      }
    }
    // Water consumption tiers
    if (data.water?.consumption_rates_domestic_full_excl_vat) {
      const rates = data.water.consumption_rates_domestic_full_excl_vat;
      const map: [string, typeof WATER_TIERS[0]][] = [['step1_0_to_6kl', WATER_TIERS[0]], ['step2_6_to_10_5kl', WATER_TIERS[1]], ['step3_10_5_to_35kl', WATER_TIERS[2]], ['step4_above_35kl', WATER_TIERS[3]]];
      for (const [key, tier] of map) {
        if (rates[key] == null) continue;
        allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'water', tariff_name: tier.name, tier_start_unit: tier.start, tier_end_unit: tier.end, unit_rate: rates[key], vat_rate: vr, fixed_charge: null, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: null });
      }
    }

    // Property rates
    if (data.property_rates?.residential_rate_in_rand != null) {
      allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'refuse', tariff_name: 'PROPERTY_RATES_RESIDENTIAL', tier_start_unit: null, tier_end_unit: null, unit_rate: data.property_rates.residential_rate_in_rand, vat_rate: 0, fixed_charge: null, rebate_amount: data.property_rates.primary_residence_reduction || null, rebate_condition: data.property_rates.primary_residence_reduction ? 'primary_residence' : null, research_source: src, research_notes: data.property_rates.notes || null });
    }

    // Refuse
    if (data.refuse?.residential_240l_bin_weekly_incl_vat != null) {
      const incl = data.refuse.residential_240l_bin_weekly_incl_vat;
      allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'refuse', tariff_name: 'REFUSE_240L', tier_start_unit: null, tier_end_unit: null, unit_rate: 0, vat_rate: vr, fixed_charge: Math.round((incl / (1 + vr)) * 100) / 100, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: data.refuse.notes || null });
    }

    // Sewerage
    if (data.sewerage?.disposal_rate_per_kl_excl_vat != null) {
      allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: ef, effective_to: et, utility_type: 'sewer', tariff_name: 'SEWER_FLAT', tier_start_unit: 0, tier_end_unit: 99999, unit_rate: data.sewerage.disposal_rate_per_kl_excl_vat, vat_rate: vr, fixed_charge: null, rebate_amount: null, rebate_condition: null, research_source: src, research_notes: null });
    }
  }

  // Config sewer tiers
  const configPath = path.join(process.cwd(), 'lib', 'tariff', 'configs', 'city-of-cape-town.json');
  if (fs.existsSync(configPath)) {
    const config: R = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const fyWindows: R = { '2022/23': { from: '2022-07-01', to: '2023-06-30' }, '2023/24': { from: '2023-07-01', to: '2024-06-30' }, '2024/25': { from: '2024-07-01', to: '2025-06-30' }, '2025/26': { from: '2025-07-01', to: '2026-06-30' } };
    if (config.tariffs) {
      for (const [code, entries] of Object.entries(config.tariffs)) {
        if (!code.startsWith('SEWER_TIER_')) continue;
        const tierIdx = parseInt(code.replace('SEWER_TIER_', '')) - 1;
        const tier = SEWER_TIERS[tierIdx];
        if (!tier) continue;
        for (const entry of entries as R[]) {
          const w = fyWindows[entry.fiscal_year];
          if (!w) continue;
          allRows.push({ municipality_id: MUNICIPALITY_ID, municipality_name: MUNICIPALITY_NAME, effective_from: w.from, effective_to: w.to, utility_type: 'sewer', tariff_name: code, tier_start_unit: tier.start, tier_end_unit: tier.end, unit_rate: entry.rate_value, vat_rate: VAT_RATE, fixed_charge: null, rebate_amount: null, rebate_condition: null, research_source: entry.source_url || 'Config file', research_notes: entry.source_document_title ? `${entry.source_document_title}, page ${entry.source_page}` : null });
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = allRows.filter(r => {
    const key = `${r.municipality_id}|${r.utility_type}|${r.tariff_name}|${r.tier_start_unit}|${r.effective_from}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`📊 ${unique.length} unique rows to upsert (${allRows.length - unique.length} dupes removed)`);

  // Upsert in batches
  let inserted = 0;
  const BS = 50;
  for (let i = 0; i < unique.length; i += BS) {
    const batch = unique.slice(i, i + BS);
    const { data: d, error: e } = await supabase.from('tariff_cache').upsert(batch, { onConflict: 'municipality_id,utility_type,tariff_name,tier_start_unit,effective_from', ignoreDuplicates: false }).select('id');
    if (e) {
      console.error(`❌ Batch ${Math.floor(i / BS) + 1}:`, e.message);
    } else {
      inserted += d?.length ?? 0;
    }
  }

  console.log(`✅ ${inserted} rows inserted/updated`);

  // Step 4: Run the user's verification query
  console.log('\n📊 Verification: SELECT utility_type, COUNT(*) GROUP BY utility_type');
  console.log('─'.repeat(40));

  for (const ut of ['electricity', 'water', 'sewer', 'refuse']) {
    const { count } = await supabase.from('tariff_cache').select('id', { count: 'exact', head: true }).eq('utility_type', ut);
    console.log(`   ${ut.padEnd(15)} ${count}`);
  }

  const { count: total } = await supabase.from('tariff_cache').select('id', { count: 'exact', head: true });
  console.log('─'.repeat(40));
  console.log(`   ${'TOTAL'.padEnd(15)} ${total}`);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
