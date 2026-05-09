import { ParsedBill, ValidationFinding } from '@/types/analysis';
import { verifyElectricityHUCharge } from '../tariff/verifiers/electricityHUCharge';
import { verifyWaterFixedCharge } from '../tariff/verifiers/waterFixedCharge';
import { verifyRefuseCharge } from '../tariff/verifiers/refuseCharge';
import { verifyRatesCharge } from '../tariff/verifiers/ratesCharge';
import { classifyMunicipality } from '../tiers/tierClassifier';
import { runUniversalChecks } from '../checks/universalChecks';

export async function validateBill(bill: ParsedBill, municipalityCode: string = 'CoCT'): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];

  if (bill.invoiceNumber && bill.invoiceNumber.includes('108012156854')) {
    console.log('[ISU108012156854_RAW_RATES_PARSER]', JSON.stringify(bill.rates, null, 2));
  }

  // Always run universal checks (VAT, math, duplicates) regardless of Tier
  findings.push(...runUniversalChecks(bill));

  // Push anomalies discovered by the generic parser (e.g. tier-line math errors)
  if (bill.parser_anomalies && bill.parser_anomalies.length > 0) {
    findings.push(...bill.parser_anomalies);
  }

  const tier = classifyMunicipality(municipalityCode);

  if (tier === 3) {
    // For Tier 3, we don't have tariff JSON, so strictly skip tariff verification
    return findings;
  }





  // CANONICAL WATER KL VS METER READING
  if (bill.meterReadings) {
    const totalMeterWaterKl = bill.meterReadings.filter(m => m.service === 'water').reduce((sum, m) => sum + m.consumption, 0);
    if (totalMeterWaterKl > 0 && Math.abs(totalMeterWaterKl - bill.canonicalWaterConsumptionKl) > 0.05) {
        findings.push({
          type: 'METER_READING_MISMATCH',
          description: `Water consumption discrepancy. Printed 'Consumption' is ${bill.canonicalWaterConsumptionKl}kl, but meter reading table shows ${totalMeterWaterKl}kl.`,
          billedAmount: bill.canonicalWaterConsumptionKl,
          expectedAmount: totalMeterWaterKl,
          overchargeZar: 0,
          lineReference: 'WATER (Actual/Estimated reading)',
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
          recoverable: false,
        });
    }
  }

  // SEWERAGE_70 rule
  if (bill.sewerageCharges && bill.canonicalWaterConsumptionKl > 0) {
    let sewerageKl = 0;
    for (const c of bill.sewerageCharges) {
      const matches = [...c.description.matchAll(/([\d.]+)\s*kl/gi)];
      for (const m of matches) {
        sewerageKl += parseFloat(m[1]);
      }
    }
    
    console.log(`[SEW] waterKl=${bill.canonicalWaterConsumptionKl} sewerageKl=${sewerageKl} ratio=${sewerageKl/bill.canonicalWaterConsumptionKl}`);

    const expectedSewerageKl = bill.canonicalWaterConsumptionKl * 0.70;
    if (Math.abs(sewerageKl - expectedSewerageKl) > 0.001) {
       findings.push({
          type: 'SEWERAGE_RATIO_ERROR',
          description: `Sewerage kl (${sewerageKl.toFixed(4)}) is not 70% of Water kl (${bill.canonicalWaterConsumptionKl.toFixed(4)}).`,
          billedAmount: sewerageKl,
          expectedAmount: parseFloat(expectedSewerageKl.toFixed(4)),
          overchargeZar: 0,
          lineReference: 'SEWERAGE',
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
          recoverable: false,
       });
    }
  }

  // Rates Loop
  for (const seg of bill.rates) {
    const verification = await verifyRatesCharge(seg.annualRate, seg.fromDate, municipalityCode);
    if (verification.result === 'SKIP') {
      findings.push({
        type: 'UNKNOWN_TARIFF',
        description: `No tariff data available (resolver or fallback) for property rates from ${seg.fromDate}. Flagged for review.`,
        billedAmount: seg.billedAmount,
        expectedAmount: 0,
        overchargeZar: 0,
        lineReference: `Rates segment from ${seg.fromDate}`,
        invoiceNumber: bill.invoiceNumber,
        billingDate: bill.billingDate,
        recoverable: false
      });
    } else if (verification.result === 'FAIL' && !seg.rebate) {
      if (seg.rateableValue >= 1000000) {
        // Aggregate net impact across main + sibling rebate segments billed at
        // the same (wrong) rate for the same period. PARSER_MISMATCH's
        // explainedDiscrepancy then absorbs the full cascade.
        const approvedRate = verification.approved_rate || 0;
        const mainExpected = seg.rateableValue * approvedRate / seg.daysInYear * seg.billingDays;
        const mainDelta = seg.billedAmount - mainExpected;

        const siblingRebates = bill.rates.filter(r =>
          r.rebate &&
          r.parse_status === 'OK' &&
          r.fromDate === seg.fromDate &&
          Math.abs(r.annualRate - seg.annualRate) < 1e-9
        );

        let rebateDelta = 0;
        for (const rb of siblingRebates) {
          const rebateExpected = -(rb.rateableValue * approvedRate / rb.daysInYear * rb.billingDays);
          rebateDelta += (rb.billedAmount - rebateExpected);
        }

        const netOverchargeZar = parseFloat(Math.abs(mainDelta + rebateDelta).toFixed(2));

        findings.push({
          type: 'UNKNOWN_RATE_APPLIED',
          description: siblingRebates.length > 0
            ? `Rate applied (${seg.annualRate}) doesn't match known municipality rate for this period (${verification.approved_rate}). Net impact across main and rebate segments.`
            : `Rate applied (${seg.annualRate}) doesn't match known municipality rate for this period (${verification.approved_rate})`,
          billedAmount: seg.billedAmount,
          expectedAmount: parseFloat(mainExpected.toFixed(2)),
          overchargeZar: netOverchargeZar,
          lineReference: `Rates segment from ${seg.fromDate}: R${seg.rateableValue} @ ${seg.annualRate}`,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
          sourceUrl: verification.source_url || 'coct-tariff-lookup.ts',
          verificationConfidence: verification.confidence
        });
      }
    }

    if (seg.rebate) {
      const expectedRebate = parseFloat(
        (-(seg.rateableValue * seg.annualRate / seg.daysInYear * seg.billingDays)).toFixed(2)
      );
      if (Math.abs(seg.billedAmount - expectedRebate) > 0.05) {
        findings.push({
          type: 'REBATE_CALC_ERROR',
          description: `Rebate arithmetic error. Expected R${expectedRebate}, applied R${seg.billedAmount}`,
          billedAmount: seg.billedAmount,
          expectedAmount: expectedRebate,
          overchargeZar: parseFloat(Math.abs(seg.billedAmount - expectedRebate).toFixed(2)),
          lineReference: `Rebate from ${seg.fromDate}: R${seg.rateableValue} @ ${seg.annualRate}`,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
        });
      }
    }
  }

  if (tier === 1 || tier === 2) {
    // Check HUC 
    if (bill.hucCharges) {
      for (const huc of bill.hucCharges) {
        if (huc.parse_status === 'PARSE_FAILED') continue;
        // HUC carries its own in-line period (e.g. "07.2024") — authoritative for FY lookup.
        const verifyPeriod = huc.period;
        const verification = await verifyElectricityHUCharge(huc.amount, verifyPeriod, municipalityCode);
        console.log(`[HUC] Struct HUC period="${verifyPeriod}" amount=${huc.amount} expected=${verification.approved_amount}`);
        if (verification.result === 'SKIP') {
          findings.push({
            type: 'UNKNOWN_TARIFF',
            description: `Tariff data unknown for Electricity HUC in ${verifyPeriod}. Flagged for review.`,
            billedAmount: huc.amount,
            expectedAmount: 0,
            overchargeZar: 0,
            lineReference: huc.raw_line || `HUC Charge ${huc.period}`,
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
            recoverable: false
          });
        } else if (verification.result === 'FAIL' && tier === 1) {
          findings.push({
            type: 'HUC_AMOUNT_WRONG',
            description: `Discrepancy in Electricity HU Charge. Expected approx R${verification.approved_amount}, billed R${huc.amount}`,
            billedAmount: huc.amount,
            expectedAmount: verification.approved_amount,
            overchargeZar: Math.abs(verification.delta || 0),
            lineReference: huc.raw_line || `HUC Charge ${huc.period}`,
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
            legalBasis: undefined,
            sourceUrl: verification.source_url,
            verificationConfidence: verification.confidence
          });
        }
      }
    }

    // Check Water Fixed Charge 
    if (bill.waterFixedCharges) {
       for (const wc of bill.waterFixedCharges) {
         if (wc.parse_status === 'PARSE_FAILED') continue;
         // Use the service's period END for FY lookup — CoCT bills straddling
         // July 1 use the new FY's rate (empirically verified across the 36-bill
         // corpus). Using periodStart or invoice date produces FY-boundary FPs.
         if (!wc.periodEnd) {
           findings.push({
             type: 'UNKNOWN_TARIFF',
             description: `Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.`,
             billedAmount: wc.totalCharged,
             expectedAmount: 0,
             overchargeZar: 0,
             lineReference: wc.raw_line || `Water Fixed Basic ${wc.meterSize}`,
             invoiceNumber: bill.invoiceNumber,
             billingDate: bill.billingDate,
             recoverable: false
           });
           continue;
         }
         const verifyDate = wc.periodEnd;
         // UnitRate matched via tariff table. Total is just unitRate * multiplier.
         const verification = await verifyWaterFixedCharge(wc.unitRate, wc.meterSize, verifyDate, municipalityCode, bill.valuation?.total);
         console.log(`[FIXED_BASIC] meterSize="${wc.meterSize}" unitRate=${wc.unitRate} expectedRate=${verification.approved_amount}`);
         
         if (verification.result === 'SKIP') {
           findings.push({
             type: 'UNKNOWN_TARIFF',
             description: `Tariff data unknown for Water Fixed Charge in ${verifyDate}. Flagged for review.`,
             billedAmount: wc.totalCharged,
             expectedAmount: 0,
             overchargeZar: 0,
             lineReference: wc.raw_line || `Water Fixed Basic ${wc.meterSize}`,
             invoiceNumber: bill.invoiceNumber,
             billingDate: bill.billingDate,
             recoverable: false
           });
         } else if (verification.result === 'FAIL' && tier === 1) {
           findings.push({
              type: 'WATER_FIXED_CHARGE_WRONG',
              description: `Discrepancy in Water Fixed Charge. Expected unit rate approx R${verification.approved_amount}, billed unit rate R${wc.unitRate}`,
              billedAmount: wc.totalCharged,
              expectedAmount: (verification.approved_amount || 0) * wc.multiplier,
              overchargeZar: Math.abs((wc.unitRate * wc.multiplier) - ((verification.approved_amount || 0) * wc.multiplier)),
              lineReference: wc.raw_line || `Water Fixed Basic ${wc.meterSize}`,
              invoiceNumber: bill.invoiceNumber,
              billingDate: bill.billingDate,
              legalBasis: undefined,
              sourceUrl: verification.source_url,
              verificationConfidence: verification.confidence
           });
         }
       }
    }

    // Check Refuse Charge
    if (bill.refuseCharges) {
       for (const rc of bill.refuseCharges) {
         if (rc.parse_status === 'PARSE_FAILED') continue;
         // Use the service's period END for FY lookup (same rationale as water fixed).
         if (!rc.periodEnd) {
           findings.push({
             type: 'UNKNOWN_TARIFF',
             description: `Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.`,
             billedAmount: rc.amount,
             expectedAmount: 0,
             overchargeZar: 0,
             lineReference: rc.raw_line || `Refuse Charge ${rc.binSize}`,
             invoiceNumber: bill.invoiceNumber,
             billingDate: bill.billingDate,
             recoverable: false
           });
           continue;
         }
         const verifyDate = rc.periodEnd;
         const verification = await verifyRefuseCharge(rc.amount, verifyDate, municipalityCode);
         if (verification.result === 'SKIP') {
           findings.push({
             type: 'UNKNOWN_TARIFF',
             description: `Tariff data unknown for Refuse Charge in ${verifyDate}. Flagged for review.`,
             billedAmount: rc.amount,
             expectedAmount: 0,
             overchargeZar: 0,
             lineReference: rc.raw_line || `Refuse Charge ${rc.binSize}`,
             invoiceNumber: bill.invoiceNumber,
             billingDate: bill.billingDate,
             recoverable: false
           });
         } else if (verification.result === 'FAIL') {
           findings.push({
              type: 'UNKNOWN_RATE_APPLIED',  // We can repurpose or add a new REFUSE_CHARGE_WRONG type
              description: `Discrepancy in Refuse Charge. Expected approx R${verification.approved_amount}, billed R${rc.amount}`,
              billedAmount: rc.amount,
              expectedAmount: verification.approved_amount,
              overchargeZar: Math.abs(verification.delta || 0),
              lineReference: rc.raw_line || `Refuse Charge ${rc.binSize}`,
              invoiceNumber: bill.invoiceNumber,
              billingDate: bill.billingDate,
              legalBasis: undefined,
              sourceUrl: verification.source_url,
              verificationConfidence: verification.confidence
           });
         }
       }
    }
  }

  // --- STRICT PARSER CHECKS (using exhaustive extraction) ---
  
  // Helper: sum all classified charges + otherCharges
  const classifiedSum = 
    (bill.rates || []).reduce((s, r) => s + r.billedAmount, 0) +
    (bill.waterFixedCharges || []).reduce((s, c) => s + c.totalCharged, 0) +
    (bill.waterTierCharges || []).reduce((s, c) => s + c.amount, 0) +
    (bill.refuseCharges || []).reduce((s, c) => s + c.amount, 0) +
    (bill.sewerageCharges || []).reduce((s, c) => s + c.amount, 0) +
    (bill.hucCharges || []).reduce((s, c) => s + c.amount, 0) +
    (bill.sundryCharges || []).reduce((s, c) => s + c.amount, 0);
  const otherSum = (bill.otherCharges || []).reduce((s, c) => s + c.amount, 0);

  // VAT_CHECK — VAT base is the sum of ALL charges in VAT-able sections
  // VAT-able sections: WATER, REFUSE, SEWERAGE, SUNDRIES (NOT PROPERTY RATES which is 0%)
  // Uses both classified charges AND otherCharges, summed by section membership
  if (bill.vatAmount > 0) {
     const vatSections = ['WATER', 'REFUSE', 'SEWERAGE', 'SUNDRIES'];
     
     // Classified charges from VAT-able sections
     const vatClassified = 
       (bill.waterFixedCharges || []).reduce((s, c) => s + c.totalCharged, 0) +
       (bill.waterTierCharges || []).reduce((s, c) => s + c.amount, 0) +
       (bill.refuseCharges || []).reduce((s, c) => s + c.amount, 0) +
       (bill.sewerageCharges || []).reduce((s, c) => s + c.amount, 0) +
       (bill.hucCharges || []).reduce((s, c) => s + c.amount, 0) +
       (bill.sundryCharges || []).reduce((s, c) => s + c.amount, 0);
     
     // Other charges from VAT-able sections — only lines that were marked
     // with '&' on the bill count toward the VAT base.
     const vatOther = (bill.otherCharges || [])
       .filter(o => vatSections.includes(o.section) && o.hasVat)
       .reduce((s, o) => s + o.amount, 0);
     
     const vatBase = vatClassified + vatOther;
     const expectedVat = parseFloat((vatBase * 0.15).toFixed(2));
     
     console.log(`[VAT_DEBUG] VAT Base: ${vatBase.toFixed(2)}, Expected: ${expectedVat}, Billed: ${bill.vatAmount}`);

     if (Math.abs(expectedVat - bill.vatAmount) > 0.50) {
       // Tariff cascade suppression — don't double-flag VAT when underlying charge is already flagged
       const tariffDiscrepancies = findings.filter(f => 
         f.type === 'UNKNOWN_RATE_APPLIED' || 
         f.type === 'WATER_FIXED_CHARGE_WRONG' || 
         f.type === 'HUC_AMOUNT_WRONG'
       );
       const explainedVatDiscrepancy = tariffDiscrepancies.reduce((sum, f) => sum + (f.overchargeZar || 0) * 0.15, 0);
       const trueVatAnomaly = Math.abs(Math.abs(expectedVat - bill.vatAmount) - explainedVatDiscrepancy);

       if (trueVatAnomaly <= 0.50) {
         console.log(`[VAT] Discrepancy perfectly explained by underlying tariff errors. Suppressing secondary VAT anomaly.`);
       } else {
         findings.push({
            type: 'VAT_MISMATCH',
            description: `VAT calculation mismatch. 15% of VAT-able charges (R${vatBase.toFixed(2)}) is R${expectedVat.toFixed(2)}, printed VAT is R${bill.vatAmount.toFixed(2)}.`,
            billedAmount: bill.vatAmount,
            expectedAmount: expectedVat,
            overchargeZar: Math.abs(expectedVat - bill.vatAmount),
            lineReference: 'Add 15% VAT',
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
         });
       }
     }
  }

  // FULL-SUM CHECK (Safety Net) — uses classifiedSum + otherSum + VAT
  {
     const calcSum = classifiedSum + otherSum + bill.vatAmount;
     const fullSumDiff = Math.abs(calcSum - bill.totalDue);
     if (fullSumDiff > 0.15) {
       const explainedDiscrepancy = findings.reduce((sum, f) => sum + (f.overchargeZar || 0), 0);
       
       if (Math.abs(fullSumDiff - explainedDiscrepancy) >= 0.15) {
         findings.push({
            type: 'PARSER_MISMATCH',
            description: `Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R${calcSum.toFixed(2)} vs Total Due R${bill.totalDue.toFixed(2)}. Unexplained gap of R${Math.abs(fullSumDiff - explainedDiscrepancy).toFixed(2)}.`,
            billedAmount: bill.totalDue,
            expectedAmount: calcSum,
            overchargeZar: Math.abs(fullSumDiff - explainedDiscrepancy),
            lineReference: 'Total due',
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
         });
       }
     }
  }

  return findings;
}
