import { describe, it, expect } from 'vitest';

/**
 * Unit test for the corpus test runner's finding matcher logic.
 * Tests the (type, overchargeZar) tuple matching extracted from corpus-test-runner.ts.
 */

interface MockBillingError {
  overchargeZar: number;
  finding_type?: string;
}

interface MockExpectedFinding {
  error_type: string;
  type?: string;
  expected_recoverable: number;
}

/**
 * Extracted matcher logic from corpus-test-runner.ts lines 119-131.
 * Returns array of unmatched Billdog errors after consuming matches.
 */
function matchFindings(
  billdogErrors: MockBillingError[],
  expectedFindings: MockExpectedFinding[]
): { matched: number; unmatched: MockBillingError[] } {
  const unmatchedBilldogErrors = [...billdogErrors];
  let matched = 0;

  for (const expected of expectedFindings) {
    const matchIndex = unmatchedBilldogErrors.findIndex(e => {
      const bdogRecoverable = e.overchargeZar || 0;
      const amountMatch = Math.abs(bdogRecoverable - (expected.expected_recoverable || 0)) <= 1.0;
      if (!amountMatch) return false;
      if (expected.type && e.finding_type) {
        return expected.type === e.finding_type;
      }
      return true;
    });

    if (matchIndex !== -1) {
      unmatchedBilldogErrors.splice(matchIndex, 1);
      matched++;
    }
  }

  return { matched, unmatched: unmatchedBilldogErrors };
}

describe('Corpus matcher — (type, overchargeZar) tuple matching', () => {
  it('matches two findings with same overchargeZar but different types correctly', () => {
    const billdogErrors: MockBillingError[] = [
      { overchargeZar: 0, finding_type: 'UNKNOWN_TARIFF' },
      { overchargeZar: 0, finding_type: 'WATER_TARIFF_UNDERCHARGE' },
    ];

    const expectedFindings: MockExpectedFinding[] = [
      { error_type: 'UNKNOWN_TARIFF', type: 'UNKNOWN_TARIFF', expected_recoverable: 0 },
      { error_type: 'WATER_TARIFF_UNDERCHARGE', type: 'WATER_TARIFF_UNDERCHARGE', expected_recoverable: 0 },
    ];

    const result = matchFindings(billdogErrors, expectedFindings);
    expect(result.matched).toBe(2);
    expect(result.unmatched).toHaveLength(0);
  });

  it('matches correctly regardless of order in Billdog output', () => {
    // Billdog output in reversed order
    const billdogErrors: MockBillingError[] = [
      { overchargeZar: 0, finding_type: 'WATER_TARIFF_UNDERCHARGE' },
      { overchargeZar: 0, finding_type: 'UNKNOWN_TARIFF' },
    ];

    const expectedFindings: MockExpectedFinding[] = [
      { error_type: 'UNKNOWN_TARIFF', type: 'UNKNOWN_TARIFF', expected_recoverable: 0 },
      { error_type: 'WATER_TARIFF_UNDERCHARGE', type: 'WATER_TARIFF_UNDERCHARGE', expected_recoverable: 0 },
    ];

    const result = matchFindings(billdogErrors, expectedFindings);
    expect(result.matched).toBe(2);
    expect(result.unmatched).toHaveLength(0);
  });

  it('leaves unmatched findings when type differs despite same overchargeZar', () => {
    const billdogErrors: MockBillingError[] = [
      { overchargeZar: 0, finding_type: 'UNKNOWN_TARIFF' },
      { overchargeZar: 0, finding_type: 'WATER_TARIFF_UNDERCHARGE' },
    ];

    // Only one expected — should match UNKNOWN_TARIFF, leave WATER_TARIFF_UNDERCHARGE unmatched
    const expectedFindings: MockExpectedFinding[] = [
      { error_type: 'UNKNOWN_TARIFF', type: 'UNKNOWN_TARIFF', expected_recoverable: 0 },
    ];

    const result = matchFindings(billdogErrors, expectedFindings);
    expect(result.matched).toBe(1);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0].finding_type).toBe('WATER_TARIFF_UNDERCHARGE');
  });

  it('falls back to amount-only match when type is not specified', () => {
    const billdogErrors: MockBillingError[] = [
      { overchargeZar: 82.89, finding_type: 'UNKNOWN_RATE_APPLIED' },
    ];

    // No type specified — should match on overchargeZar alone
    const expectedFindings: MockExpectedFinding[] = [
      { error_type: 'UNKNOWN_RATE_APPLIED', expected_recoverable: 82.89 },
    ];

    const result = matchFindings(billdogErrors, expectedFindings);
    expect(result.matched).toBe(1);
    expect(result.unmatched).toHaveLength(0);
  });

  it('handles the T1-E16 scenario: 6 findings, 6 expected, all match', () => {
    const billdogErrors: MockBillingError[] = [
      { overchargeZar: 82.89, finding_type: 'UNKNOWN_RATE_APPLIED' },
      { overchargeZar: 138.73, finding_type: 'UNKNOWN_RATE_APPLIED' },
      { overchargeZar: 109.09, finding_type: 'HUC_AMOUNT_WRONG' },
      { overchargeZar: 0, finding_type: 'UNKNOWN_TARIFF' },
      { overchargeZar: 14.1, finding_type: 'UNKNOWN_RATE_APPLIED' },
      { overchargeZar: 0, finding_type: 'WATER_TARIFF_UNDERCHARGE' },
    ];

    const expectedFindings: MockExpectedFinding[] = [
      { error_type: 'UNKNOWN_RATE_APPLIED', type: 'UNKNOWN_RATE_APPLIED', expected_recoverable: 82.89 },
      { error_type: 'UNKNOWN_RATE_APPLIED', type: 'UNKNOWN_RATE_APPLIED', expected_recoverable: 138.73 },
      { error_type: 'HUC_AMOUNT_WRONG', type: 'HUC_AMOUNT_WRONG', expected_recoverable: 109.09 },
      { error_type: 'UNKNOWN_RATE_APPLIED', type: 'UNKNOWN_RATE_APPLIED', expected_recoverable: 14.1 },
      { error_type: 'WATER_TARIFF_UNDERCHARGE', type: 'WATER_TARIFF_UNDERCHARGE', expected_recoverable: 0 },
      { error_type: 'UNKNOWN_TARIFF', type: 'UNKNOWN_TARIFF', expected_recoverable: 0 },
    ];

    const result = matchFindings(billdogErrors, expectedFindings);
    expect(result.matched).toBe(6);
    expect(result.unmatched).toHaveLength(0);
  });
});
