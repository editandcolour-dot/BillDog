import { ParsedBill, ValidationFinding } from '@/types/analysis';
import { verifyElectricityHUCharge } from '../tariff/verifiers/electricityHUCharge';
import { verifyWaterFixedCharge } from '../tariff/verifiers/waterFixedCharge';
import { verifyRefuseCharge } from '../tariff/verifiers/refuseCharge';
import { verifyRatesCharge } from '../tariff/verifiers/ratesCharge';
import { verifyWaterTierRate } from '../tariff/verifiers/waterTierRate';
import { classifyMunicipality } from '../tiers/tierClassifier';
import { runUniversalChecks } from '../checks/universalChecks';
import { getTariffStore } from '../tariff/registry';
import { getTariffYearForDate } from '../tariff/tariffLookup';

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
          sourceUrl: verification.source_url || 'generic-store',
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
          const baseDelta = Math.abs(verification.delta || 0);
          // HUC is a taxable service — include 15% VAT cascade in recoverable amount
          const cascadedOvercharge = parseFloat((baseDelta * 1.15).toFixed(2));
          findings.push({
            type: 'HUC_AMOUNT_WRONG',
            description: `Discrepancy in Electricity HU Charge. Expected approx R${verification.approved_amount}, billed R${huc.amount}`,
            billedAmount: huc.amount,
            expectedAmount: verification.approved_amount,
            overchargeZar: cascadedOvercharge,
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
              overchargeZar: parseFloat((Math.abs((wc.unitRate * wc.multiplier) - ((verification.approved_amount || 0) * wc.multiplier)) * 1.15).toFixed(2)),
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
              overchargeZar: parseFloat((Math.abs(verification.delta || 0) * 1.15).toFixed(2)),
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

    // Check Water Tier Rates
    if (bill.waterTierCharges) {
      for (const wt of bill.waterTierCharges) {
        if (wt.parse_status === 'PARSE_FAILED') continue;
        // Extract tier number and rate from description like "(1) 6.0000 kl @ R 19.5900"
        const match = wt.description.match(/\((\d+)\)\s*[\d.]+\s*kl\s*@\s*R\s*([\d.]+)/i);
        if (!match) continue;
        const tierNum = parseInt(match[1], 10);
        const billedRate = parseFloat(match[2]);
        if (isNaN(tierNum) || isNaN(billedRate)) continue;
        const verifyDate = wt.periodEnd || bill.billingDate;
        const verification = verifyWaterTierRate(billedRate, tierNum, verifyDate, municipalityCode);
        if (verification.result === 'FAIL' && tier === 1) {
          const qty = parseFloat((wt.description.match(/([\d.]+)\s*kl/i) || ['','0'])[1]);
          const baseDelta = Math.abs((verification.delta || 0) * qty);
          const cascadedOvercharge = parseFloat((baseDelta * 1.15).toFixed(2));
          const overchargeType = (verification.delta || 0) > 0 ? 'WATER_TARIFF_OVERCHARGE' : 'WATER_TARIFF_UNDERCHARGE';
          findings.push({
            type: overchargeType as any,
            description: `Water tier ${tierNum} rate mismatch. Billed R${billedRate}/kl, expected R${verification.approved_rate}/kl (delta R${verification.delta}/kl × ${qty}kl).`,
            billedAmount: wt.amount,
            expectedAmount: parseFloat(((verification.approved_rate || 0) * qty).toFixed(2)),
            overchargeZar: overchargeType === 'WATER_TARIFF_UNDERCHARGE' ? 0 : cascadedOvercharge,
            lineReference: wt.raw_line || wt.description,
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
            sourceUrl: verification.source_url,
            verificationConfidence: verification.confidence,
            recoverable: overchargeType !== 'WATER_TARIFF_UNDERCHARGE'
          });
        }
      }
    }

    // Check for Missing Rebate
    // If property has rates segments with rateableValue > rebate threshold but no rebate segment exists
    if (bill.rates && bill.rates.length > 0) {
      const mainSegments = bill.rates.filter(r => !r.rebate && r.parse_status === 'OK');
      const rebateSegments = bill.rates.filter(r => r.rebate && r.parse_status === 'OK');
      for (const main of mainSegments) {
        // Look up the rebate threshold for this fiscal year
        const fy = getTariffYearForDate(main.periodEnd || main.fromDate);
        const store = getTariffStore('city-of-cape-town');
        const rebateEntry = store.getRate('RATES', fy, 'rebate_threshold');
        const rebateThreshold = rebateEntry?.rate_value || 435000; // Default CoCT threshold
        
        // Check if a matching rebate segment exists for this fromDate
        const hasRebate = rebateSegments.some(r => r.fromDate === main.fromDate);
        if (!hasRebate && main.rateableValue > rebateThreshold) {
          // Calculate expected rebate amount
          const expectedRebate = parseFloat(
            (rebateThreshold * main.annualRate / main.daysInYear * main.billingDays).toFixed(2)
          );
          findings.push({
            type: 'MISSING_REBATE',
            description: `Property rates rebate not applied. Property value R${main.rateableValue} exceeds rebate threshold R${rebateThreshold} — expected rebate credit of ~R${expectedRebate}.`,
            billedAmount: main.billedAmount,
            expectedAmount: parseFloat((main.billedAmount - expectedRebate).toFixed(2)),
            overchargeZar: expectedRebate,
            lineReference: `Rates segment from ${main.fromDate}: R${main.rateableValue}`,
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
            recoverable: true
          });
        }
      }
    }
  }

  // Account Summary — carryover balance check
  // If previousBalance > 0 and paymentsReceived = 0, flag for review
  if (bill.previousBalance !== undefined && bill.previousBalance > 0) {
    const payments = bill.paymentsReceived || 0;
    if (payments === 0) {
      findings.push({
        type: 'POSSIBLE_CARRYOVER_ERROR',
        description: `Previous balance of R${bill.previousBalance.toFixed(2)} carried forward with no payment credited. Verify that this balance is correct and not a duplicate or uncleared payment.`,
        billedAmount: bill.previousBalance,
        expectedAmount: 0,
        overchargeZar: bill.previousBalance,
        lineReference: 'Account summary — previous balance',
        invoiceNumber: bill.invoiceNumber,
        billingDate: bill.billingDate,
        recoverable: true
      });
    }
  }

  // Unjustified sundry charges — connection fees and interest
  if (bill.sundryCharges) {
    for (const sc of bill.sundryCharges) {
      const desc = sc.description.toLowerCase();
      if (desc.includes('connection fee') || desc.includes('reconnection fee')) {
        findings.push({
          type: 'REVIEW_REQUIRED',
          description: `Connection/reconnection fee of R${sc.amount.toFixed(2)} detected. Verify this is justified — connection fees should only apply to new connections or reconnections after lawful disconnection.`,
          billedAmount: sc.amount,
          expectedAmount: 0,
          overchargeZar: sc.hasVat ? parseFloat((sc.amount * 1.15).toFixed(2)) : sc.amount,
          lineReference: sc.raw_line || sc.description,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
          recoverable: true
        });
      }
      if (desc.includes('interest') && desc.includes('overdue')) {
        const prevBal = bill.previousBalance || 0;
        if (prevBal === 0) {
          findings.push({
            type: 'REVIEW_REQUIRED',
            description: `Interest charge of R${sc.amount.toFixed(2)} on overdue amount, but no previous balance recorded. Verify overdue amount existed.`,
            billedAmount: sc.amount,
            expectedAmount: 0,
            overchargeZar: sc.amount, // Interest is not VAT-able (# indicator)
            lineReference: sc.raw_line || sc.description,
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
            recoverable: true
          });
        }
      }
    }
  }

  // Estimated reading detection — informational only
  if (bill.waterReadingStatus === 'estimated' || bill.sewerageReadingStatus === 'estimated') {
    const services: string[] = [];
    if (bill.waterReadingStatus === 'estimated') services.push('Water');
    if (bill.sewerageReadingStatus === 'estimated') services.push('Sewerage');
    findings.push({
      type: 'ESTIMATED_READING_FLAGGED',
      description: `${services.join(' and ')} meter reading${services.length > 1 ? 's are' : ' is'} estimated, not actual. Consumption charges may not reflect real usage. Request an actual meter reading if estimates persist across multiple billing periods.`,
      billedAmount: 0,
      expectedAmount: 0,
      overchargeZar: 0,
      lineReference: `${services.join(', ')} section header`,
      invoiceNumber: bill.invoiceNumber,
      billingDate: bill.billingDate,
      recoverable: false
    });
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
         f.type === 'HUC_AMOUNT_WRONG' ||
         f.type === 'TIER_LINE_ARITHMETIC_MISMATCH'
       );
       // overchargeZar now includes VAT cascade (base * 1.15), so extract base before computing explained VAT
        const explainedVatDiscrepancy = tariffDiscrepancies.reduce((sum, f) => {
          const cascaded = f.overchargeZar || 0;
          const base = cascaded / 1.15;  // Remove VAT cascade to get base overcharge
          return sum + base * 0.15;      // VAT portion = base * 15%
        }, 0);
       const vatGap = Math.abs(expectedVat - bill.vatAmount);
       // If explained covers the gap (or exceeds it), suppress.
       // Only flag when gap exceeds what prior findings explain.
       const trueVatAnomaly = vatGap - explainedVatDiscrepancy;

       if (trueVatAnomaly <= 0.50) {
         console.log(`[VAT] Discrepancy explained by underlying tariff errors (gap R${vatGap.toFixed(2)}, explained R${explainedVatDiscrepancy.toFixed(2)}). Suppressing secondary VAT anomaly.`);
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

  // FULL-SUM CHECK (Safety Net) - uses classifiedSum + otherSum + VAT
  // fullSumDiff measures the gap between parsed line items + printed VAT vs printed total.
  // TIER_LINE_ARITHMETIC_MISMATCH errors cause this gap: the line prints an inflated amount
  // but the total was computed from the correct qty × rate. Other errors (HUC, rates) affect
  // both the line AND total equally, so they don't contribute to fullSumDiff.
  {
     const calcSum = classifiedSum + otherSum + bill.vatAmount;
     const fullSumDiff = Math.abs(calcSum - bill.totalDue);
     if (fullSumDiff > 0.15) {
       // Sum the base deltas from line-printing-mismatch findings only
       const lineMismatchBase = findings
         .filter(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH')
         .reduce((sum, f) => sum + ((f.billedAmount || 0) - (f.expectedAmount || 0)), 0);
       const unexplainedResidual = fullSumDiff - Math.abs(lineMismatchBase);
       
       if (unexplainedResidual >= 0.15) {
         findings.push({
            type: 'PARSER_MISMATCH',
            description: `Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R${calcSum.toFixed(2)} vs Total Due R${bill.totalDue.toFixed(2)}. Unexplained gap of R${unexplainedResidual.toFixed(2)}.`,
            billedAmount: bill.totalDue,
            expectedAmount: calcSum,
            overchargeZar: unexplainedResidual,
            lineReference: 'Total due',
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
         });
       }
     }
  }

  return findings;
}
