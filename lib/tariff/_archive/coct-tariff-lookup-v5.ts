/**
 * CoCT Tariff Lookup — Single Source of Truth
 *
 * All hardcoded CoCT tariff data lives here and NOWHERE ELSE.
 * Each function handles FY calculation internally.
 * Callers pass a date string, get a number back or undefined.
 *
 * Sources: Extracted from 37 real City of Cape Town municipal bills
 *          and confirmed against gazetted tariff schedules.
 *
 * DO NOT add tariff data anywhere else in the codebase.
 * DO NOT modify without confirming against a gazetted CoCT tariff schedule.
 */

// ══════════════════════════════════════════════════════════════
// INTERNAL: Date → FY resolver
// ══════════════════════════════════════════════════════════════

/**
 * Converts a date string into a financial year key like "2024/25".
 * SA municipal FY runs 1 July → 30 June.
 *
 * Accepts: DD/MM/YYYY, YYYY-MM-DD, MM.YYYY
 * Returns: FY string or undefined for unparseable inputs.
 */
function dateToFY(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  let year: number;
  let month: number; // 1-indexed

  if (dateStr.includes('/')) {
    // DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length !== 3) return undefined;
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else if (dateStr.includes('-')) {
    // YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length < 2) return undefined;
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  } else if (dateStr.includes('.')) {
    // MM.YYYY
    const parts = dateStr.split('.');
    if (parts.length === 2) {
      month = parseInt(parts[0], 10);
      year = parseInt(parts[1], 10);
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return undefined;

  // July (7) to December (12) → FY starts this year
  // January (1) to June (6)   → FY started previous year
  if (month >= 7) {
    return `${year}/${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}/${String(year).slice(-2)}`;
  }
}

// ══════════════════════════════════════════════════════════════
// DATA TABLES
// ══════════════════════════════════════════════════════════════

/** Property rates — annual rate-in-the-rand (residential) */
const RATES: Record<string, number> = {
  '2022/23': 0.0063440,
  '2023/24': 0.0062730,
  '2024/25': 0.0066310,
  '2025/26': 0.0071590,
};

/** Electricity Home User Charge — monthly fixed amount (ZAR) */
const HUC: Record<string, number> = {
  '2022/23': 185.00,
  '2023/24': 219.21,
  '2024/25': 245.03,
  '2025/26': 339.89,
};

/** Refuse removal — 240L bin monthly charge (ZAR) */
const REFUSE: Record<string, number> = {
  '2022/23': 149.13,
  '2023/24': 157.30,
  '2024/25': 166.26,
  '2025/26': 178.52,
};

/** Water fixed basic — meter-size based (pre-July 2025), keyed by FY+size */
const WATER_FIXED_BASIC_METER: Record<string, Record<string, number>> = {
  '2022/23': { '20mm': 116.86 },
  '2023/24': { '20mm': 126.91 },
  '2024/25': { '20mm': 135.54 },
  // NOTE: FY2025/26 removed meter-size charges — they switched to property bands
};

/** Water fixed basic — property-value band based (from July 2025), keyed by FY+normalised band */
const WATER_FIXED_BASIC_PROPERTY_BAND: Record<string, Record<string, number>> = {
  '2025/26': {
    'R4500001-R5000000': 214.89,
  },
};

// ══════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════

/**
 * Returns the CoCT residential property rate-in-the-rand for a given date.
 * @param dateStr DD/MM/YYYY, YYYY-MM-DD, or MM.YYYY
 * @returns Annual rate or undefined if period is unknown
 */
export function getCoctRatesForDate(dateStr: string): number | undefined {
  const fy = dateToFY(dateStr);
  if (!fy) return undefined;
  return RATES[fy];
}

/**
 * Returns the CoCT Electricity Home User Charge for a given period.
 * @param period MM.YYYY or DD/MM/YYYY
 * @returns Monthly charge in ZAR or undefined if period is unknown
 */
export function getCoctHucForPeriod(period: string): number | undefined {
  const fy = dateToFY(period);
  if (!fy) return undefined;
  return HUC[fy];
}

/**
 * Returns the CoCT refuse removal charge (240L bin) for a given date.
 * @param dateStr DD/MM/YYYY, YYYY-MM-DD, or MM.YYYY
 * @returns Monthly charge in ZAR or undefined if period is unknown
 */
export function getCoctRefuseForDate(dateStr: string): number | undefined {
  const fy = dateToFY(dateStr);
  if (!fy) return undefined;
  return REFUSE[fy];
}

/**
 * Returns the CoCT water fixed basic charge for a given date and meter size
 * or property value band.
 *
 * Pre-July 2025: meter-size based (e.g., "20mm")
 * From July 2025: property-value band based (e.g., "R4 500 001 - R5 000 000")
 *
 * @param dateStr DD/MM/YYYY, YYYY-MM-DD, or MM.YYYY
 * @param sizeOrBand Meter size like "20mm" OR property band like "R4 500 001 - R5 000 000"
 * @returns Monthly unit rate in ZAR or undefined if unknown
 */
export function getCoctFixedBasicForDate(dateStr: string, sizeOrBand: string): number | undefined {
  const fy = dateToFY(dateStr);
  if (!fy) return undefined;

  // Normalise the key: strip spaces, collapse to "R4500001-R5000000" format
  const normalisedKey = sizeOrBand.replace(/\s/g, '');

  // Try meter-size table first
  const meterTable = WATER_FIXED_BASIC_METER[fy];
  if (meterTable && meterTable[normalisedKey] !== undefined) {
    return meterTable[normalisedKey];
  }

  // Try property-band table
  const bandTable = WATER_FIXED_BASIC_PROPERTY_BAND[fy];
  if (bandTable && bandTable[normalisedKey] !== undefined) {
    return bandTable[normalisedKey];
  }

  return undefined;
}
