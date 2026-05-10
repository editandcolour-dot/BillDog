import { describe, it, expect } from 'vitest';
import { detectRecoveries, type Finding, type CreditLineItem } from '@/lib/recovery/detect';
import { RECOVERY_FEE_PERCENTAGE, RECOVERY_MINIMUM_ZAR } from '@/lib/constants/fees';

describe('Recovery Detection', () => {
  const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
    id: 'f1',
    type: 'WATER_TARIFF_OVERCHARGE',
    service_type: 'water',
    overchargeZar: 500,
    amount_charged: 1000,
    expected_amount: 500,
    line_item: 'Water Usage',
    ...overrides,
  });

  const makeCredit = (overrides: Partial<CreditLineItem> = {}): CreditLineItem => ({
    description: 'Water credit adjustment',
    amount: -500,
    service_type: 'water',
    ...overrides,
  });

  it('matches a credit to a finding by service type and amount', () => {
    const result = detectRecoveries(
      [makeCredit()],
      [makeFinding()],
    );

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].findingId).toBe('f1');
    expect(result.matches[0].recoveredAmount).toBe(500);
    expect(result.matches[0].feeAmount).toBeCloseTo(500 * RECOVERY_FEE_PERCENTAGE);
  });

  it('rejects credits outside 30% tolerance', () => {
    const result = detectRecoveries(
      [makeCredit({ amount: -100 })], // 100 vs 500 = 80% off
      [makeFinding()],
    );

    expect(result.matches).toHaveLength(0);
  });

  it('accepts credits within 30% tolerance', () => {
    const result = detectRecoveries(
      [makeCredit({ amount: -450 })], // 450 vs 500 = 10% off
      [makeFinding()],
    );

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].recoveredAmount).toBe(450); // Conservative: min(credit, overcharge)
  });

  it('meets threshold when recovered >= R200', () => {
    const result = detectRecoveries(
      [makeCredit({ amount: -250 })],
      [makeFinding({ overchargeZar: 250 })],
    );

    expect(result.meetsThreshold).toBe(true);
    expect(result.totalRecovered).toBe(250);
  });

  it('does NOT meet threshold when recovered < R200', () => {
    const result = detectRecoveries(
      [makeCredit({ amount: -150 })],
      [makeFinding({ overchargeZar: 150 })],
    );

    expect(result.meetsThreshold).toBe(false);
    expect(result.totalRecovered).toBe(150);
  });

  it('matches multiple credits to multiple findings', () => {
    const result = detectRecoveries(
      [
        makeCredit({ description: 'Water refund', amount: -300, service_type: 'water' }),
        makeCredit({ description: 'Electricity credit', amount: -200, service_type: 'electricity' }),
      ],
      [
        makeFinding({ id: 'f1', service_type: 'water', overchargeZar: 300 }),
        makeFinding({ id: 'f2', service_type: 'electricity', overchargeZar: 200 }),
      ],
    );

    expect(result.matches).toHaveLength(2);
    expect(result.totalRecovered).toBe(500);
    expect(result.totalFee).toBeCloseTo(500 * RECOVERY_FEE_PERCENTAGE);
  });

  it('does not double-match a finding', () => {
    const result = detectRecoveries(
      [
        makeCredit({ description: 'Water credit 1', amount: -500 }),
        makeCredit({ description: 'Water credit 2', amount: -500 }),
      ],
      [makeFinding()],
    );

    expect(result.matches).toHaveLength(1); // Only one finding to match
  });

  it('skips trivial credit amounts', () => {
    const result = detectRecoveries(
      [makeCredit({ amount: -0.50 })],
      [makeFinding({ overchargeZar: 0.50 })],
    );

    expect(result.matches).toHaveLength(0);
  });

  it('uses RECOVERY_MINIMUM_ZAR from canonical constant', () => {
    expect(RECOVERY_MINIMUM_ZAR).toBe(200);
  });
});
