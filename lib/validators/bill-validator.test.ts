import { describe, it, expect } from 'vitest';
import { validateBill } from './bill-validator';
import { ParsedBill } from '@/types/analysis';

describe('bill-validator', () => {
  it('returns zero findings for a correct bill', () => {
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
          amount: 245.03,
          label: 'Electricity Home User Charge'
        }
      ],
      returnedDebits: [],
      dishonourFees: []
    };

    const findings = validateBill(bill);
    expect(findings).toHaveLength(0);
  });

  it('flags UNKNOWN_RATE_APPLIED when wrong rate is applied', () => {
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

    const findings = validateBill(bill);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('UNKNOWN_RATE_APPLIED');
    expect(findings[0].expectedAmount).toBe(545.01);
  });

  it('flags RATES_CALC_ERROR on arithmetic mistake', () => {
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

    const findings = validateBill(bill);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('RATES_CALC_ERROR');
    expect(findings[0].expectedAmount).toBe(545.01);
    expect(findings[0].discrepancy).toBe(54.99); // 600 - 545.01
  });

  it('flags HUC_AMOUNT_WRONG when HUC is incorrect', () => {
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
          amount: 300.00, // Should be 245.03
          label: 'Electricity Home User Charge'
        }
      ],
      returnedDebits: [],
      dishonourFees: []
    };

    const findings = validateBill(bill);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('HUC_AMOUNT_WRONG');
    expect(findings[0].expectedAmount).toBe(245.03);
    expect(findings[0].discrepancy).toBe(54.97); // 300 - 245.03
  });
});
