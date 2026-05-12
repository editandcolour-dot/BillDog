/**
 * Tariff Calculator — "What should have been charged" engine.
 *
 * Given a municipality, bill date, utility type, and consumption figure,
 * this module queries the tariff cache for all applicable tiers and
 * calculates the expected charge (fixed + tiered consumption + VAT - rebates).
 *
 * Used by the analysis pipeline to compare actual vs expected charges.
 */

import { lookupTariffCache } from './tariff-cache-v2';
import type {
  TariffCacheRow,
  UtilityType,
  ExpectedCharge,
  TierCharge,
  ChargeDiscrepancy,
} from './types-v2';

// ── Expected Charge Calculation ─────────────────────────────────────────────

/**
 * Calculate the expected charge for a given utility based on cached tariff data.
 *
 * @param municipalityId  e.g. 'cct'
 * @param billDate        YYYY-MM-DD — date on the bill
 * @param utilityType     e.g. 'water'
 * @param consumption     Total consumption in units (kWh, kl, etc.)
 * @param tariffName      Optional: filter to a specific tariff schedule
 * @returns ExpectedCharge or null if no cache data available
 */
export async function calculateExpectedCharge(
  municipalityId: string,
  billDate: string,
  utilityType: UtilityType,
  consumption: number,
  tariffName?: string
): Promise<ExpectedCharge | null> {
  const rows = await lookupTariffCache({
    municipalityId,
    billDate,
    utilityType,
    tariffName,
  });

  if (rows.length === 0) {
    console.log(
      `[tariff-calculator] No cache data for ${municipalityId}/${utilityType} on ${billDate}`
    );
    return null;
  }

  // Separate fixed-charge rows from tiered rows
  const fixedRows = rows.filter(r => r.fixed_charge !== null && r.fixed_charge > 0);
  const tierRows = rows.filter(r => r.tier_start_unit !== null);
  const sources = [...new Set(rows.map(r => r.research_source))];
  const resolvedTariffName = tariffName || rows[0].tariff_name;
  const vatRate = rows[0].vat_rate;

  // Sum fixed charges (excl VAT)
  const fixedCharge = fixedRows.reduce((sum, r) => sum + (r.fixed_charge ?? 0), 0);

  // Calculate tiered consumption charges (excl VAT)
  const tierBreakdown = calculateTierBreakdown(tierRows, consumption);
  const consumptionCharge = tierBreakdown.reduce((sum, t) => sum + t.charge, 0);

  // Sum rebates (excl VAT — stored as excl VAT in the cache)
  const rebateRows = rows.filter(r => r.rebate_amount !== null && r.rebate_amount > 0);
  const rebateExclVat = rebateRows.reduce((sum, r) => sum + (r.rebate_amount ?? 0), 0);

  // ── CRITICAL: CoCT VAT cascade rule ─────────────────────────────────────
  // On CoCT bills, VAT applies to consumption AND fixed charges first.
  // Rebates are then applied as negative VAT-inclusive line items — they
  // carry their own VAT component. This matches the actual bill layout:
  //   Tier charges (excl VAT)     →  sum
  //   Fixed charges (excl VAT)    →  sum
  //   15% VAT on above            →  vatAmount
  //   Rebate (negative, incl VAT) → -rebateInclVat
  //   Total Due                   →  totalInclVat
  //
  // The P2 defect was subtracting rebate BEFORE VAT, which under-calculated
  // the VAT base and produced incorrect expected charges.
  // ────────────────────────────────────────────────────────────────────────

  const chargesExclVat = fixedCharge + consumptionCharge;
  const vatAmount = round2(chargesExclVat * vatRate);
  const rebateInclVat = round2(rebateExclVat * (1 + vatRate));
  const subtotalExclVat = round2(chargesExclVat - rebateExclVat);
  const totalInclVat = round2(chargesExclVat + vatAmount - rebateInclVat);

  return {
    utilityType,
    tariffName: resolvedTariffName,
    tierBreakdown,
    fixedCharge: round2(fixedCharge),
    consumptionCharge: round2(consumptionCharge),
    rebateApplied: round2(rebateInclVat),  // Report as incl VAT (matches bill display)
    subtotalExclVat,
    vatAmount,
    totalInclVat,
    sources,
  };
}

// ── Tier Breakdown ──────────────────────────────────────────────────────────

/**
 * Apply consumption across tier rows, filling each tier in order.
 *
 * Tier rows must be sorted by tier_start_unit ascending (the cache query
 * already does this via ORDER BY tier_start_unit ASC NULLS FIRST).
 */
function calculateTierBreakdown(
  tierRows: TariffCacheRow[],
  totalConsumption: number
): TierCharge[] {
  const breakdown: TierCharge[] = [];
  let remainingUnits = totalConsumption;

  // Sort defensively (should already be sorted by the query)
  const sorted = [...tierRows].sort(
    (a, b) => (a.tier_start_unit ?? 0) - (b.tier_start_unit ?? 0)
  );

  for (const row of sorted) {
    if (remainingUnits <= 0) break;

    const start = row.tier_start_unit ?? 0;
    const end = row.tier_end_unit ?? Infinity;
    const tierCapacity = end - start;
    const unitsInThisTier = Math.min(remainingUnits, tierCapacity);

    if (unitsInThisTier > 0) {
      breakdown.push({
        tierName: row.tariff_name,
        startUnit: start,
        endUnit: end === Infinity ? start + unitsInThisTier : end,
        unitsConsumed: round2(unitsInThisTier),
        unitRate: row.unit_rate,
        charge: round2(unitsInThisTier * row.unit_rate),
      });

      remainingUnits -= unitsInThisTier;
    }
  }

  return breakdown;
}

// ── Actual vs Expected Comparison ───────────────────────────────────────────

interface BillLineItem {
  lineItem: string;
  utilityType: UtilityType;
  amount: number;
}

/**
 * Compare actual bill line items against expected charges from the tariff cache.
 * Flags discrepancies exceeding the threshold (default R100).
 */
export function compareActualVsExpected(
  billLineItems: BillLineItem[],
  expectedCharges: ExpectedCharge[],
  thresholdZar: number = 100
): ChargeDiscrepancy[] {
  const discrepancies: ChargeDiscrepancy[] = [];

  for (const expected of expectedCharges) {
    // Find matching bill line items for this utility type
    const matchingLines = billLineItems.filter(
      l => l.utilityType === expected.utilityType
    );

    if (matchingLines.length === 0) continue;

    const actualTotal = matchingLines.reduce((sum, l) => sum + l.amount, 0);
    const diff = round2(actualTotal - expected.totalInclVat);

    if (Math.abs(diff) >= thresholdZar) {
      discrepancies.push({
        lineItem: matchingLines.map(l => l.lineItem).join(', '),
        utilityType: expected.utilityType,
        billedAmount: round2(actualTotal),
        expectedAmount: expected.totalInclVat,
        differenceZar: diff,
        tariffSource: expected.sources.join('; '),
        reasoning: diff > 0
          ? `Overcharged by R${diff.toFixed(2)} based on gazetted ${expected.tariffName} tariff rates.`
          : `Undercharged by R${Math.abs(diff).toFixed(2)} — possible billing credit or rate mismatch.`,
        confidence: expected.sources.some(s => s.includes('FLAGGED'))
          ? 'low'
          : 'high',
      });
    }
  }

  return discrepancies;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const round2 = (n: number): number => Math.round(n * 100) / 100;
