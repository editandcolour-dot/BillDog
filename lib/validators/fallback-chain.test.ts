import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyRatesCharge } from '../tariff/verifiers/ratesCharge';
import { verifyWaterFixedCharge } from '../tariff/verifiers/waterFixedCharge';
import { verifyElectricityHUCharge } from '../tariff/verifiers/electricityHUCharge';
import { verifyRefuseCharge } from '../tariff/verifiers/refuseCharge';

// Mock the resolver
vi.mock('../tariff/tariff-resolver', () => ({
  resolveTariff: vi.fn().mockResolvedValue({ result: 'SKIP' }),
}));

describe('Fallback Chain Wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property Rates', () => {
    it('returns PASS or FAIL using hardcoded table when resolver SKIPs and rate is known', async () => {
      // 01/07/2024 is in FY2024/25, known rate is 0.0066310
      const result = await verifyRatesCharge(0.0066310, '01/07/2024', 'CoCT');
      expect(result.result).toBe('PASS');
      expect(result.approved_rate).toBe(0.0066310);
    });

    it('returns SKIP (leading to UNKNOWN_TARIFF) when resolver SKIPs and hardcoded has no entry', async () => {
      // 2050 dates won't be in the hardcoded table mapping
      const result = await verifyRatesCharge(0.0066310, '01/07/2050', 'CoCT');
      expect(result.result).toBe('SKIP');
    });
  });

  describe('Water Fixed', () => {
    it('returns PASS or FAIL using hardcoded when resolver SKIPs', async () => {
      // FY24 water basic 20mm
      const result = await verifyWaterFixedCharge(135.54, '20mm', '01/07/2024', 'CoCT');
      expect(result.result).toBe('PASS');
    });

    it('returns SKIP when both resolver and hardcoded miss', async () => {
      const result = await verifyWaterFixedCharge(135.54, '20mm', '01/07/2050', 'CoCT');
      expect(result.result).toBe('SKIP');
    });
  });

  describe('Electricity HUC', () => {
    it('returns PASS or FAIL using hardcoded when resolver SKIPs', async () => {
      // FY24 HUC
      const result = await verifyElectricityHUCharge(245.03, '07.2024', 'CoCT');
      expect(result.result).toBe('PASS');
    });

    it('returns SKIP when both resolver and hardcoded miss', async () => {
      const result = await verifyElectricityHUCharge(245.03, '07.1990', 'CoCT');
      expect(result.result).toBe('SKIP');
    });
  });

  describe('Refuse Charge', () => {
    it('returns PASS or FAIL using hardcoded when resolver SKIPs', async () => {
      const result = await verifyRefuseCharge(166.26, '15/07/2024', 'CoCT');
      expect(result.result).toBe('PASS');
    });

    it('returns SKIP when both resolver and hardcoded miss', async () => {
      const result = await verifyRefuseCharge(166.26, '15/07/2050', 'CoCT');
      expect(result.result).toBe('SKIP');
    });
  });
});
