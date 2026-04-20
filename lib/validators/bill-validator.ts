import { ParsedBill, ValidationFinding } from '@/types/analysis';
import { getExpectedRate } from './rates.rules';
import { verifyElectricityHUCharge } from '../tariff/verifiers/electricityHUCharge';
import { verifyWaterFixedCharge } from '../tariff/verifiers/waterFixedCharge';
import { verifyRefuseCharge } from '../tariff/verifiers/refuseCharge';
import { classifyMunicipality } from '../tiers/tierClassifier';
import { runUniversalChecks } from '../checks/universalChecks';

export async function validateBill(bill: ParsedBill, municipalityCode: string = 'CoCT'): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];

  // Always run universal checks (VAT, math, duplicates) regardless of Tier
  findings.push(...runUniversalChecks(bill));

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
          lineReference: 'WATER (Actual/Estimated reading)',
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
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
          lineReference: 'SEWERAGE',
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
       });
    }
  }

  // Rates Loop
  for (const seg of bill.rates) {
    const expectedRate = getExpectedRate(seg.fromDate);
    
    if (expectedRate !== null) {
      const expectedAmount = parseFloat(
        (seg.rateableValue * seg.annualRate / seg.daysInYear * seg.billingDays).toFixed(2)
      );

      // never run RATES_CALC_ERROR or UNKNOWN_RATE_APPLIED checks against a rebate segment (under 1M)
      if (seg.rateableValue >= 1000000) {
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
      }
    }

    if (seg.rebateBase && seg.rebateBilledAmount !== undefined) {
      const expectedRebate = parseFloat(
        (seg.rebateBase * seg.annualRate / seg.daysInYear * seg.billingDays).toFixed(2)
      );
      if (Math.abs(seg.rebateBilledAmount - expectedRebate) > 0.05) {
        findings.push({
          type: 'REBATE_CALC_ERROR',
          description: `Rebate arithmetic error. Expected R${expectedRebate}, applied R${seg.rebateBilledAmount}`,
          billedAmount: seg.rebateBilledAmount,
          expectedAmount: expectedRebate,
          discrepancy: parseFloat((expectedRebate - Math.abs(seg.rebateBilledAmount)).toFixed(2)),
          lineReference: `Rebate from ${seg.fromDate}: R${seg.rebateBase} @ ${seg.annualRate}`,
          invoiceNumber: bill.invoiceNumber,
          billingDate: bill.billingDate,
        });
      }
    }
  }

  if (tier === 1 || tier === 2) {
    // Check HUC in Sundries
    if (bill.sundryCharges) {
      for (const huc of bill.sundryCharges) {
        const desc = huc.description.toLowerCase();
        if (desc.includes('elec') || desc.includes('electricity') || desc.includes('home user charge')) {
          // Extract month if available. Usually format: "Electricity Home User Charge - 02.2025"
          const monthMatch = huc.description.match(/-?\s*(\d{2}\.\d{4})/);
          const fallbackMonth = monthMatch ? monthMatch[1] : bill.billingDate;
          
          const verification = await verifyElectricityHUCharge(huc.amount, fallbackMonth, municipalityCode);
          console.log(`[HUC] description="${huc.description}" amount=${huc.amount} expected=${verification.approved_amount}`);
          if (verification.result === 'FAIL' && tier === 1) {
            findings.push({
              type: 'HUC_AMOUNT_WRONG',
              description: `Discrepancy in Electricity HU Charge. Expected approx R${verification.approved_amount}, billed R${huc.amount}`,
              billedAmount: huc.amount,
              expectedAmount: verification.approved_amount,
              discrepancy: Math.abs(verification.delta || 0),
              lineReference: huc.description,
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

    // Check Water Fixed Charge in Water
    if (bill.waterCharges) {
       for (const wc of bill.waterCharges) {
         if (wc.description.toLowerCase().includes('fixed basic charge') && wc.description.includes('20mm')) {
           const dateMatch = wc.description.match(/From\s+(\d{2}\/\d{2}\/\d{4})/i);
           const fixedBasicDate = dateMatch ? dateMatch[1] : bill.billingDate;
           
           const verification = await verifyWaterFixedCharge(wc.amount, wc.description, fixedBasicDate, municipalityCode, bill.valuation?.total);
           console.log(`[FIXED_BASIC] description="${wc.description}" date=${fixedBasicDate} amount=${wc.amount} expected=${verification.approved_amount}`);
           if (verification.result === 'FAIL' && tier === 1) {
             findings.push({
                type: 'WATER_FIXED_CHARGE_WRONG',
                description: `Discrepancy in Water Fixed Charge. Expected approx R${verification.approved_amount}, billed R${wc.amount}`,
                billedAmount: wc.amount,
                expectedAmount: verification.approved_amount,
                discrepancy: Math.abs(verification.delta || 0),
                lineReference: wc.description,
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

    // Check Refuse Charge
    if (bill.refuseCharges) {
       for (const rc of bill.refuseCharges) {
         if (rc.description.toLowerCase().includes('refuse charge')) {
           const verification = await verifyRefuseCharge(rc.amount, bill.billingDate, municipalityCode);
           if (verification.result === 'FAIL') {
             findings.push({
                type: 'UNKNOWN_RATE_APPLIED',  // We can repurpose or add a new REFUSE_CHARGE_WRONG type
                description: `Discrepancy in Refuse Charge. Expected approx R${verification.approved_amount}, billed R${rc.amount}`,
                billedAmount: rc.amount,
                expectedAmount: verification.approved_amount,
                discrepancy: Math.abs(verification.delta || 0),
                lineReference: rc.description,
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
  }

  // --- NEW STRICT PARSER CHECKS ---
  // VAT_CHECK
  if (bill.vatAmount > 0) {
     // Downscope the @ R skip here to prevent raw rates from poisoning the VAT base
     const vatItems = [
        ...(bill.waterCharges || []), 
        ...(bill.sewerageCharges || []), 
        ...(bill.refuseCharges || []), 
        ...(bill.sundryCharges || [])
     ].filter(c => c.hasVat && !/@ R\s*$/.test(c.description));
     
     console.log(`[VAT_DEBUG] VAT Items:`, vatItems.map(c => `${c.amount} (${c.serviceType}: ${c.description})`));
     
     const vatAbleCharges = vatItems.reduce((sum, c) => sum + c.amount, 0);
     const expectedVat = vatAbleCharges * 0.15;
     
     console.log(`[VAT] extracted=${bill.vatAmount} computed=${expectedVat} diff=${bill.vatAmount - expectedVat}`);

     if (Math.abs(expectedVat - bill.vatAmount) > 0.10) {
       // Tariff cascade suppression
       const tariffDiscrepancies = findings.filter(f => 
         f.type === 'UNKNOWN_RATE_APPLIED' || 
         f.type === 'WATER_FIXED_CHARGE_WRONG' || 
         f.type === 'HUC_AMOUNT_WRONG'
       );
       const explainedVatDiscrepancy = tariffDiscrepancies.reduce((sum, f) => sum + (f.discrepancy || 0) * 0.15, 0);
       const trueVatAnomaly = Math.abs(Math.abs(expectedVat - bill.vatAmount) - explainedVatDiscrepancy);

       if (trueVatAnomaly <= 0.05) {
         console.log(`[VAT] Discrepancy perfectly explained by underlying tariff errors. Suppressing secondary VAT anomaly.`);
       } else {
         findings.push({
            type: 'VAT_MISMATCH',
            description: `VAT calculation mismatch. 15% of VAT-able items (&) is approx R${expectedVat.toFixed(2)}, printed VAT is R${bill.vatAmount.toFixed(2)}.`,
            billedAmount: bill.vatAmount,
            expectedAmount: parseFloat(expectedVat.toFixed(2)),
            discrepancy: Math.abs(expectedVat - bill.vatAmount),
            lineReference: 'Add 15% VAT',
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
         });
       }
     }
  }

  // FULL-SUM CHECK (Safety Net)
  if (bill.subtotals) {
     const calcSum = bill.subtotals.ratesNet + bill.subtotals.water + bill.subtotals.refuse + bill.subtotals.sewerage + bill.subtotals.sundries + bill.vatAmount;
     const fullSumDiff = Math.abs(calcSum - bill.totalDue);
     if (fullSumDiff > 0.05) {
       const explainedDiscrepancy = findings.reduce((sum, f) => sum + (f.discrepancy || 0), 0);
       
       if (Math.abs(fullSumDiff - explainedDiscrepancy) >= 0.05) {
         findings.push({
            type: 'PARSER_MISMATCH',
            description: `Full-sum mathematical check failed. Sum of Subtotals + VAT is R${calcSum.toFixed(2)} vs Total Due R${bill.totalDue.toFixed(2)}. Unexplained gap of R${Math.abs(fullSumDiff - explainedDiscrepancy).toFixed(2)}.`,
            billedAmount: bill.totalDue,
            expectedAmount: calcSum,
            discrepancy: fullSumDiff,
            lineReference: 'Total due',
            invoiceNumber: bill.invoiceNumber,
            billingDate: bill.billingDate,
         });
       }
     }
  }

  return findings;
}
