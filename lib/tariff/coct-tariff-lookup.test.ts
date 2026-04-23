import { describe, it, expect } from 'vitest';
import {
  getCoctRatesForDate,
  getCoctHucForPeriod,
  getCoctRefuseForDate,
  getCoctFixedBasicForDate,
} from './coct-tariff-lookup';

// ════════════════════════════════════════════════════════════
// RATES — rates-in-the-rand
// ════════════════════════════════════════════════════════════
describe('getCoctRatesForDate', () => {
  // FY2022/23: 1 Jul 2022 – 30 Jun 2023 → 0.0063440
  it('FY2022/23 — mid-year DD/MM/YYYY', () => {
    expect(getCoctRatesForDate('15/01/2023')).toBe(0.0063440);
  });
  it('FY2022/23 — first day YYYY-MM-DD', () => {
    expect(getCoctRatesForDate('2022-07-01')).toBe(0.0063440);
  });
  it('FY2022/23 — last day', () => {
    expect(getCoctRatesForDate('30/06/2023')).toBe(0.0063440);
  });

  // FY2023/24: 1 Jul 2023 – 30 Jun 2024 → 0.0062730
  it('FY2023/24 — mid-year', () => {
    expect(getCoctRatesForDate('01/12/2023')).toBe(0.0062730);
  });
  it('FY2023/24 — July crossover (1 Jul 2023)', () => {
    expect(getCoctRatesForDate('01/07/2023')).toBe(0.0062730);
  });

  // FY2024/25: 1 Jul 2024 – 30 Jun 2025 → 0.0066310
  it('FY2024/25 — mid-year', () => {
    expect(getCoctRatesForDate('15/02/2025')).toBe(0.0066310);
  });
  it('FY2024/25 — July crossover (1 Jul 2024)', () => {
    expect(getCoctRatesForDate('2024-07-01')).toBe(0.0066310);
  });
  it('FY2024/25 — last day (30 Jun 2025)', () => {
    expect(getCoctRatesForDate('30/06/2025')).toBe(0.0066310);
  });

  // FY2025/26: 1 Jul 2025 – 30 Jun 2026 → 0.0071590
  it('FY2025/26 — mid-year', () => {
    expect(getCoctRatesForDate('15/11/2025')).toBe(0.0071590);
  });
  it('FY2025/26 — July crossover (1 Jul 2025)', () => {
    expect(getCoctRatesForDate('01/07/2025')).toBe(0.0071590);
  });

  // June 30 → previous FY, July 1 → current FY
  it('crossover boundary: Jun 30 2024 is FY2023/24', () => {
    expect(getCoctRatesForDate('30/06/2024')).toBe(0.0062730);
  });
  it('crossover boundary: Jul 1 2024 is FY2024/25', () => {
    expect(getCoctRatesForDate('01/07/2024')).toBe(0.0066310);
  });

  // Unknown future period
  it('future unknown period returns undefined', () => {
    expect(getCoctRatesForDate('01/07/2030')).toBeUndefined();
  });

  // Invalid input
  it('garbage input returns undefined', () => {
    expect(getCoctRatesForDate('not-a-date')).toBeUndefined();
    expect(getCoctRatesForDate('')).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════
// HUC — Electricity Home User Charge
// ════════════════════════════════════════════════════════════
describe('getCoctHucForPeriod', () => {
  // FY2022/23: 05.2023 – 06.2023 → 185.00
  it('FY2022/23 — May 2023 (MM.YYYY)', () => {
    expect(getCoctHucForPeriod('05.2023')).toBe(185.00);
  });
  it('FY2022/23 — June 2023', () => {
    expect(getCoctHucForPeriod('06.2023')).toBe(185.00);
  });

  // FY2023/24: 07.2023 – 06.2024 → 219.21
  it('FY2023/24 — July crossover (07.2023)', () => {
    expect(getCoctHucForPeriod('07.2023')).toBe(219.21);
  });
  it('FY2023/24 — mid-year', () => {
    expect(getCoctHucForPeriod('01.2024')).toBe(219.21);
  });
  it('FY2023/24 — June 2024', () => {
    expect(getCoctHucForPeriod('06.2024')).toBe(219.21);
  });

  // FY2024/25: 07.2024 – 06.2025 → 245.03
  it('FY2024/25 — July 2024', () => {
    expect(getCoctHucForPeriod('07.2024')).toBe(245.03);
  });
  it('FY2024/25 — mid-year', () => {
    expect(getCoctHucForPeriod('12.2024')).toBe(245.03);
  });

  // FY2025/26: 07.2025 – 06.2026 → 339.89
  it('FY2025/26 — July 2025', () => {
    expect(getCoctHucForPeriod('07.2025')).toBe(339.89);
  });
  it('FY2025/26 — March 2026', () => {
    expect(getCoctHucForPeriod('03.2026')).toBe(339.89);
  });

  // Crossover boundary
  it('crossover: 06.2024 is FY2023/24', () => {
    expect(getCoctHucForPeriod('06.2024')).toBe(219.21);
  });
  it('crossover: 07.2024 is FY2024/25', () => {
    expect(getCoctHucForPeriod('07.2024')).toBe(245.03);
  });

  // Also accepts DD/MM/YYYY
  it('accepts DD/MM/YYYY format', () => {
    expect(getCoctHucForPeriod('15/09/2024')).toBe(245.03);
  });

  // Unknown
  it('future unknown period returns undefined', () => {
    expect(getCoctHucForPeriod('07.2030')).toBeUndefined();
  });
  it('garbage returns undefined', () => {
    expect(getCoctHucForPeriod('')).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════
// REFUSE — 240L bin monthly charge
// ════════════════════════════════════════════════════════════
describe('getCoctRefuseForDate', () => {
  // FY2022/23 → 149.13
  it('FY2022/23 — DD/MM/YYYY', () => {
    expect(getCoctRefuseForDate('15/01/2023')).toBe(149.13);
  });
  it('FY2022/23 — YYYY-MM-DD', () => {
    expect(getCoctRefuseForDate('2022-10-15')).toBe(149.13);
  });

  // FY2023/24 → 157.30
  it('FY2023/24 — mid-year', () => {
    expect(getCoctRefuseForDate('15/12/2023')).toBe(157.30);
  });

  // FY2024/25 → 166.26
  it('FY2024/25 — mid-year', () => {
    expect(getCoctRefuseForDate('15/02/2025')).toBe(166.26);
  });

  // FY2025/26 → 178.52
  it('FY2025/26 — mid-year', () => {
    expect(getCoctRefuseForDate('15/11/2025')).toBe(178.52);
  });

  // Crossover
  it('crossover: Jun 30 2024 is FY2023/24', () => {
    expect(getCoctRefuseForDate('30/06/2024')).toBe(157.30);
  });
  it('crossover: Jul 1 2024 is FY2024/25', () => {
    expect(getCoctRefuseForDate('01/07/2024')).toBe(166.26);
  });

  // MM.YYYY format
  it('accepts MM.YYYY format', () => {
    expect(getCoctRefuseForDate('09.2024')).toBe(166.26);
  });

  // Unknown
  it('future unknown returns undefined', () => {
    expect(getCoctRefuseForDate('01/07/2030')).toBeUndefined();
  });
  it('garbage returns undefined', () => {
    expect(getCoctRefuseForDate('')).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════
// WATER FIXED BASIC — 20mm meter (pre-July 2025) &
//                       property band (from July 2025)
// ════════════════════════════════════════════════════════════
describe('getCoctFixedBasicForDate', () => {
  // FY2022/23 20mm → 116.86
  it('FY2022/23 — 20mm', () => {
    expect(getCoctFixedBasicForDate('15/01/2023', '20mm')).toBe(116.86);
  });

  // FY2023/24 20mm → 126.91
  it('FY2023/24 — 20mm DD/MM/YYYY', () => {
    expect(getCoctFixedBasicForDate('15/12/2023', '20mm')).toBe(126.91);
  });
  it('FY2023/24 — 20mm YYYY-MM-DD', () => {
    expect(getCoctFixedBasicForDate('2023-10-15', '20mm')).toBe(126.91);
  });

  // FY2024/25 20mm → 135.54
  it('FY2024/25 — 20mm', () => {
    expect(getCoctFixedBasicForDate('15/02/2025', '20mm')).toBe(135.54);
  });

  // FY2025/26: NO 20mm entry — returns undefined
  it('FY2025/26 — 20mm returns undefined (meter-size charges removed)', () => {
    expect(getCoctFixedBasicForDate('15/10/2025', '20mm')).toBeUndefined();
  });

  // FY2025/26: Property band R4,500,001–R5,000,000 → 214.89
  it('FY2025/26 — property band R4500001-R5000000', () => {
    expect(getCoctFixedBasicForDate('15/10/2025', 'R4500001-R5000000')).toBe(214.89);
  });
  it('FY2025/26 — property band with spaces', () => {
    expect(getCoctFixedBasicForDate('01/07/2025', 'R4 500 001 - R5 000 000')).toBe(214.89);
  });

  // Property band requested for a pre-July 2025 date → undefined (didn't exist)
  it('pre-July 2025 — property band returns undefined', () => {
    expect(getCoctFixedBasicForDate('15/03/2025', 'R4500001-R5000000')).toBeUndefined();
  });

  // Crossover 20mm
  it('crossover: Jun 30 2024 (FY2023/24) → 126.91', () => {
    expect(getCoctFixedBasicForDate('30/06/2024', '20mm')).toBe(126.91);
  });
  it('crossover: Jul 1 2024 (FY2024/25) → 135.54', () => {
    expect(getCoctFixedBasicForDate('01/07/2024', '20mm')).toBe(135.54);
  });

  // MM.YYYY
  it('accepts MM.YYYY format', () => {
    expect(getCoctFixedBasicForDate('09.2024', '20mm')).toBe(135.54);
  });

  // Unknown
  it('future unknown returns undefined', () => {
    expect(getCoctFixedBasicForDate('01/07/2030', '20mm')).toBeUndefined();
  });
  it('garbage returns undefined', () => {
    expect(getCoctFixedBasicForDate('', '20mm')).toBeUndefined();
  });
});
