import { describe, it, expect } from 'vitest';
import { runUniversalChecks } from '../checks/universalChecks';
import type { ParsedBill } from '@/types/analysis';

/**
 * Minimal ParsedBill factory for tier arithmetic tests.
 * Only populates fields that universalChecks actually reads.
 */
function makeMinimalBill(overrides: Partial<ParsedBill> = {}): ParsedBill {
  return {
    invoiceNumber: 'TEST-001',
    billingDate: '15/06/2026',
    totalDue: 0,
    ratesPeriod: null,
    valuation: null,
    rates: [],
    canonicalWaterConsumptionKl: 0,
    meterReadings: [],
    waterFixedCharges: [],
    waterTierCharges: [],
    sewerageCharges: [],
    refuseCharges: [],
    hucCharges: [],
    sundryCharges: [],
    otherCharges: [],
    sectionSubtotals: [],
    subtotals: { ratesNet: 0, water: 0, refuse: 0, sewerage: 0, sundries: 0 },
    vatAmount: 0,
    ...overrides,
  };
}

describe('universalChecks — tier arithmetic', () => {
  describe('multi-tier water lines (SHIP BLOCKER regression)', () => {
    it('ZERO findings when Tier 1 + Tier 2 sum matches billed amount', () => {
      // Real data: Jun 2026 water
      // Tier 1: 6.707 kl × R21.15 = R141.85
      // Tier 2: 3.293 kl × R29.06 = R95.67
      // Sum: R237.52, billed R237.54 (delta R0.02 < R1.00 tolerance)
      const bill = makeMinimalBill({
        waterTierCharges: [{
          parse_status: 'OK',
          serviceType: 'water',
          description: '(1) 6.7070 kl @ R 21.1500 (2) 3.2930 kl @ R 29.0600',
          amount: 237.54,
          hasVat: true,
        }],
      });

      const findings = runUniversalChecks(bill);
      const tierFindings = findings.filter(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      expect(tierFindings).toHaveLength(0);
    });

    it('ZERO findings for sewerage Tier 1 + Tier 2 within tolerance', () => {
      // Real data: Jun 2026 sewerage
      // Tier 1: 4.695 kl × R15.46 = R72.58
      // Tier 2: 2.305 kl × R21.24 = R48.96
      // Sum: R121.54, billed R121.54
      const bill = makeMinimalBill({
        sewerageCharges: [{
          parse_status: 'OK',
          serviceType: 'sewerage',
          description: '(1) 4.6950 kl @ R 15.4600 (2) 2.3050 kl @ R 21.2400',
          amount: 121.54,
          hasVat: true,
        }],
      });

      const findings = runUniversalChecks(bill);
      const tierFindings = findings.filter(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      expect(tierFindings).toHaveLength(0);
    });

    it('flags genuine overcharge when sum of tiers ≠ billed (delta > R1)', () => {
      // Tier 1: 6.707 kl × R21.15 = R141.85
      // Tier 2: 3.293 kl × R29.06 = R95.67
      // Sum: R237.52, but billed R250.00 (overcharge of R12.48)
      const bill = makeMinimalBill({
        waterTierCharges: [{
          parse_status: 'OK',
          serviceType: 'water',
          description: '(1) 6.7070 kl @ R 21.1500 (2) 3.2930 kl @ R 29.0600',
          amount: 250.00,
          hasVat: true,
        }],
      });

      const findings = runUniversalChecks(bill);
      const tierFindings = findings.filter(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      expect(tierFindings).toHaveLength(1);

      const f = tierFindings[0];
      // Expected sum = 141.85 + 95.67 = 237.52
      expect(f.expectedAmount).toBeCloseTo(237.52, 1);
      // Overcharge = (250 - 237.52) × 1.15 (VAT cascade) ≈ R14.35
      expect(f.overchargeZar).toBeCloseTo(14.35, 0);
      // Description should mention "Sum of tiers"
      expect(f.description).toContain('Sum of tiers');
    });

    it('ZERO findings for single-tier line with correct arithmetic', () => {
      // Single tier: 6.707 kl × R21.15 = R141.85
      const bill = makeMinimalBill({
        waterTierCharges: [{
          parse_status: 'OK',
          serviceType: 'water',
          description: '(1) 6.7070 kl @ R 21.1500',
          amount: 141.85,
          hasVat: true,
        }],
      });

      const findings = runUniversalChecks(bill);
      const tierFindings = findings.filter(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      expect(tierFindings).toHaveLength(0);
    });

    it('SKIPS single tier (3) line — incomplete data, lower tiers missing', () => {
      // Single tier 3: 0.334 kl × R43.44 = R14.51
      // Billed: R251.72 (total includes Tier 1 + Tier 2 not in description)
      // Guard: tier > 1 with only 1 match → incomplete data → skip
      const bill = makeMinimalBill({
        waterTierCharges: [{
          parse_status: 'OK',
          serviceType: 'water',
          description: '(3) 0.3340 kl @ R 43.4400',
          amount: 251.72,
          hasVat: true,
        }],
      });

      const findings = runUniversalChecks(bill);
      const tierFindings = findings.filter(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      expect(tierFindings).toHaveLength(0); // Guard prevents false positive
    });

    it('SKIPS single tier (2) line — incomplete data, tier 1 missing', () => {
      // Single tier 2 without tier 1 present
      const bill = makeMinimalBill({
        waterTierCharges: [{
          parse_status: 'OK',
          serviceType: 'water',
          description: '(2) 3.2930 kl @ R 29.0600',
          amount: 237.54,
          hasVat: true,
        }],
      });

      const findings = runUniversalChecks(bill);
      const tierFindings = findings.filter(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      expect(tierFindings).toHaveLength(0); // Guard prevents false positive
    });

    it('flags single tier (1) line with genuine overcharge', () => {
      // Tier 1 alone IS the full charge for that tier — safe to validate
      const bill = makeMinimalBill({
        waterTierCharges: [{
          parse_status: 'OK',
          serviceType: 'water',
          description: '(1) 6.7070 kl @ R 21.1500',
          amount: 200.00, // expected R141.85, overcharge R58.15
          hasVat: true,
        }],
      });

      const findings = runUniversalChecks(bill);
      const tierFindings = findings.filter(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      expect(tierFindings).toHaveLength(1);
      expect(tierFindings[0].expectedAmount).toBeCloseTo(141.85, 1);
    });

    it('handles 3-tier lines correctly', () => {
      // Tier 1: 6.000 kl × R19.59 = R117.54
      // Tier 2: 4.000 kl × R26.92 = R107.68
      // Tier 3: 2.000 kl × R36.58 = R73.16
      // Sum: R298.38, billed R298.38
      const bill = makeMinimalBill({
        waterTierCharges: [{
          parse_status: 'OK',
          serviceType: 'water',
          description: '(1) 6.0000 kl @ R 19.5900 (2) 4.0000 kl @ R 26.9200 (3) 2.0000 kl @ R 36.5800',
          amount: 298.38,
          hasVat: true,
        }],
      });

      const findings = runUniversalChecks(bill);
      const tierFindings = findings.filter(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      expect(tierFindings).toHaveLength(0);
    });

    it('correctly sums across multiple separate charges on same bill', () => {
      // Water charge 1: correct
      // Water charge 2: overcharged by R15
      const bill = makeMinimalBill({
        waterTierCharges: [
          {
            parse_status: 'OK',
            serviceType: 'water',
            description: '(1) 6.0000 kl @ R 21.1500',
            amount: 126.90, // correct
            hasVat: true,
          },
          {
            parse_status: 'OK',
            serviceType: 'water',
            description: '(1) 4.0000 kl @ R 21.1500 (2) 2.0000 kl @ R 29.0600',
            amount: 157.72, // should be 84.60 + 58.12 = 142.72, billed 157.72 (+R15)
            hasVat: true,
          },
        ],
      });

      const findings = runUniversalChecks(bill);
      const tierFindings = findings.filter(f => f.type === 'TIER_LINE_ARITHMETIC_MISMATCH');
      // First charge: 126.90 vs 126.90 → no finding
      // Second charge: 157.72 vs 142.72 → delta 15 → finding
      expect(tierFindings).toHaveLength(1);
      expect(tierFindings[0].expectedAmount).toBeCloseTo(142.72, 1);
    });
  });
});
