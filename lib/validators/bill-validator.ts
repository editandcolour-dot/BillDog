import { ParsedBill, ValidationFinding } from '@/types/analysis';
import { getExpectedRate } from './rates.rules';
import { getExpectedHucAmount, validateHucAmount } from './huc.rules';

export function validateBill(bill: ParsedBill): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  for (const seg of bill.rates) {
    const expectedRate = getExpectedRate(seg.fromDate);
    
    // If we don't have a known rate for this period, we can't validate it definitively.
    // For safety, we only flag if we *do* have an expected rate and it mismatches.
    if (expectedRate !== null) {
      const expectedAmount = parseFloat(
        (seg.rateableValue * seg.annualRate / seg.daysInYear * seg.billingDays).toFixed(2)
      );

      if (Math.abs(seg.annualRate - expectedRate) > 0.0000001) {
        findings.push({
          type: 'UNKNOWN_RATE_APPLIED',
          description: `Rate applied (${seg.annualRate}) doesn't match known CoCT rate for this period (${expectedRate})`,
          billedAmount: seg.billedAmount,
          expectedAmount: parseFloat((seg.rateableValue * expectedRate / seg.daysInYear * seg.billingDays).toFixed(2)),
          discrepancy: parseFloat((seg.billedAmount - (seg.rateableValue * expectedRate / seg.daysInYear * seg.billingDays)).toFixed(2)),
          lineReference: `Rates segment from ${seg.fromDate}: R${seg.rateableValue} @ ${seg.annualRate}`,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
        });
      }

      if (Math.abs(seg.billedAmount - expectedAmount) > 0.02) {
        findings.push({
          type: 'RATES_CALC_ERROR',
          description: `Rates arithmetic error. Expected R${expectedAmount}, billed R${seg.billedAmount}`,
          billedAmount: seg.billedAmount,
          expectedAmount,
          discrepancy: parseFloat((seg.billedAmount - expectedAmount).toFixed(2)),
          lineReference: `Rates segment from ${seg.fromDate}`,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
        });
      }
    }

    if (seg.rebateBase && seg.rebateBilledAmount !== undefined) {
      const expectedRebate = parseFloat(
        (seg.rebateBase * seg.annualRate / seg.daysInYear * seg.billingDays).toFixed(2)
      );
      if (Math.abs(seg.rebateBilledAmount - expectedRebate) > 0.02) {
        findings.push({
          type: 'REBATE_CALC_ERROR',
          description: `Rebate arithmetic error. Expected R${expectedRebate}, applied R${seg.rebateBilledAmount}`,
          billedAmount: seg.rebateBilledAmount,
          expectedAmount: expectedRebate,
          discrepancy: parseFloat((seg.rebateBilledAmount - expectedRebate).toFixed(2)),
          lineReference: `Rebate from ${seg.fromDate}: R${seg.rebateBase} @ ${seg.annualRate}`,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
        });
      }
    }
  }

  for (const huc of bill.hucCharges) {
    if (!validateHucAmount(huc.month, huc.amount)) {
      const expected = getExpectedHucAmount(huc.month);
      if (expected !== null) {
        findings.push({
          type: 'HUC_AMOUNT_WRONG',
          description: `HUC for ${huc.month} is R${huc.amount}, expected R${expected}`,
          billedAmount: huc.amount,
          expectedAmount: expected,
          discrepancy: parseFloat((huc.amount - expected).toFixed(2)),
          lineReference: `${huc.label} - ${huc.month}`,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
        });
      }
    }
  }

  // Returned debits: logged in ParsedBill but NOT flagged as errors here.
  // They represent real bounced debit orders. Pass to AI as context only.

  return findings;
}
