import { describe, it, expect } from 'vitest';
import { validateBill } from './bill-validator';
import { ParsedBill } from '@/types/analysis';

describe('bill-validator', () => {
  it('returns zero findings for a correct bill', async () => {
    const bill: ParsedBill = {
      invoiceNumber: 'INV001',
      billingDate: '15/07/2024',
      totalDue: 790.04, // 545.01 + 245.03
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
      subtotals: { ratesNet: 545.01, water: 0, refuse: 0, sewerage: 0, sundries: 245.03 },
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
      totalDue: 588.41,
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
      subtotals: { ratesNet: 588.41, water: 0, refuse: 0, sewerage: 0, sundries: 0 },
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
      totalDue: 600.00,
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
      subtotals: { ratesNet: 600.00, water: 0, refuse: 0, sewerage: 0, sundries: 0 },
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
    expect(findings[0].overchargeZar).toBeCloseTo(54.97, 2); // 300 - 245.03
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
});
