/**
 * Prescription Date Validation — Phase 1
 *
 * Enforces SA Prescription Act (No. 68 of 1969), Section 11.
 * Prescription periods: water/electricity/gas = 36 months,
 * rates/sewerage/refuse = 360 months (statutory levies).
 *
 * Source: sa-prescription SKILL.md
 * Constraint: ARCHITECTURE.md Section 12, Constraint #8
 */

import type {
  BillError,
  PrescriptionCheck,
  PrescriptionItemWarning,
  PrescriptionWarnings,
  ServiceType,
} from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Prescription period (months) by service type — Section 11. */
const PRESCRIPTION_MONTHS: Record<ServiceType, number | null> = {
  rates: 360,     // 30 years
  refuse: 360,    // 30 years
  sewerage: 360,  // 30 years
  electricity: 36, // 3 years
  water: 36,      // 3 years
  interest: 36,   // 3 years
  sundry: 36,     // 3 years
  unknown: null,  // Manual review required
};

/**
 * Month names for parsing "March 2023" / "Mar 2023" formats.
 * Case-insensitive lookup via lowercase keys.
 */
const MONTH_NAMES: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

/** Quarter-to-month mapping for "Q1 2023" format. */
const QUARTER_START_MONTHS: Record<string, number> = {
  q1: 0, q2: 3, q3: 6, q4: 9,
};

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

/**
 * Parses a bill period string into a UTC Date (first day of the earliest month).
 *
 * Supported formats:
 * - "2023-03" / "2023/03"           → 2023-03-01
 * - "March 2023" / "Mar 2023"       → 2023-03-01
 * - "03/2023"                       → 2023-03-01
 * - "Jan-Mar 2023" / "Jan - Mar 2023" → 2023-01-01 (earliest month)
 * - "Q1 2023" / "q1 2023"           → 2023-01-01
 * - "2023/01 - 2023/03"             → 2023-01-01 (earliest)
 *
 * Returns null if the format cannot be determined (e.g. "Statement Date: 15/03/2023").
 */
export function parseBillPeriod(period: string): Date | null {
  const trimmed = period.trim();

  // Try each parser in order of specificity
  return (
    parseYearMonthDash(trimmed) ??
    parseRangeYearMonth(trimmed) ??
    parseMonthNameRange(trimmed) ??
    parseQuarter(trimmed) ??
    parseMonthYear(trimmed) ??
    parseSlashMonthYear(trimmed) ??
    null
  );
}

/** "2023-03" or "2023/03" */
function parseYearMonthDash(s: string): Date | null {
  const match = s.match(/^(\d{4})[/-](\d{1,2})$/);
  if (!match) return null;
  return makeDate(Number(match[1]), Number(match[2]) - 1);
}

/** "2023/01 - 2023/03" or "2023-01 - 2023-03" — uses earliest date */
function parseRangeYearMonth(s: string): Date | null {
  const match = s.match(/^(\d{4})[/-](\d{1,2})\s*[-–]\s*\d{4}[/-]\d{1,2}$/);
  if (!match) return null;
  return makeDate(Number(match[1]), Number(match[2]) - 1);
}

/** "Jan-Mar 2023" or "January - March 2023" — uses earliest month */
function parseMonthNameRange(s: string): Date | null {
  const match = s.match(
    /^([A-Za-z]+)\s*[-–]\s*[A-Za-z]+\s+(\d{4})$/,
  );
  if (!match) return null;
  const monthIdx = MONTH_NAMES[match[1].toLowerCase()];
  if (monthIdx === undefined) return null;
  return makeDate(Number(match[2]), monthIdx);
}

/** "Q1 2023" — quarter start month */
function parseQuarter(s: string): Date | null {
  const match = s.match(/^(Q[1-4])\s+(\d{4})$/i);
  if (!match) return null;
  const monthIdx = QUARTER_START_MONTHS[match[1].toLowerCase()];
  if (monthIdx === undefined) return null;
  return makeDate(Number(match[2]), monthIdx);
}

/** "March 2023" or "Mar 2023" */
function parseMonthYear(s: string): Date | null {
  const match = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const monthIdx = MONTH_NAMES[match[1].toLowerCase()];
  if (monthIdx === undefined) return null;
  return makeDate(Number(match[2]), monthIdx);
}

/** "03/2023" — MM/YYYY */
function parseSlashMonthYear(s: string): Date | null {
  const match = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return makeDate(Number(match[2]), Number(match[1]) - 1);
}

/** Creates a date on the 1st of the given month. No timezone handling needed. */
function makeDate(year: number, month: number): Date | null {
  if (month < 0 || month > 11 || year < 1900 || year > 2100) return null;
  return new Date(year, month, 1);
}

// ---------------------------------------------------------------------------
// Month calculation
// ---------------------------------------------------------------------------

/**
 * Calendar months between two dates.
 * Compares year and month only — days, hours, and timezone are irrelevant.
 * SA municipal bills only contain month and year.
 */
export function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

// ---------------------------------------------------------------------------
// Core prescription check
// ---------------------------------------------------------------------------

/**
 * Checks the prescription status of a single charge.
 *
 * @param billPeriod - Bill period string (e.g. "2023-03", "March 2023")
 * @param serviceType - Municipal service type
 * @param referenceDate - Override "now" for testability (default: current date)
 * @returns PrescriptionCheck with status, monthsRemaining, and user message
 */
export function checkPrescription(
  billPeriod: string,
  serviceType: ServiceType,
  referenceDate?: Date,
): PrescriptionCheck {
  // Unknown service type → cannot determine
  const limitMonths = PRESCRIPTION_MONTHS[serviceType];
  if (limitMonths == null) {
    return {
      status: 'unknown',
      monthsRemaining: null,
      message:
        'This charge type could not be classified. A manual review is required to determine if prescription applies.',
    };
  }

  // Parse the bill period
  const billDate = parseBillPeriod(billPeriod);
  if (!billDate) {
    return {
      status: 'unknown',
      monthsRemaining: null,
      message:
        'The bill period could not be parsed. A manual review is required to determine if prescription applies.',
    };
  }

  const now = referenceDate ?? new Date();
  const elapsed = monthsBetween(billDate, now);

  // Future-dated bills are parsing errors — real bills are never future-dated
  if (elapsed < 0) {
    return {
      status: 'unknown',
      monthsRemaining: null,
      message:
        'The bill period appears to be in the future. This is likely a parsing error. A manual review is required.',
    };
  }

  const remaining = limitMonths - elapsed;
  const limitYears = limitMonths / 12;

  // Prescribed: elapsed > limit (exclusive boundary — prescribed on month limitMonths + 1)
  if (remaining <= 0) {
    return {
      status: 'prescribed',
      monthsRemaining: 0,
      message: `This ${serviceType} charge is older than ${limitYears} years and is legally prescribed under Section 11 of the Prescription Act. It cannot be disputed.`,
    };
  }

  // Approaching: within 6 months of the limit
  if (remaining <= 6) {
    return {
      status: 'approaching',
      monthsRemaining: remaining,
      message: `This ${serviceType} charge is approaching the ${limitYears}-year prescription limit. Act immediately — only ${remaining} month${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Normal
  return {
    status: 'normal',
    monthsRemaining: remaining,
    message: '',
  };
}

// ---------------------------------------------------------------------------
// Bill-level prescription check
// ---------------------------------------------------------------------------

/**
 * Simplified bill-level check using the 3-year rule.
 * Used when only the overall bill_period is known (no per-item breakdown).
 *
 * @param billPeriod - Bill period string
 * @param referenceDate - Override "now" for testability
 */
export function checkBillPrescription(
  billPeriod: string,
  referenceDate?: Date,
): PrescriptionCheck {
  return checkPrescription(billPeriod, 'electricity', referenceDate);
}

// ---------------------------------------------------------------------------
// Aggregate prescription warnings
// ---------------------------------------------------------------------------

/**
 * Generates granular prescription warnings from an array of bill errors.
 * Checks each error's service_type against its prescription period.
 *
 * @param errors - Array of BillError from Claude analysis
 * @param billPeriod - Overall bill period string
 * @param referenceDate - Override for testability
 */
export function generatePrescriptionWarnings(
  errors: BillError[],
  billPeriod: string,
  referenceDate?: Date,
): PrescriptionWarnings {
  const prescribedItems: PrescriptionItemWarning[] = [];
  const approachingItems: PrescriptionItemWarning[] = [];

  for (const error of errors) {
    const check = checkPrescription(
      billPeriod,
      error.service_type,
      referenceDate,
    );

    if (check.status === 'prescribed') {
      prescribedItems.push({
        lineItem: error.line_item,
        serviceType: error.service_type,
        status: check.status,
        monthsRemaining: check.monthsRemaining,
        message: check.message,
      });
    } else if (check.status === 'approaching') {
      approachingItems.push({
        lineItem: error.line_item,
        serviceType: error.service_type,
        status: check.status,
        monthsRemaining: check.monthsRemaining,
        message: check.message,
      });
    }
  }

  return {
    hasPrescribed: prescribedItems.length > 0,
    hasApproaching: approachingItems.length > 0,
    prescribedItems,
    approachingItems,
  };
}
