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
  const NEVER_FLAG_AS_DUPLICATE = [
    'Returned cheque /Direct debit',
    'Dishonoured Payments Fee',
    'Fixed basic charge (R4 500',
  ];
  const seenLabels = new Set<string>();

  const checkDuplicates = (charges: { description: string }[] | undefined, arrName: string) => {
    if (!charges) return;
    for (const c of charges) {
      if (NEVER_FLAG_AS_DUPLICATE.some(s => c.description.toLowerCase().includes(s.toLowerCase()))) {
        continue;
      }
      if (seenLabels.has(c.description)) {
        const dupAmount = ('amount' in c) ? (c as any).amount : 0;
        findings.push({
          type: 'RATES_CALC_ERROR',
          description: `Duplicate charge detected for ${c.description}`,
          billedAmount: dupAmount,
          overchargeZar: Math.abs(dupAmount),
          lineReference: c.description,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
        });
      } else {
        seenLabels.add(c.description);
      }
    }
  };

  checkDuplicates(bill.sundryCharges, 'sundry');
  checkDuplicates(bill.waterTierCharges, 'water');
  checkDuplicates(bill.waterFixedCharges.map(c => ({ ...c, description: `Fixed Basic Charge ${c.meterSize}` })), 'water_fixed');
  checkDuplicates(bill.sewerageCharges, 'sewerage');
  checkDuplicates(bill.refuseCharges.map(c => ({ ...c, description: `Refuse Charge ${c.binSize}` })), 'refuse');

  // 3. Property rates internal consistency check
  // (value × rate-in-rand / 365 × days)
  // Rebate segments are checked by the rebate-specific branch in bill-validator;
  // skipping here prevents duplicate findings and avoids the sign-convention clash
  // (rebates carry negative billedAmount, this formula produces a positive expected).
  if (bill.rates) {
    for (const seg of bill.rates) {
      if (seg.rebate) continue;
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
            overchargeZar: parseFloat(Math.abs(seg.billedAmount - expectedMath).toFixed(2)),
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
