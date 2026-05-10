import { describe, it, expect } from 'vitest';
import { RECOVERY_FEE_PERCENTAGE, RECOVERY_FEE_DISPLAY, RECOVERY_MINIMUM_ZAR, MINIMUM_CHARGE_ZAR } from '@/lib/constants/fees';

describe('Fee Constants', () => {
  it('RECOVERY_FEE_PERCENTAGE is 0.15 (15%)', () => {
    expect(RECOVERY_FEE_PERCENTAGE).toBe(0.15);
  });

  it('RECOVERY_FEE_DISPLAY is "15%"', () => {
    expect(RECOVERY_FEE_DISPLAY).toBe('15%');
  });

  it('RECOVERY_MINIMUM_ZAR is 200', () => {
    expect(RECOVERY_MINIMUM_ZAR).toBe(200);
  });

  it('MINIMUM_CHARGE_ZAR is 50', () => {
    expect(MINIMUM_CHARGE_ZAR).toBe(50);
  });

  it('fee display matches the decimal constant', () => {
    const pctFromDecimal = `${RECOVERY_FEE_PERCENTAGE * 100}%`;
    expect(pctFromDecimal).toBe(RECOVERY_FEE_DISPLAY);
  });
});
