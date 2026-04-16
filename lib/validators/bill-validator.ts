import { ParsedBill, ValidationFinding } from '@/types/analysis';
import { getExpectedRate } from './rates.rules';
import { verifyElectricityHUCharge } from '../tariff/verifiers/electricityHUCharge';
import { verifyWaterFixedCharge } from '../tariff/verifiers/waterFixedCharge';

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
    // Determine municipality (currently we only parse CoCT, so hardcode CoCT)
    const municipalityCode = 'CoCT';
    
    // We only process Electricity HU Charge or Water Fixed Charge
    // The parser creates HucCharges array. We should rename it conceptually, but we will process them here.
    // Wait, the parser only dumps electricity into hucCharges. 
    // Is Water Fixed Charge parsed? Let's check coct-bill-parser.ts to see if it even parses Water Fixed Charge!
    
    if (huc.label.includes('Elec') || huc.label.includes('Electricity')) {
      const verification = verifyElectricityHUCharge(huc.amount, bill.billingDate, municipalityCode);
      if (verification.result === 'FAIL') {
        findings.push({
          type: 'HUC_AMOUNT_WRONG',
          description: `Discrepancy in Electricity HU Charge. Expected approx R${verification.expected_amount}, billed R${huc.amount}`,
          billedAmount: huc.amount,
          expectedAmount: verification.expected_amount || undefined,
          discrepancy: Math.abs(verification.delta || 0),
          lineReference: `${huc.label} - ${huc.month}`,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
          legalBasis: verification.legal_basis,
          sourceUrl: verification.source_url,
          verificationConfidence: verification.confidence as 'CONFIRMED' | 'BILL-VERIFIED' | 'SECONDARY'
        });
      }
    } else if (huc.label.toLowerCase().includes('fixed basic charge')) {
      const verification = verifyWaterFixedCharge(huc.amount, huc.label, bill.billingDate, municipalityCode);
      if (verification.result === 'FAIL') {
        findings.push({
          type: 'WATER_FIXED_CHARGE_WRONG',
          description: `Discrepancy in Water Fixed Charge. Expected approx R${verification.expected_amount}, billed R${huc.amount}`,
          billedAmount: huc.amount,
          expectedAmount: verification.expected_amount || undefined,
          discrepancy: Math.abs(verification.delta || 0),
          lineReference: `${huc.label} - ${huc.month}`,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
          legalBasis: verification.legal_basis,
          sourceUrl: verification.source_url,
          verificationConfidence: verification.confidence as 'CONFIRMED' | 'BILL-VERIFIED' | 'SECONDARY'
        });
      }
    }
  }

  // Returned debits: logged in ParsedBill but NOT flagged as errors here.
  // They represent real bounced debit orders. Pass to AI as context only.

  return findings;
}
