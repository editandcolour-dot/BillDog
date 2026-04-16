import { ParsedBill, ValidationFinding } from '@/types/analysis';

export function runUniversalChecks(bill: ParsedBill): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  // 1. VAT Math Checks
  // Often municipal bills include a line item specifically for VAT 15%
  // We don't have VAT explicitly typed in ParsedBill out-of-the-box always,
  // but we can check if totalDue roughly equals subtotal + 15% if we can derive a subtotal.
  // Since 'bill.hucCharges' and 'bill.rates' hold items, we can check basic aggregations.

  // 2. Duplicate Charges Check
  // Same service charged twice in one billing period.
  const seenLabels = new Set<string>();
  
  if (bill.hucCharges) {
    for (const huc of bill.hucCharges) {
      const key = `${huc.label}_${huc.month}`;
      if (seenLabels.has(key)) {
        findings.push({
          type: 'RATES_CALC_ERROR', // repurpose or create a new type if 'DUPLICATE_CHARGE' isn't available
          description: `Duplicate charge detected for ${huc.label} in period ${huc.month}`,
          billedAmount: huc.amount,
          lineReference: huc.label,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
        });
      } else {
        seenLabels.add(key);
      }
    }
  }

  // 3. Property rates internal consistency check
  // (value × rate-in-rand / 365 × days)
  if (bill.rates) {
    for (const seg of bill.rates) {
      if (seg.rateableValue && seg.annualRate && seg.daysInYear && seg.billingDays) {
        const expectedMath = parseFloat(
          ((seg.rateableValue * seg.annualRate) / seg.daysInYear * seg.billingDays).toFixed(2)
        );
        if (Math.abs(seg.billedAmount - expectedMath) > 0.02) {
          findings.push({
            type: 'RATES_CALC_ERROR',
            description: `Rates mathematical consistency error. Subtotal expected R${expectedMath}, billed R${seg.billedAmount}`,
            billedAmount: seg.billedAmount,
            expectedAmount: expectedMath,
            discrepancy: parseFloat((seg.billedAmount - expectedMath).toFixed(2)),
            lineReference: `Rates segment from ${seg.fromDate}`,
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
          });
        }
      }
    }
  }

  return findings;
}
