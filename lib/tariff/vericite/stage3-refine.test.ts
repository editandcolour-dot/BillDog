/**
 * VeriCite Stage 3 — Unit Tests
 *
 * Tests the deterministic refinement logic:
 * - Deduplication
 * - Tier overlap detection
 * - Mid-year redetermination detection
 * - Confidence scoring
 * - Row validation (negative rates, bad dates)
 */

import { describe, it, expect } from 'vitest';
import { runStage3 } from './stage3-refine';
import type { VerifiedTariffRow } from './types';

function makeRow(overrides: Partial<VerifiedTariffRow> = {}): VerifiedTariffRow {
  return {
    municipality_id: 'cct',
    municipality_name: 'City of Cape Town',
    utility_type: 'electricity',
    tariff_name: 'Domestic Tier 1',
    tier_start_unit: 0,
    tier_end_unit: 600,
    unit_rate: 2.85,
    vat_rate: 0.15,
    fixed_charge: null,
    rebate_amount: null,
    rebate_condition: null,
    effective_from: '2025-07-01',
    effective_to: '2026-06-30',
    research_source: 'https://example.com/tariff.pdf',
    research_notes: null,
    verification_status: 'verified',
    verification_notes: null,
    fetched_content_snippet: null,
    ...overrides,
  };
}

describe('VeriCite Stage 3 — Refinement', () => {
  it('passes through valid verified rows with high confidence', () => {
    const rows = [
      makeRow({ tariff_name: 'Domestic Tier 1', tier_start_unit: 0, tier_end_unit: 600 }),
      makeRow({ tariff_name: 'Domestic Tier 2', tier_start_unit: 600, tier_end_unit: null }),
    ];

    const result = runStage3(rows, 2);

    expect(result.success).toBe(true);
    expect(result.final_rows).toHaveLength(2);
    expect(result.confidence).toBe('high');
    expect(result.redetermination_detected).toBe(false);
  });

  it('deduplicates rows with same key', () => {
    const rows = [
      makeRow({ tariff_name: 'Tier 1', tier_start_unit: 0 }),
      makeRow({ tariff_name: 'Tier 1', tier_start_unit: 0, unit_rate: 3.00 }), // duplicate key
    ];

    const result = runStage3(rows, 2);

    expect(result.success).toBe(true);
    expect(result.final_rows).toHaveLength(1);
    expect(result.final_rows[0].unit_rate).toBe(2.85); // First occurrence wins
  });

  it('detects mid-year redetermination (two effective_from dates)', () => {
    const rows = [
      makeRow({ effective_from: '2025-07-01', effective_to: '2025-12-31' }),
      makeRow({
        tariff_name: 'Domestic Tier 1 (Redetermined)',
        effective_from: '2026-01-01',
        effective_to: '2026-06-30',
        tier_start_unit: 0,
      }),
    ];

    const result = runStage3(rows, 2);

    expect(result.success).toBe(true);
    expect(result.redetermination_detected).toBe(true);
  });

  it('drops rows with negative unit_rate', () => {
    const rows = [
      makeRow({ unit_rate: -1.50 }),
      makeRow({ tariff_name: 'Tier 2', tier_start_unit: 600, unit_rate: 3.50 }),
    ];

    const result = runStage3(rows, 2);

    expect(result.success).toBe(true);
    expect(result.final_rows).toHaveLength(1);
    expect(result.final_rows[0].tariff_name).toBe('Tier 2');
  });

  it('returns failed when all rows are invalid', () => {
    const rows = [makeRow({ unit_rate: -1.0 })];

    const result = runStage3(rows, 1);

    expect(result.success).toBe(false);
    expect(result.confidence).toBe('failed');
  });

  it('detects tier overlaps and lowers confidence', () => {
    const rows = [
      makeRow({ tariff_name: 'Tier 1', tier_start_unit: 0, tier_end_unit: 600 }),
      makeRow({ tariff_name: 'Tier 2', tier_start_unit: 500, tier_end_unit: 1000 }), // overlaps with Tier 1
    ];

    const result = runStage3(rows, 2);

    expect(result.success).toBe(true);
    expect(result.confidence).toBe('low'); // Overlap → low confidence
  });

  it('scores medium confidence when verified count is below 90% of proposed', () => {
    // 3 out of 5 proposed → 60% ratio → medium
    const rows = [
      makeRow({ tariff_name: 'Tier 1', tier_start_unit: 0 }),
      makeRow({ tariff_name: 'Tier 2', tier_start_unit: 600 }),
      makeRow({ tariff_name: 'Tier 3', tier_start_unit: 1000 }),
    ];

    const result = runStage3(rows, 5);

    expect(result.success).toBe(true);
    expect(result.confidence).toBe('medium');
  });

  it('drops rows where effective_from > effective_to', () => {
    const rows = [
      makeRow({ effective_from: '2026-07-01', effective_to: '2025-06-30' }),
      makeRow({ tariff_name: 'Valid', tier_start_unit: 600 }),
    ];

    const result = runStage3(rows, 2);

    expect(result.success).toBe(true);
    expect(result.final_rows).toHaveLength(1);
    expect(result.final_rows[0].tariff_name).toBe('Valid');
  });
});
