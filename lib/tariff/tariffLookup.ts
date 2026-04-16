import fs from 'fs';
import path from 'path';

// Internal type — all three states exist
export type VerificationResult = 
  | { result: 'PASS' }
  | { 
      result: 'FAIL'; 
      billed_amount: number; 
      approved_amount: number; 
      delta: number; 
      tariff_year: string; 
      source_document: string; 
      source_url: string; 
      confidence: 'CONFIRMED' | 'BILL-VERIFIED' 
    }
  | { result: 'UNKNOWN' };

// User-facing type — UNKNOWN does not exist
export type UserFacingVerification = Extract<VerificationResult, { result: 'PASS' | 'FAIL' }>;

const TARIFF_CACHE: Record<string, any> = {};
const TARIFF_DATA_DIR = path.join(process.cwd(), 'lib/tariff/data');

/**
 * Returns the South African municipal tariff year for a given date.
 * Tariff years run from 1 July to 30 June.
 * @param dateString Format expected: DD/MM/YYYY or YYYY-MM-DD
 */
export function getTariffYearForDate(dateString: string): string {
  if (!dateString) return 'UNKNOWN';

  let year: number;
  let month: number; // 0-indexed

  if (dateString.includes('/')) {
    // assume DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else {
      return 'UNKNOWN';
    }
  } else if (dateString.includes('-')) {
    // assume YYYY-MM-DD
    const parts = dateString.split('-');
    if (parts.length >= 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
    } else {
      return 'UNKNOWN';
    }
  } else if (dateString.includes('.')) {
    // assume MM.YYYY
    const parts = dateString.split('.');
    if (parts.length === 2) {
      month = parseInt(parts[0], 10) - 1;
      year = parseInt(parts[1], 10);
    } else {
      return 'UNKNOWN';
    }
  } else {
    return 'UNKNOWN';
  }

  // Tariff year shifts on July 1
  if (month >= 6) { // July (6) to Dec (11)
    return `${year}/${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}/${year.toString().slice(-2)}`;
  }
}

/**
 * Returns the current tariff year based on today's date.
 */
export function getCurrentTariffYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 6) {
    return `${year}/${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}/${year.toString().slice(-2)}`;
  }
}

/**
 * Loads the schema JSON for a given municipality and tariff year.
 * @param municipalityCode e.g., 'CoCT'
 * @param tariffYear e.g., '2025/26'
 */
export function loadTariffDb(municipalityCode: string, tariffYear: string) {
  const cacheKey = `${municipalityCode}_${tariffYear}`;
  if (TARIFF_CACHE[cacheKey]) {
    return TARIFF_CACHE[cacheKey];
  }

  // Convert '2025/26' to '2025-26' for filename
  const filenameSafeYear = tariffYear.replace('/', '-');
  const filePath = path.join(TARIFF_DATA_DIR, municipalityCode, `${municipalityCode}_${filenameSafeYear}.json`);

  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      TARIFF_CACHE[cacheKey] = data;
      return data;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`[Tariff DB] Failed to load data for ${municipalityCode} ${tariffYear}:`, error);
    return null;
  }
}

// ── Application Startup Hook ──
function checkTariffDbFreshness() {
  const currentTariffYear = getCurrentTariffYear();
  const municipalities = ['CoCT', 'CoJ', 'CoT', 'CoE', 'ETH', 'NMBM', 'BCM', 'MMM'];

  for (const m of municipalities) {
    const data = loadTariffDb(m, currentTariffYear);
    if (!data) {
      console.error(`TARIFF_DATA_STALE: No data for ${m} ${currentTariffYear}`);
    }
  }
}
// Execute on import
if (typeof window === 'undefined') {
  checkTariffDbFreshness();
}
