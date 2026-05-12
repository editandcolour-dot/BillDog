/**
 * Type definitions for tariff_cache v2 (validity-window-based schema).
 *
 * These types mirror the DB schema from migration 027_tariff_cache_v2.sql
 * and provide typed interfaces for the cache lookup, populate, and
 * calculation modules.
 */

// ── DB Row Type ─────────────────────────────────────────────────────────────

export interface TariffCacheRow {
  id: string;
  municipality_id: string;
  municipality_name: string;
  effective_from: string;        // DATE as ISO string (YYYY-MM-DD)
  effective_to: string;          // DATE as ISO string (YYYY-MM-DD)
  utility_type: UtilityType;
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
  created_at: string;
  updated_at: string;
}

// ── Enum-like Constants ─────────────────────────────────────────────────────

export type UtilityType = 'electricity' | 'water' | 'sewer' | 'refuse' | 'rates';

export const UTILITY_TYPES: UtilityType[] = ['electricity', 'water', 'sewer', 'refuse', 'rates'];

// ── Lookup Parameters ───────────────────────────────────────────────────────

export interface TariffLookupParams {
  municipalityId: string;
  billDate: string;              // YYYY-MM-DD — the date on the bill
  utilityType: UtilityType;
  tariffName?: string;           // Optional: filter to specific tariff
}

// ── Insert Parameters ───────────────────────────────────────────────────────

export interface TariffCacheInsert {
  municipality_id: string;
  municipality_name: string;
  effective_from: string;        // YYYY-MM-DD
  effective_to: string;          // YYYY-MM-DD
  utility_type: UtilityType;
  tariff_name: string;
  tier_start_unit: number | null;
  tier_end_unit: number | null;
  unit_rate: number;
  vat_rate?: number;             // Defaults to 0.15
  fixed_charge?: number | null;
  rebate_amount?: number | null;
  rebate_condition?: string | null;
  research_source: string;
  research_notes?: string | null;
}

// ── Calculation Types ───────────────────────────────────────────────────────

export interface ExpectedCharge {
  utilityType: UtilityType;
  tariffName: string;
  tierBreakdown: TierCharge[];
  fixedCharge: number;           // Sum of fixed charges (excl VAT)
  consumptionCharge: number;     // Sum of tiered charges (excl VAT)
  rebateApplied: number;         // Total rebates applied
  subtotalExclVat: number;
  vatAmount: number;
  totalInclVat: number;
  sources: string[];             // Research source URLs
}

export interface TierCharge {
  tierName: string;
  startUnit: number;
  endUnit: number;
  unitsConsumed: number;
  unitRate: number;
  charge: number;                // unitsConsumed × unitRate
}

export interface ChargeDiscrepancy {
  lineItem: string;
  utilityType: UtilityType;
  billedAmount: number;
  expectedAmount: number;
  differenceZar: number;
  tariffSource: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

// ── Municipality ID Mapping ─────────────────────────────────────────────────

export const MUNICIPALITY_MAP: Record<string, { id: string; name: string }> = {
  'city-of-cape-town': { id: 'cct', name: 'City of Cape Town' },
  'CoCT':              { id: 'cct', name: 'City of Cape Town' },
  'cct':               { id: 'cct', name: 'City of Cape Town' },
  'city-of-johannesburg': { id: 'coj', name: 'City of Johannesburg' },
  'CoJ':               { id: 'coj', name: 'City of Johannesburg' },
  'city-of-tshwane':   { id: 'cot', name: 'City of Tshwane' },
  'CoT':               { id: 'cot', name: 'City of Tshwane' },
  'ethekwini':         { id: 'eth', name: 'eThekwini Municipality' },
  'ETH':               { id: 'eth', name: 'eThekwini Municipality' },
  'ekurhuleni':        { id: 'coe', name: 'Ekurhuleni' },
  'CoE':               { id: 'coe', name: 'Ekurhuleni' },
  'nelson-mandela-bay': { id: 'nmbm', name: 'Nelson Mandela Bay' },
  'NMBM':              { id: 'nmbm', name: 'Nelson Mandela Bay' },
  'buffalo-city':      { id: 'bcm', name: 'Buffalo City' },
  'BCM':               { id: 'bcm', name: 'Buffalo City' },
  'mangaung':          { id: 'mmm', name: 'Mangaung' },
  'MMM':               { id: 'mmm', name: 'Mangaung' },
};

/**
 * Resolves any known municipality alias to the canonical (id, name) pair.
 * Returns null if the alias is unknown.
 */
export function resolveMunicipality(alias: string): { id: string; name: string } | null {
  return MUNICIPALITY_MAP[alias] || null;
}
