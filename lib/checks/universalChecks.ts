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

  // Normalise label for comparison: collapse whitespace, lowercase
  const normalise = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

  const checkDuplicates = (charges: { description: string }[] | undefined, arrName: string) => {
    if (!charges) return;
    for (const c of charges) {
      if (NEVER_FLAG_AS_DUPLICATE.some(s => c.description.toLowerCase().includes(s.toLowerCase()))) {
        continue;
      }
      const key = normalise(c.description);
      if (seenLabels.has(key)) {
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
        seenLabels.add(key);
      }
    }
  };

  checkDuplicates(bill.sundryCharges, 'sundry');
  checkDuplicates(bill.waterTierCharges, 'water');
  checkDuplicates(bill.waterFixedCharges.map(c => ({ ...c, description: `Fixed Basic Charge ${c.meterSize}` })), 'water_fixed');
  checkDuplicates(bill.sewerageCharges, 'sewerage');
  checkDuplicates(bill.refuseCharges.map(c => ({ ...c, description: `Refuse Charge ${c.binSize}` })), 'refuse');

  // Cross-section duplicate: refuse charge appearing in both REFUSE and SUNDRIES sections
  if (bill.refuseCharges && bill.sundryCharges) {
    for (const sundry of bill.sundryCharges) {
      if (!sundry.description.toLowerCase().includes('refuse')) continue;
      for (const refuse of bill.refuseCharges) {
        if (Math.abs(sundry.amount - refuse.amount) < 0.01) {
          // Include VAT cascade since refuse is taxable
          const cascadedOvercharge = sundry.hasVat
            ? parseFloat((sundry.amount * 1.15).toFixed(2))
            : sundry.amount;
          findings.push({
            type: 'RATES_CALC_ERROR',
            description: `Duplicate refuse charge detected: R${sundry.amount.toFixed(2)} appears in both REFUSE and SUNDRIES sections.`,
            billedAmount: sundry.amount,
            overchargeZar: cascadedOvercharge,
            lineReference: sundry.raw_line || sundry.description,
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
            recoverable: true
          });
          break; // Only flag once per sundry match
        }
      }
    }
  }

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

  // 4. Per-line arithmetic check: qty × rate ≈ amount
  // Catches tier-line inflation where printed amount ≠ qty × unit rate
  const checkLineArithmetic = (charges: { description: string; amount: number; hasVat: boolean }[] | undefined, serviceName: string) => {
    if (!charges) return;
    for (const c of charges) {
      // Extract qty and rate from description like "(1) 6.0000 kl @ R 19.5900"
      const match = c.description.match(/\(?\d+\)?\s*([\d.]+)\s*kl\s*@\s*R\s*([\d.]+)/i);
      if (!match) continue;
      const qty = parseFloat(match[1]);
      const rate = parseFloat(match[2]);
      if (isNaN(qty) || isNaN(rate) || qty === 0) continue;
      const expectedAmount = parseFloat((qty * rate).toFixed(2));
      const delta = Math.abs(c.amount - expectedAmount);
      if (delta > 0.10) {
        // Include VAT cascade for taxable services (water, sewerage)
        const cascadedDelta = c.hasVat ? parseFloat((delta * 1.15).toFixed(2)) : delta;
        findings.push({
          type: 'TIER_LINE_ARITHMETIC_MISMATCH',
          description: `${serviceName} line arithmetic error. ${qty} kl × R${rate} = R${expectedAmount}, but billed R${c.amount} (delta R${delta.toFixed(2)}).`,
          billedAmount: c.amount,
          expectedAmount: expectedAmount,
          overchargeZar: cascadedDelta,
          lineReference: c.description,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
          recoverable: true
        });
      }
    }
  };

  checkLineArithmetic(bill.waterTierCharges, 'Water');
  checkLineArithmetic(bill.sewerageCharges, 'Sewerage');

  return findings;
}
