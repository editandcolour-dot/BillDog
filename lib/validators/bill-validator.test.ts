import { describe, it, expect } from 'vitest';
import { validateBill } from './bill-validator';
import { ParsedBill } from '@/types/analysis';

describe('bill-validator', () => {
  it('returns zero findings for a correct bill', async () => {
    const bill: ParsedBill = {
      invoiceNumber: 'INV001',
      billingDate: '15/07/2024',
      totalDue: 552.96, // (545.01 - 237.08) + 245.03
      ratesPeriod: null,
      valuation: null,
      rates: [
        {
          parse_status: 'OK',
          chargeType: 'RATES',
          fromDate: '01/07/2024',
          rateableValue: 1000000,
          annualRate: 0.0066310,
          daysInYear: 365,
          billingDays: 30,
          billedAmount: 545.01,
          rebate: false
        },
        {
          parse_status: 'OK',
          chargeType: 'RATES',
          fromDate: '01/07/2024',
          rateableValue: 435000,
          annualRate: 0.0066310,
          daysInYear: 365,
          billingDays: 30,
          billedAmount: -237.08,
          rebate: true
        }
      ],
      sundryCharges: [],
      hucCharges: [
        {
          parse_status: 'OK',
          chargeType: 'HUC',
          period: '07.2024',
          meterRef: 'XYZ',
          amount: 245.03
        }
      ],
      returnedDebits: [],
      dishonourFees: [],
      meterReadings: [],
      waterFixedCharges: [],
      waterTierCharges: [],
      sewerageCharges: [],
      refuseCharges: [],
      subtotals: { ratesNet: 307.93, water: 0, refuse: 0, sewerage: 0, sundries: 245.03 },
      vatAmount: 0,
      canonicalWaterConsumptionKl: 0
    };

    const findings = await validateBill(bill);
    expect(findings).toHaveLength(0);
  });

  it('flags UNKNOWN_RATE_APPLIED when wrong rate is applied', async () => {
    const bill: ParsedBill = {
      invoiceNumber: 'INV002',
      billingDate: '15/07/2024',
      totalDue: 332.45, // 588.41 - 255.96
      ratesPeriod: null,
      valuation: null,
      rates: [
        {
          parse_status: 'OK',
          chargeType: 'RATES',
          fromDate: '01/07/2024',
          rateableValue: 1000000,
          annualRate: 0.0071590, // Wrong, should be 0.0066310
          daysInYear: 365,
          billingDays: 30,
          billedAmount: 588.41,
          rebate: false
        },
        {
          parse_status: 'OK',
          chargeType: 'RATES',
          fromDate: '01/07/2024',
          rateableValue: 435000,
          annualRate: 0.0071590,
          daysInYear: 365,
          billingDays: 30,
          billedAmount: -255.96,
          rebate: true
        }
      ],
      sundryCharges: [],
      hucCharges: [],
      returnedDebits: [],
      dishonourFees: [],
      meterReadings: [],
      waterFixedCharges: [],
      waterTierCharges: [],
      sewerageCharges: [],
      refuseCharges: [],
      subtotals: { ratesNet: 332.45, water: 0, refuse: 0, sewerage: 0, sundries: 0 },
      vatAmount: 0,
      canonicalWaterConsumptionKl: 0
    };

    const findings = await validateBill(bill);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('UNKNOWN_RATE_APPLIED');
    expect(findings[0].expectedAmount).toBe(545.01);
  });

  it('flags RATES_CALC_ERROR on arithmetic mistake', async () => {
    const bill: ParsedBill = {
      invoiceNumber: 'INV003',
      billingDate: '15/07/2024',
      totalDue: 362.92, // 600 - 237.08
      ratesPeriod: null,
      valuation: null,
      rates: [
        {
          parse_status: 'OK',
          chargeType: 'RATES',
          fromDate: '01/07/2024',
          rateableValue: 1000000,
          annualRate: 0.0066310, // Correct rate
          daysInYear: 365,
          billingDays: 30,
          // Billed amount doesn't match the math. Expected 545.01
          billedAmount: 600.00,
          rebate: false
        },
        {
          parse_status: 'OK',
          chargeType: 'RATES',
          fromDate: '01/07/2024',
          rateableValue: 435000,
          annualRate: 0.0066310,
          daysInYear: 365,
          billingDays: 30,
          billedAmount: -237.08,
          rebate: true
        }
      ],
      sundryCharges: [],
      hucCharges: [],
      returnedDebits: [],
      dishonourFees: [],
      meterReadings: [],
      waterFixedCharges: [],
      waterTierCharges: [],
      sewerageCharges: [],
      refuseCharges: [],
      subtotals: { ratesNet: 362.92, water: 0, refuse: 0, sewerage: 0, sundries: 0 },
      vatAmount: 0,
      canonicalWaterConsumptionKl: 0
    };

    const findings = await validateBill(bill);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('RATES_CALC_ERROR');
    expect(findings[0].expectedAmount).toBe(545.01);
    expect(findings[0].overchargeZar).toBeCloseTo(54.99, 2); // 600 - 545.01
  });

  it('flags HUC_AMOUNT_WRONG when HUC is incorrect', async () => {
    const bill: ParsedBill = {
      invoiceNumber: 'INV004',
      billingDate: '15/07/2024',
      totalDue: 300.00,
      ratesPeriod: null,
      valuation: null,
      rates: [],
      sundryCharges: [],
      hucCharges: [
        {
          parse_status: 'OK',
          chargeType: 'HUC',
          period: '07.2024',
          meterRef: 'XYZ',
          amount: 300.00 // Should be 245.03
        }
      ],
      returnedDebits: [],
      dishonourFees: [],
      meterReadings: [],
      waterFixedCharges: [],
      waterTierCharges: [],
      sewerageCharges: [],
      refuseCharges: [],
      subtotals: { ratesNet: 0, water: 0, refuse: 0, sewerage: 0, sundries: 300.00 },
      vatAmount: 0,
      canonicalWaterConsumptionKl: 0
    };

    const findings = await validateBill(bill);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('HUC_AMOUNT_WRONG');
    expect(findings[0].expectedAmount).toBe(245.03);
    expect(findings[0].overchargeZar).toBeCloseTo(63.22, 2); // (300 - 245.03) * 1.15 — includes VAT cascade
  });

  describe('Tier classification behavior', () => {
    it('Tier 1: strictly runs tariff verification', async () => {
      const bill: ParsedBill = {
        invoiceNumber: 'T1', billingDate: '15/07/2024', totalDue: 300.00,
        ratesPeriod: null, valuation: null, rates: [],
        sundryCharges: [],
        hucCharges: [{ parse_status: 'OK', chargeType: 'HUC', period: '07.2024', meterRef: 'XYZ', amount: 300.00 }],
        returnedDebits: [], dishonourFees: [], meterReadings: [], waterFixedCharges: [], waterTierCharges: [], sewerageCharges: [], refuseCharges: [], 
        subtotals: { ratesNet: 0, water: 0, refuse: 0, sewerage: 0, sundries: 300.00 }, vatAmount: 0, canonicalWaterConsumptionKl: 0
      };
      const findings = await validateBill(bill, 'CoCT');
      expect(findings.some(f => f.type === 'HUC_AMOUNT_WRONG')).toBe(true);
    });

    it('Tier 3: skips tariff json verification and relies exclusively on Universal Checks via Silence', async () => {
      const bill: ParsedBill = {
        invoiceNumber: 'T3', billingDate: '15/07/2024', totalDue: 9999.00,
        ratesPeriod: null, valuation: null, rates: [],
        sundryCharges: [],
        hucCharges: [{ parse_status: 'OK', chargeType: 'HUC', period: '07.2024', meterRef: 'XYZ', amount: 9999.00 }],
        returnedDebits: [], dishonourFees: [], meterReadings: [], waterFixedCharges: [], waterTierCharges: [], sewerageCharges: [], refuseCharges: [], 
        subtotals: { ratesNet: 0, water: 0, refuse: 0, sewerage: 0, sundries: 9999.00 }, vatAmount: 0, canonicalWaterConsumptionKl: 0
      };
      
      const findingsT3 = await validateBill(bill, 'Dihlabeng');
      expect(findingsT3).toHaveLength(0); // Silence is golden for Tier 3
    });
  });

  describe('ValidationFinding contract — overchargeZar is always numeric and non-negative', () => {
    it('every finding for a rebate-arithmetic bill has a non-negative numeric overchargeZar', async () => {
      // This bill has a rebate where billed (R-540) ≠ expected (≈ R-545.01).
      // Pre-C2/C3 this produces:
      //   - REBATE_CALC_ERROR with a negative overchargeZar (expectedRebate - Math.abs(billedAmount) bug)
      //   - RATES_CALC_ERROR from universalChecks (no rebate skip) with a negative overchargeZar
      // Post-fix both should be gone (C3) or emit a positive overchargeZar (C2).
      const bill: ParsedBill = {
        invoiceNumber: 'REBATE-CONTRACT',
        billingDate: '15/07/2024',
        totalDue: 0,
        ratesPeriod: null,
        valuation: null,
        rates: [
          {
            parse_status: 'OK',
            chargeType: 'RATES',
            fromDate: '01/07/2024',
            rateableValue: 1000000,
            annualRate: 0.0066310,
            daysInYear: 365,
            billingDays: 30,
            billedAmount: -540.00,  // Expected ≈ -545.01 — under-rebated by R5.01
            rebate: true
          }
        ],
        sundryCharges: [],
        hucCharges: [],
        meterReadings: [],
        waterFixedCharges: [],
        waterTierCharges: [],
        sewerageCharges: [],
        refuseCharges: [],
        subtotals: { ratesNet: -540, water: 0, refuse: 0, sewerage: 0, sundries: 0 },
        vatAmount: 0,
        canonicalWaterConsumptionKl: 0
      } as ParsedBill;

      const findings = await validateBill(bill, 'CoCT');
      expect(findings.length).toBeGreaterThan(0);
      for (const f of findings) {
        expect(typeof f.overchargeZar).toBe('number');
        expect(Number.isFinite(f.overchargeZar)).toBe(true);
        expect(f.overchargeZar).toBeGreaterThanOrEqual(0);
      }
    });

    it('every finding for a meter-reading-mismatch bill has a non-negative numeric overchargeZar', async () => {
      // METER_READING_MISMATCH and SEWERAGE_RATIO_ERROR do not currently set overchargeZar.
      // Pre-C2 the contract test fails at typeof check; post-C2 all branches populate it.
      const bill: ParsedBill = {
        invoiceNumber: 'METER-CONTRACT',
        billingDate: '15/07/2024',
        totalDue: 0,
        ratesPeriod: null,
        valuation: null,
        rates: [],
        sundryCharges: [],
        hucCharges: [],
        meterReadings: [
          { service: 'water', meterNumber: 'M1', readingFrom: '0', readingTo: '10', isEstimated: false, consumption: 10 }
        ],
        waterFixedCharges: [],
        waterTierCharges: [],
        sewerageCharges: [],
        refuseCharges: [],
        subtotals: { ratesNet: 0, water: 0, refuse: 0, sewerage: 0, sundries: 0 },
        vatAmount: 0,
        canonicalWaterConsumptionKl: 5  // 10 kl on meter vs 5 kl canonical → mismatch
      } as ParsedBill;

      const findings = await validateBill(bill, 'CoCT');
      expect(findings.length).toBeGreaterThan(0);
      for (const f of findings) {
        expect(typeof f.overchargeZar).toBe('number');
        expect(Number.isFinite(f.overchargeZar)).toBe(true);
        expect(f.overchargeZar).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Architectural fallback chain (No Silent Skipping)', () => {
    it('flags UNKNOWN_TARIFF and sets recoverable false when resolution yields SKIP', async () => {
      const bill: ParsedBill = {
        invoiceNumber: 'FALLBACK1',
        billingDate: '15/01/2020', // Pre-dates hardcoded fallbacks guaranteeing a SKIP
        totalDue: 300.00,
        ratesPeriod: null,
        valuation: null,
        rates: [],
        sundryCharges: [],
        hucCharges: [{ parse_status: 'OK', chargeType: 'HUC', period: '01.2020', meterRef: 'XYZ', amount: 300.00 }],
        returnedDebits: [],
        dishonourFees: [],
        meterReadings: [],
        waterFixedCharges: [],
        waterTierCharges: [],
        sewerageCharges: [],
        refuseCharges: [],
        subtotals: { ratesNet: 0, water: 0, refuse: 0, sewerage: 0, sundries: 300.00 },
        vatAmount: 0,
        canonicalWaterConsumptionKl: 0
      };

      const findings = await validateBill(bill);
      expect(findings).toHaveLength(1);
      expect(findings[0].type).toBe('UNKNOWN_TARIFF');
      expect(findings[0].recoverable).toBe(false);
      expect(findings[0].billedAmount).toBe(300.00);
      expect(findings[0].expectedAmount).toBe(0);
    });
  });

  describe('Estimated reading detection', () => {
    it('emits ESTIMATED_READING_FLAGGED when water reading is estimated', async () => {
      const bill: ParsedBill = {
        invoiceNumber: 'EST001',
        billingDate: '15/05/2025',
        totalDue: 500.00,
        ratesPeriod: null,
        valuation: null,
        rates: [],
        sundryCharges: [],
        hucCharges: [],
        meterReadings: [],
        waterFixedCharges: [],
        waterTierCharges: [],
        sewerageCharges: [],
        refuseCharges: [],
        subtotals: { ratesNet: 0, water: 0, refuse: 0, sewerage: 0, sundries: 0 },
        vatAmount: 0,
        canonicalWaterConsumptionKl: 6,
        waterReadingStatus: 'estimated',
      } as ParsedBill;

      const findings = await validateBill(bill, 'CoCT');
      const estFinding = findings.find(f => f.type === 'ESTIMATED_READING_FLAGGED');
      expect(estFinding).toBeDefined();
      expect(estFinding!.overchargeZar).toBe(0);
      expect(estFinding!.recoverable).toBe(false);
      expect(estFinding!.description).toContain('estimated');
    });

    it('does NOT emit ESTIMATED_READING_FLAGGED for actual readings', async () => {
      const bill: ParsedBill = {
        invoiceNumber: 'ACT001',
        billingDate: '15/05/2025',
        totalDue: 500.00,
        ratesPeriod: null,
        valuation: null,
        rates: [],
        sundryCharges: [],
        hucCharges: [],
        meterReadings: [],
        waterFixedCharges: [],
        waterTierCharges: [],
        sewerageCharges: [],
        refuseCharges: [],
        subtotals: { ratesNet: 0, water: 0, refuse: 0, sewerage: 0, sundries: 0 },
        vatAmount: 0,
        canonicalWaterConsumptionKl: 6,
        waterReadingStatus: 'actual',
      } as ParsedBill;

      const findings = await validateBill(bill, 'CoCT');
      const estFinding = findings.find(f => f.type === 'ESTIMATED_READING_FLAGGED');
      expect(estFinding).toBeUndefined();
    });
  });

  describe('VAT and PARSER_MISMATCH cascade suppression', () => {
    // Helper: build a T3-01-style bill with specific inflations
    function makeStackedBill(opts: {
      waterTierAmount: number;
      hucAmount: number;
      vatAmount: number;
      totalDue: number;
    }): ParsedBill {
      // Correct baseline: waterFixed=135.54, waterTier=117.54, sewerage=72.32, refuse=166.26, huc=245.03
      // Rates: 2328.23 - 221.28 = 2106.95 (zero-rated)
      // Correct VAT base = 135.54 + 117.54 + 72.32 + 166.26 + 245.03 = 736.69
      // (with waterFixed doubled x2 => 271.08, base = 872.23)
      return {
        invoiceNumber: 'TEST-CASCADE',
        billingDate: '08/11/2024',
        totalDue: opts.totalDue,
        ratesPeriod: null,
        valuation: null,
        rates: [
          { parse_status: 'OK', chargeType: 'RATES', fromDate: '11/10/2024', rateableValue: 1000000, annualRate: 0.006631, daysInYear: 365, billingDays: 30, billedAmount: 2328.23, rebate: false },
          { parse_status: 'OK', chargeType: 'RATES', fromDate: '11/10/2024', rateableValue: 435000, annualRate: 0.006631, daysInYear: 365, billingDays: 30, billedAmount: -221.28, rebate: true },
        ],
        sundryCharges: [],
        hucCharges: [
          { parse_status: 'OK', chargeType: 'HUC', period: '11.2024', meterRef: '4907315610', amount: opts.hucAmount }
        ],
        returnedDebits: [],
        dishonourFees: [],
        meterReadings: [],
        waterFixedCharges: [
          { parse_status: 'OK', raw_line: 'Fixed Basic Charge ( 20mm ) R 135.54 x 2 271.08', chargeType: 'WATER_FIXED_BASIC', section: 'WATER', meterSize: '20mm', unitRate: 135.54, multiplier: 2, totalCharged: 271.08, periodStart: '03/10/2024', periodEnd: '05/11/2024' }
        ],
        waterTierCharges: [
          { parse_status: 'OK', raw_line: `& (1) 6.0000 kl @ R 19.5900 ${opts.waterTierAmount}`, serviceType: 'water', section: 'WATER', applyVatIndicator: true, vatIndicator: '&', description: '(1) 6.0000 kl @ R 19.5900', amount: opts.waterTierAmount, periodStart: '03/10/2024', periodEnd: '05/11/2024', hasVat: true }
        ],
        sewerageCharges: [
          { parse_status: 'OK', raw_line: '& (1) 4.2000 kl @ R 17.2200 72.32', serviceType: 'sewerage', section: 'SEWERAGE', applyVatIndicator: true, vatIndicator: '&', description: '(1) 4.2000 kl @ R 17.2200', amount: 72.32, periodStart: '03/10/2024', periodEnd: '05/11/2024', hasVat: true }
        ],
        refuseCharges: [
          { parse_status: 'OK', raw_line: 'Refuse charge ( 1 X 240lBIN X 1 Removals ) 166.26', chargeType: 'REFUSE', section: 'REFUSE', binSize: '240l', amount: 166.26, periodStart: '11/10/2024', periodEnd: '08/11/2024' }
        ],
        subtotals: {
          ratesNet: 2106.95,
          water: 271.08 + opts.waterTierAmount,
          refuse: 166.26,
          sewerage: 72.32,
          sundries: opts.hucAmount,
        },
        vatAmount: opts.vatAmount,
        canonicalWaterConsumptionKl: 6,
      } as ParsedBill;
    }

    it('tier-line inflation only: no VAT_MISMATCH finding', async () => {
      // Water tier billed 135.54 instead of 117.54 (delta 18.00)
      // HUC correct at 245.03
      // VAT was computed on correct base (872.23) → 130.83
      // BUT parsed VAT base includes inflated water (890.23) → expected 133.53
      // Delta 2.70 = exactly 18.00 × 0.15 → should be suppressed
      const bill = makeStackedBill({
        waterTierAmount: 135.54,
        hucAmount: 245.03,
        vatAmount: 130.83, // Correct VAT (computed on correct amounts)
        totalDue: 2106.95 + 271.08 + 135.54 + 72.32 + 166.26 + 245.03 + 130.83, // Uses inflated water in line items but correct VAT
      });
      // Adjust totalDue to match the bill's own internal consistency:
      // The bill was printed with inflated waterTier but correct VAT
      // Total = ratesNet + water(271.08+135.54) + sewerage + refuse + sundries + vat
      // = 2106.95 + 406.62 + 72.32 + 166.26 + 245.03 + 130.83 = 3128.01

      const findings = await validateBill(bill, 'CoCT');
      const vatFinding = findings.find(f => f.type === 'VAT_MISMATCH');
      expect(vatFinding).toBeUndefined();
      // The tier-line arithmetic mismatch should still fire
      const tierFinding = findings.find(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      expect(tierFinding).toBeDefined();
    });

    it('stacked tier-line + HUC: no VAT_MISMATCH or PARSER_MISMATCH', async () => {
      // T3-01 scenario: water billed 135.54 (delta 18), HUC billed 385.03 (delta 140)
      // Printed VAT = 151.83 (computed on correct base + HUC inflation only)
      // Total = 3271.01 (matches printed bill — municipality computed total from correct water but inflated HUC)
      const bill = makeStackedBill({
        waterTierAmount: 135.54,
        hucAmount: 385.03,
        vatAmount: 151.83,
        totalDue: 3271.01,
      });

      const findings = await validateBill(bill, 'CoCT');
      const vatFinding = findings.find(f => f.type === 'VAT_MISMATCH');
      const parserFinding = findings.find(f => f.type === 'PARSER_MISMATCH');
      expect(vatFinding).toBeUndefined();
      expect(parserFinding).toBeUndefined();
      // Both real findings should still fire
      const tierFinding = findings.find(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      const hucFinding = findings.find(f => f.type === 'HUC_AMOUNT_WRONG');
      expect(tierFinding).toBeDefined();
      expect(hucFinding).toBeDefined();
    });

    it('stacked errors + genuine unexplained total mismatch: PARSER_MISMATCH still surfaces', async () => {
      // calcSum for this bill = 3289.01
      // lineMismatchBase = R18 (from TIER_LINE_ARITHMETIC_MISMATCH: 135.54 - 117.54)
      // Set totalDue so fullSumDiff = 28 → residual = 28 - 18 = R10
      const bill = makeStackedBill({
        waterTierAmount: 135.54,
        hucAmount: 385.03,
        vatAmount: 151.83,
        totalDue: 3289.01 - 28, // = 3261.01 → fullSumDiff=28, residual=10
      });

      const findings = await validateBill(bill, 'CoCT');
      const parserFinding = findings.find(f => f.type === 'PARSER_MISMATCH');
      expect(parserFinding).toBeDefined();
      // The unexplained residual should be approximately R10
      expect(parserFinding!.overchargeZar).toBeGreaterThan(5);
      expect(parserFinding!.overchargeZar).toBeLessThan(15);
    });
  });
});
