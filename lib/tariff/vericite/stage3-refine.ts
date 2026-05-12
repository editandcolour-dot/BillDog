/**
 * VeriCite Stage 3: Final Refinement
 *
 * Takes verified rows from Stage 2 and:
 * 1. Strips duplicates and overlapping tiers
 * 2. Detects mid-year redeterminations (two sets of dates)
 * 3. Assigns overall confidence score
 * 4. Returns final rows ready for tariff_cache upsert
 */

import type {
  VerifiedTariffRow,
  RefinedTariffRow,
  Stage3Result,
  ConfidenceLevel,
} from './types';

/**
 * Detects if verified rows contain evidence of a mid-year redetermination.
 * Redetermination = two or more distinct effective_from dates for the same utility_type.
 */
function detectRedetermination(rows: VerifiedTariffRow[]): boolean {
  const effectiveDates = new Set(rows.map((r) => r.effective_from));
  return effectiveDates.size > 1;
}

/**
 * Checks for tier overlaps within the same utility_type + effective_from group.
 * Returns rows that have overlapping tier_start_unit ranges.
 */
function findTierOverlaps(rows: VerifiedTariffRow[]): VerifiedTariffRow[] {
  const overlapping: VerifiedTariffRow[] = [];
  const tiered = rows.filter((r) => r.tier_start_unit != null);

  for (let i = 0; i < tiered.length; i++) {
    for (let j = i + 1; j < tiered.length; j++) {
      const a = tiered[i];
      const b = tiered[j];

      if (
        a.utility_type !== b.utility_type ||
        a.effective_from !== b.effective_from
      ) {
        continue;
      }

      const aStart = a.tier_start_unit!;
      const aEnd = a.tier_end_unit ?? Infinity;
      const bStart = b.tier_start_unit!;
      const bEnd = b.tier_end_unit ?? Infinity;

      // Check overlap
      if (aStart < bEnd && bStart < aEnd) {
        if (!overlapping.includes(a)) overlapping.push(a);
        if (!overlapping.includes(b)) overlapping.push(b);
      }
    }
  }

  return overlapping;
}

/**
 * Assigns confidence based on verification results.
 */
function scoreConfidence(
  verifiedCount: number,
  totalProposed: number,
  hasPdfOnly: boolean,
  hasOverlaps: boolean,
): ConfidenceLevel {
  if (verifiedCount === 0) return 'failed';
  if (hasOverlaps) return 'low';

  const verifiedRatio = verifiedCount / totalProposed;

  if (hasPdfOnly) {
    // PDF sources verified by URL resolution but not text — cap at medium
    return verifiedRatio >= 0.8 ? 'medium' : 'low';
  }

  if (verifiedRatio >= 0.9) return 'high';
  if (verifiedRatio >= 0.6) return 'medium';
  return 'low';
}

/**
 * Deduplicates rows by (utility_type, tariff_name, tier_start_unit, effective_from).
 * Keeps the first occurrence.
 */
function deduplicateRows(rows: VerifiedTariffRow[]): VerifiedTariffRow[] {
  const seen = new Set<string>();
  const result: VerifiedTariffRow[] = [];

  for (const row of rows) {
    const key = `${row.utility_type}|${row.tariff_name}|${row.tier_start_unit}|${row.effective_from}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  }

  return result;
}

/**
 * Validates basic sanity of each row.
 */
function validateRow(row: VerifiedTariffRow): string | null {
  if (row.unit_rate < 0) return 'negative_unit_rate';
  if (!row.effective_from || !row.effective_to) return 'missing_effective_dates';
  if (row.effective_from > row.effective_to) return 'effective_from_after_effective_to';
  return null;
}

/**
 * Stage 3: Refine and prepare final rows for cache upsert.
 */
export function runStage3(
  verifiedRows: VerifiedTariffRow[],
  totalProposed: number,
): Stage3Result {
  // 1. Deduplicate
  const deduped = deduplicateRows(verifiedRows);

  // 2. Validate — strip invalid rows
  const valid: VerifiedTariffRow[] = [];
  for (const row of deduped) {
    const error = validateRow(row);
    if (error) {
      console.warn(`[VeriCite/Stage3] Dropping row: ${error}`, {
        tariff_name: row.tariff_name,
        unit_rate: row.unit_rate,
      });
      continue;
    }
    valid.push(row);
  }

  if (valid.length === 0) {
    return {
      success: false,
      final_rows: [],
      confidence: 'failed',
      redetermination_detected: false,
      error: 'No valid rows survived Stage 3 refinement',
    };
  }

  // 3. Check for tier overlaps
  const overlaps = findTierOverlaps(valid);
  if (overlaps.length > 0) {
    console.warn(`[VeriCite/Stage3] Tier overlaps detected:`, overlaps.map((r) => r.tariff_name));
  }

  // 4. Detect redetermination
  const redetermination = detectRedetermination(valid);

  // 5. Score confidence
  const hasPdfOnly = valid.every(
    (r) => r.verification_notes?.includes('PDF') ?? false,
  );
  const confidence = scoreConfidence(
    valid.length,
    totalProposed,
    hasPdfOnly,
    overlaps.length > 0,
  );

  // 6. Map to RefinedTariffRow
  const finalRows: RefinedTariffRow[] = valid.map((r) => ({
    municipality_id: r.municipality_id,
    municipality_name: r.municipality_name,
    utility_type: r.utility_type,
    tariff_name: r.tariff_name,
    tier_start_unit: r.tier_start_unit,
    tier_end_unit: r.tier_end_unit,
    unit_rate: r.unit_rate,
    vat_rate: r.vat_rate,
    fixed_charge: r.fixed_charge,
    rebate_amount: r.rebate_amount,
    rebate_condition: r.rebate_condition,
    effective_from: r.effective_from,
    effective_to: r.effective_to,
    research_source: r.research_source,
    research_notes: r.research_notes,
    confidence,
    is_redetermination: redetermination,
  }));

  return {
    success: true,
    final_rows: finalRows,
    confidence,
    redetermination_detected: redetermination,
  };
}
