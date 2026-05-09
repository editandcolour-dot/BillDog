import { describe, it, expect } from 'vitest';
import { getParser } from './registry';

describe('coct-bill-parser', () => {

  const wrapBill = (chunk: string) => `
Account details as at 15/07/2024
PROPERTY RATES
${chunk}
`;

  describe('Water Fixed Basic Charge', () => {
    it('parses fully structured Water Fixed Basic Charge', () => {
      const text = wrapBill(`
WATER ( Period 29/10/2024 to 28/11/2024 ) 31 Days
Fixed Basic Charge ( 20mm - KSU391 ) R 135.54 x 2 271.08
REFUSE
      `);
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      expect(parsed?.waterFixedCharges).toHaveLength(1);
      
      const charge = parsed!.waterFixedCharges[0];
      expect(charge.parse_status).toBe('OK');
      expect(charge.chargeType).toBe('WATER_FIXED_BASIC');
      expect(charge.periodStart).toBe('29/10/2024');
      expect(charge.meterSize).toBe('20mm');
      expect(charge.unitRate).toBe(135.54);
      expect(charge.multiplier).toBe(2);
      expect(charge.totalCharged).toBe(271.08);
    });

    it('flags PARSE_FAILED for malformed Water Fixed Basic Charge', () => {
      const text = wrapBill(`
WATER ( Period 29/10/2024 to 28/11/2024 ) 31 Days
Fixed Basic Charge ( 20mm missing rate and total
REFUSE
      `);
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      expect(parsed?.waterFixedCharges).toHaveLength(0);
    });
  });

  describe('Refuse Charge', () => {
    it('parses fully structured Refuse Charge', () => {
      const text = wrapBill(`
REFUSE ( Period 07/11/2024 to 05/12/2024 ) 29 Days
Refuse Charge 240L 166.26
SEWERAGE ( Period 07/11/2024 to 05/12/2024 ) 29 Days
      `);
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      expect(parsed?.refuseCharges).toHaveLength(1);

      const charge = parsed!.refuseCharges[0];
      expect(charge.parse_status).toBe('OK');
      expect(charge.chargeType).toBe('REFUSE');
      expect(charge.periodStart).toBe('07/11/2024');
      expect(charge.binSize).toBe('240L');
      expect(charge.amount).toBe(166.26);
    });

    it('flags PARSE_FAILED for malformed Refuse Charge', () => {
      const text = wrapBill(`
REFUSE ( Period 07/11/2024 to 05/12/2024 ) 29 Days
Refuse Charge 240L GARBAGE
SEWERAGE
      `);
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      expect(parsed?.refuseCharges).toHaveLength(0);
    });
  });

  describe('HUC (Electricity Home User Charge)', () => {
    it('parses fully structured HUC charge', () => {
      const text = wrapBill(`
SUNDRIES ( Period 10/11/2024 to 05/12/2024 ) 25 Days
Elec HU service & wires charge - 08.2025 (PREPAID 4907315610) 339.89
Add 15% VAT
      `);
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      expect(parsed?.hucCharges).toHaveLength(1);

      const charge = parsed!.hucCharges[0];
      expect(charge.parse_status).toBe('OK');
      expect(charge.chargeType).toBe('HUC');
      expect(charge.periodStart).toBe('10/11/2024');
      expect(charge.period).toBe('08.2025');
      expect(charge.meterRef).toBe('4907315610');
      expect(charge.amount).toBe(339.89);
    });

    it('flags PARSE_FAILED for malformed HUC charge', () => {
      const text = wrapBill(`
SUNDRIES ( Period 10/11/2024 to 05/12/2024 ) 25 Days
Electricity Home User Charge - NOPERIOD (PREPAID X) GARBAGE
Add 15% VAT
      `);
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      expect(parsed?.hucCharges).toHaveLength(0);
    });
  });

  describe('Property Rates', () => {
    it('parses fully structured Rates lines with rebate flags', () => {
      const text = wrapBill(`
PROPERTY RATES
# From 01/07/2024 : R 4685000.00 @ 0.0066310 ÷ 365 x 29 2468.28
# From 01/07/2024 : R 450000.00 @ 0.0066310 ÷ 365 x 29 237.14-
WATER
      `);
      const parser = getParser('city-of-cape-town');
      const parsed = parser?.parse(text);
      expect(parsed?.rates).toHaveLength(2);

      const charge1 = parsed!.rates[0];
      expect(charge1.parse_status).toBe('OK');
      expect(charge1.chargeType).toBe('RATES');
      expect(charge1.fromDate).toBe('01/07/2024');
      expect(charge1.rateableValue).toBe(4685000.00);
      expect(charge1.annualRate).toBe(0.0066310);
      expect(charge1.daysInYear).toBe(365);
      expect(charge1.billingDays).toBe(29);
      expect(charge1.billedAmount).toBe(2468.28);
      expect(charge1.rebate).toBe(false);

      const charge2 = parsed!.rates[1];
      expect(charge2.parse_status).toBe('OK');
      expect(charge2.rebate).toBe(true);
      expect(charge2.billedAmount).toBe(-237.14);
    });
  });
});
