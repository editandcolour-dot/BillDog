import { describe, it, expect } from 'vitest';
import { validateBill } from './bill-validator';
import { ParsedBill } from '@/types/analysis';

describe('bill-validator', () => {
  it('returns zero findings for a correct bill', async () => {
    const bill: ParsedBill = {
      invoiceNumber: 'INV001',
      billingDate: '15/07/2024',
      totalDue: 0,
      ratesPeriod: null,
      valuation: null,
      rates: [
        {
          // Valid rate for FY2024/25
          fromDate: '01/07/2024',
          rateableValue: 1000000,
          annualRate: 0.0066310,
          daysInYear: 365,
          billingDays: 30,
          // (1000000 * 0.0066310 / 365 * 30) = 545.01
          billedAmount: 545.01,
        }
      ],
      hucCharges: [
        {
          // Valid HUC for July 2024
          month: '07.2024',
          amount: 281.78,
          label: 'Electricity Home User Charge'
        }
      ],
      returnedDebits: [],
      dishonourFees: []
    };

    const findings = await validateBill(bill);
    expect(findings).toHaveLength(0);
  });

  it('flags UNKNOWN_RATE_APPLIED when wrong rate is applied', async () => {
    const bill: ParsedBill = {
      invoiceNumber: 'INV002',
      billingDate: '15/07/2024',
      totalDue: 0,
      ratesPeriod: null,
      valuation: null,
      rates: [
        {
          // Using wrong rate for FY2024/25 (e.g. they used 2025/26 rate early)
          fromDate: '01/07/2024',
          rateableValue: 1000000,
          annualRate: 0.0071590, // Wrong, should be 0.0066310
          daysInYear: 365,
          billingDays: 30,
          billedAmount: 588.41,
        }
      ],
      hucCharges: [],
      returnedDebits: [],
      dishonourFees: []
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
      totalDue: 0,
      ratesPeriod: null,
      valuation: null,
      rates: [
        {
          fromDate: '01/07/2024',
          rateableValue: 1000000,
          annualRate: 0.0066310, // Correct rate
          daysInYear: 365,
          billingDays: 30,
          // Billed amount doesn't match the math. Expected 545.01
          billedAmount: 600.00,
        }
      ],
      hucCharges: [],
      returnedDebits: [],
      dishonourFees: []
    };

    const findings = await validateBill(bill);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('RATES_CALC_ERROR');
    expect(findings[0].expectedAmount).toBe(545.01);
    expect(findings[0].discrepancy).toBe(54.99); // 600 - 545.01
  });

  it('flags HUC_AMOUNT_WRONG when HUC is incorrect', async () => {
    const bill: ParsedBill = {
      invoiceNumber: 'INV004',
      billingDate: '15/07/2024',
      totalDue: 0,
      ratesPeriod: null,
      valuation: null,
      rates: [],
      hucCharges: [
        {
          month: '07.2024',
          amount: 300.00, // Should be 281.78
          label: 'Electricity Home User Charge'
        }
      ],
      returnedDebits: [],
      dishonourFees: []
    };

    const findings = await validateBill(bill);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('HUC_AMOUNT_WRONG');
    expect(findings[0].expectedAmount).toBe(281.78);
    expect(findings[0].discrepancy).toBe(18.22); // 300 - 281.78
  });

  describe('Tier classification behavior', () => {
    it('Tier 1: strictly runs tariff verification', async () => {
      const bill: ParsedBill = {
        invoiceNumber: 'T1', billingDate: '15/07/2024', totalDue: 0,
        ratesPeriod: null, valuation: null, rates: [],
        hucCharges: [{ month: '07.2024', amount: 300.00, label: 'Electricity Home User Charge' }],
        returnedDebits: [], dishonourFees: []
      };
      // CoCT is Tier 1
      const findings = await validateBill(bill, 'CoCT');
      expect(findings.some(f => f.type === 'HUC_AMOUNT_WRONG')).toBe(true);
    });

    it('Tier 3: skips tariff json verification and relies exclusively on Universal Checks via Silence', async () => {
      const bill: ParsedBill = {
        invoiceNumber: 'T3', billingDate: '15/07/2024', totalDue: 0,
        ratesPeriod: null, valuation: null, rates: [],
        // HUC is wildly wrong, but this is Tier 3, so verification must stay SILENT
        hucCharges: [{ month: '07.2024', amount: 9999.00, label: 'Electricity Home User Charge' }],
        returnedDebits: [], dishonourFees: []
      };
      
      const findings = await validateBill(bill, 'NMBM'); // wait NMBM is Tier 1 for water but we handle overall classification. Let's use a known Tier 3 code.
      // Dihlabeng local municipality will map to Tier 3 fallback
      const findingsT3 = await validateBill(bill, 'Dihlabeng');
      expect(findingsT3).toHaveLength(0); // Silence is golden for Tier 3
    });
  });
});
