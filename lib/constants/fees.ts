/**
 * Canonical success fee constants.
 *
 * ALL user-facing copy, calculations, and templates MUST reference these
 * constants. No string-literal percentages anywhere in the codebase.
 *
 * If the fee changes, update HERE only.
 */

/** Decimal multiplier for the success fee (0.15 = 15%). */
export const RECOVERY_FEE_PERCENTAGE = 0.15;

/** Human-readable percentage string for templates and copy. */
export const RECOVERY_FEE_DISPLAY = '15%';

/** Minimum recovered amount (ZAR) before a fee is charged. */
export const RECOVERY_MINIMUM_ZAR = 200;

/** Minimum fee amount (ZAR) — below this we waive entirely. */
export const MINIMUM_CHARGE_ZAR = 50;
