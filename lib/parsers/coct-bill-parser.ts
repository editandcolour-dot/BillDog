/**
 * City of Cape Town Bill Parser — Deterministic Regex Extraction
 *
 * Extracts every line item from a CoCT municipal bill using regex patterns
 * confirmed against 37 real bills. NO AI. NO GUESSING.
 *
 * Returns null if the text is not a recognised CoCT bill format.
 */

import type { ParsedBill, RatesSegment, HucCharge, ReturnedDebit, DishonourFee } from '@/types/analysis';

// ── Regex patterns confirmed from 37 real CoCT bills ─────

/** Billing date: "Account details as at DD/MM/YYYY" */
const RE_BILLING_DATE = /Account\s+details\s+as\s+at\s+(\d{2}\/\d{2}\/\d{4})/i;

/** Total due: "Current account: Total due 3060.14" */
const RE_TOTAL_DUE = /Current\s+account:\s*Total\s+due\s+([\d,]+\.?\d*)/i;

/** Rates period: "PROPERTY RATES ( Period 07/02/2025 to 06/03/2025 ) 28 Days" */
const RE_RATES_PERIOD = /PROPERTY\s+RATES\s*\(\s*Period\s+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})\s*\)\s*(\d+)\s*Days/i;

/** Rates/Rebate line: "# From 07/02/2025 : R 4685000.00 @ 0.0066310 ÷ 365 x 28 2383.16" (rebate ends with -) */
const RE_RATES_LINE = /#\s+From\s+(\d{2}\/\d{2}\/\d{4})\s*:\s*R\s+([\d,]+\.?\d*)\s*@\s*([\d.]+)\s*÷\s*(\d+)\s*x\s*(\d+)\s+([\d,]+\.?\d*?)(-?)\s*$/gm;

/** Valuation: "Rateable portion of valuation From : 07/02/2025 R 4700000 - R 15000 = R 4685000" */
const RE_VALUATION = /Rateable\s+portion\s+of\s+valuation\s+From\s*:\s*(\d{2}\/\d{2}\/\d{4})\s+R\s+([\d,]+)\s*-\s*R\s+([\d,]+)\s*=\s*R\s+([\d,]+)/i;

/** HUC (pre-Jul 2025): "Electricity Home User Charge - 02.2025 (PREPAID ...) 245.03" */
const RE_HUC_OLD = /Electricity\s+Home\s+User\s+Charge\s*-\s*(\d{2}\.\d{4})\s*\(PREPAID\s+\d+\)\s+([\d,]+\.?\d*)/gi;

/** HUC (Jul 2025+): "Elec HU service & wires charge - 08.2025 (PREPAID ...) 339.89" */
const RE_HUC_NEW = /Elec\s+HU\s+service\s*&\s*wires\s+charge\s*-\s*(\d{2}\.\d{4})\s*\(PREPAID\s+\d+\)\s+([\d,]+\.?\d*)/gi;

/** Returned debit: "Returned cheque /Direct debit 390.87" */
const RE_RETURNED_DEBIT = /Returned\s+cheque\s*\/Direct\s+debit\s+([\d,]+\.?\d*)/gi;

/** Dishonour fee: "Dishonoured Payments Fee 206.09" */
const RE_DISHONOUR_FEE = /Dishonoured\s+Payments\s+Fee\s+([\d,]+\.?\d*)/gi;

// ── Helpers ──────────────────────────────────────────────

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

function isCoctBill(text: string): boolean {
  // A CoCT bill will contain "Account details as at" and "PROPERTY RATES"
  return RE_BILLING_DATE.test(text) && /PROPERTY\s+RATES/i.test(text);
}

// ── Main parser ─────────────────────────────────────────

/**
 * Attempts to parse raw bill text as a City of Cape Town municipal bill.
 * Returns a fully structured ParsedBill or null if the text isn't a CoCT bill.
 */
export function parseCoctBill(text: string): ParsedBill | null {
  if (!isCoctBill(text)) {
    return null;
  }

  // 1. Billing date
  const billingDateMatch = text.match(RE_BILLING_DATE);
  const billingDate = billingDateMatch ? billingDateMatch[1] : '';

  // 2. Total due
  const totalDueMatch = text.match(RE_TOTAL_DUE);
  const totalDue = totalDueMatch ? parseAmount(totalDueMatch[1]) : 0;

  // 3. Rates period
  const periodMatch = text.match(RE_RATES_PERIOD);
  const ratesPeriod = periodMatch
    ? {
        from: periodMatch[1],
        to: periodMatch[2],
        days: parseInt(periodMatch[3], 10),
      }
    : null;

  // 4. Valuation
  const valMatch = text.match(RE_VALUATION);
  const valuation = valMatch
    ? {
        total: parseAmount(valMatch[2]),
        exemption: parseAmount(valMatch[3]),
        rateable: parseAmount(valMatch[4]),
        fromDate: valMatch[1],
      }
    : null;

  // 5. Rates and rebate segments
  const rates: RatesSegment[] = [];
  // Reset lastIndex since RE_RATES_LINE has the global flag
  RE_RATES_LINE.lastIndex = 0;
  let ratesMatch;
  while ((ratesMatch = RE_RATES_LINE.exec(text)) !== null) {
    const isRebate = ratesMatch[7] === '-';
    const fromDate = ratesMatch[1];
    const value = parseAmount(ratesMatch[2]);
    const annualRate = parseFloat(ratesMatch[3]);
    const daysInYear = parseInt(ratesMatch[4], 10);
    const billingDays = parseInt(ratesMatch[5], 10);
    const amount = parseAmount(ratesMatch[6]);

    if (isRebate) {
      // Find the matching rates segment and attach rebate info
      const parent = rates.find(
        (r) => r.fromDate === fromDate && r.annualRate === annualRate && r.billingDays === billingDays
      );
      if (parent) {
        parent.rebateBase = value;
        parent.rebateBilledAmount = amount;
      } else {
        // Standalone rebate — create a segment with rebate fields only
        rates.push({
          fromDate,
          rateableValue: 0,
          annualRate,
          daysInYear,
          billingDays,
          billedAmount: 0,
          rebateBase: value,
          rebateBilledAmount: amount,
        });
      }
    } else {
      rates.push({
        fromDate,
        rateableValue: value,
        annualRate,
        daysInYear,
        billingDays,
        billedAmount: amount,
      });
    }
  }

  // 6. HUC charges and Water Fixed Charges
  const hucCharges: HucCharge[] = [];

  RE_HUC_OLD.lastIndex = 0;
  let hucOld;
  while ((hucOld = RE_HUC_OLD.exec(text)) !== null) {
    hucCharges.push({
      month: hucOld[1],
      amount: parseAmount(hucOld[2]),
      label: hucOld[0].split('-')[0].trim(),
    });
  }

  RE_HUC_NEW.lastIndex = 0;
  let hucNew;
  while ((hucNew = RE_HUC_NEW.exec(text)) !== null) {
    hucCharges.push({
      month: hucNew[1],
      amount: parseAmount(hucNew[2]),
      label: hucNew[0].split('-')[0].trim(),
    });
  }

  // Water Fixed Charge
  // It looks like: "Fixed basic charge (R4 500 001 - R5 000 000) 214.89" or "Fixed Basic Charge (20mm - KSU391) 116.86" or "... x 2 233.72"
  const RE_WATER_FIXED = /Fixed\s+basic\s+charge\s*\((.*?)\)(?:\s*x\s*\d+)?\s+([\d,]+\.?\d*)/gi;
  let waterFixed;
  while ((waterFixed = RE_WATER_FIXED.exec(text)) !== null) {
    // Determine a fallback month based on billingDate
    const fallbackMonth = billingDate ? billingDate.substring(3).replace('/', '.') : 'unknown';
    
    // We store the full matched string so the verifier can extract the multiplier "x 2" if present
    hucCharges.push({
      month: fallbackMonth,
      amount: parseAmount(waterFixed[2]),
      label: waterFixed[0].trim(),
    });
  }

  // 7. Returned debits (context only — not errors)
  const returnedDebits: ReturnedDebit[] = [];
  RE_RETURNED_DEBIT.lastIndex = 0;
  let rdMatch;
  while ((rdMatch = RE_RETURNED_DEBIT.exec(text)) !== null) {
    returnedDebits.push({
      description: 'Returned cheque / Direct debit',
      amount: parseAmount(rdMatch[1]),
    });
  }

  // 8. Dishonour fees
  const dishonourFees: DishonourFee[] = [];
  RE_DISHONOUR_FEE.lastIndex = 0;
  let dfMatch;
  while ((dfMatch = RE_DISHONOUR_FEE.exec(text)) !== null) {
    dishonourFees.push({
      amount: parseAmount(dfMatch[1]),
    });
  }

  // Use billing date as invoice identifier (CoCT bills don't have a separate invoice number)
  const invoiceNumber = billingDate || 'UNKNOWN';

  return {
    invoiceNumber,
    billingDate,
    totalDue,
    ratesPeriod,
    valuation,
    rates,
    hucCharges,
    returnedDebits,
    dishonourFees,
  };
}
