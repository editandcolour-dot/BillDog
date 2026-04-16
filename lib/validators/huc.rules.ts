/**
 * CoCT Electricity Home User Charge (HUC) — Ground Truth
 *
 * Source: Extracted from 37 real City of Cape Town municipal bills.
 * The HUC is a fixed monthly fee for residential prepaid electricity meters.
 * It was renamed to "Elec HU service & wires charge" from July 2025.
 *
 * DO NOT MODIFY without confirming against a gazetted CoCT tariff schedule.
 */

export interface HucEntry {
  /** Start month (inclusive), format MM.YYYY */
  startMonth: string;
  /** End month (inclusive), format MM.YYYY */
  endMonth: string;
  /** Monthly fixed charge in ZAR */
  amount: number;
  /** Label as it appears on the bill */
  label: string;
}

export const KNOWN_HUC_ENTRIES: HucEntry[] = [
  {
    startMonth: '05.2023',
    endMonth: '06.2023',
    amount: 185.00,
    label: 'Electricity Home User Charge',
  },
  {
    startMonth: '07.2023',
    endMonth: '06.2024',
    amount: 219.21,
    label: 'Electricity Home User Charge',
  },
  {
    startMonth: '07.2024',
    endMonth: '06.2025',
    amount: 245.03,
    label: 'Electricity Home User Charge',
  },
  {
    startMonth: '07.2025',
    endMonth: '12.2099', // Open-ended until next tariff change
    amount: 339.89,
    label: 'Elec HU service & wires charge',
  },
];

/**
 * Parse a month string (MM.YYYY) into a comparable integer YYYYMM.
 */
function monthToInt(mmYYYY: string): number {
  const [mm, yyyy] = mmYYYY.split('.');
  return parseInt(yyyy, 10) * 100 + parseInt(mm, 10);
}

/**
 * Returns the expected HUC amount for a given month string (MM.YYYY).
 * Returns null if no rate is found.
 */
export function getExpectedHucAmount(month: string): number | null {
  const target = monthToInt(month);

  if (isNaN(target)) return null;

  for (const entry of KNOWN_HUC_ENTRIES) {
    const start = monthToInt(entry.startMonth);
    const end = monthToInt(entry.endMonth);
    if (target >= start && target <= end) {
      return entry.amount;
    }
  }

  return null;
}

/**
 * Validates a HUC charge amount against known amounts.
 * Returns true if the amount matches the expected value exactly.
 */
export function validateHucAmount(month: string, amount: number): boolean {
  const expected = getExpectedHucAmount(month);
  if (expected === null) return true; // Unknown period — can't validate, don't flag
  return Math.abs(amount - expected) < 0.01;
}
