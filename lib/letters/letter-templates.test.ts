/**
 * Letter Template Snapshot Tests — MANDATORY per user constraints.
 *
 * 3 required snapshots:
 * 1. Single-error CoCT letter
 * 2. Multi-error CoCT letter
 * 3. Section 62 appeal letter
 */

import { describe, it, expect } from 'vitest';
import { buildSection102Letter } from './section-102-template';
import { buildSection62AppealLetter } from './section-62-appeal-template';
import { buildSection50Notice } from './section-50-template';
import type { BillingError } from '@/types/analysis';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeError(overrides: Partial<BillingError> = {}): BillingError {
  return {
    line_item: 'Water Tier 1 (0-6kl)',
    service_type: 'water',
    amount_charged: 120.50,
    expected_amount: 95.20,
    overchargeZar: 25.30,
    issue: 'Tier 1 unit rate applied at R12.05/kl instead of gazetted rate R9.52/kl',
    legal_basis: 'CoCT 2024/25 Approved Tariff Schedule, Water Tier 1',
    recoverable: true,
    finding_type: 'TARIFF_RATE_ERROR',
    reading_type: 'actual',
    dispute_channel: 'section_102_billing',
    charge_type: 'water',
    within_prescription: true,
    ...overrides,
  };
}

const SINGLE_ERROR_INPUT = {
  accountHolder: 'John Doe',
  idNumber: '8501015800088',
  accountNumber: '20123456789',
  propertyAddress: '42 Main Road, Rondebosch, 7700',
  municipalityName: 'City of Cape Town',
  billPeriod: 'March 2025',
  billingDate: '15/03/2025',
  totalBilled: 3450.00,
  summaryParagraph: 'The bill for March 2025 contains a water tariff overcharge where the incorrect unit rate was applied to Tier 1 consumption.',
  errors: [makeError()],
  bylawCitation: 'Item 7 of the City of Cape Town Credit Control and Debt Collection Policy',
};

const MULTI_ERROR_INPUT = {
  accountHolder: 'Jane Smith',
  idNumber: '9001015800099',
  accountNumber: '30987654321',
  propertyAddress: '15 Beach Road, Sea Point, 8005',
  municipalityName: 'City of Cape Town',
  billPeriod: 'February 2025',
  billingDate: '15/02/2025',
  totalBilled: 5200.00,
  summaryParagraph: 'The February 2025 bill contains multiple errors across water and refuse services.',
  errors: [
    makeError({
      line_item: 'Water Tier 2 (6-10.5kl)',
      amount_charged: 250.00,
      expected_amount: 180.00,
      overchargeZar: 70.00,
      issue: 'Tier 2 rate incorrect',
    }),
    makeError({
      line_item: 'Refuse Removal',
      service_type: 'refuse',
      amount_charged: 450.00,
      expected_amount: 380.00,
      overchargeZar: 70.00,
      charge_type: 'refuse',
      issue: 'Refuse tariff incorrect for property category',
    }),
    makeError({
      line_item: 'Estimated Water Consumption',
      service_type: 'water',
      amount_charged: 600.00,
      expected_amount: 200.00,
      overchargeZar: 400.00,
      reading_type: 'estimated',
      issue: 'Estimated reading is 3x actual historical average',
      recoverable: false,
    }),
  ],
  bylawCitation: 'Item 7 of the City of Cape Town Credit Control and Debt Collection Policy',
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Letter Template Snapshot Tests', () => {
  describe('Section 102 — Single Error CoCT', () => {
    it('produces deterministic output with all required elements', () => {
      const letter = buildSection102Letter(SINGLE_ERROR_INPUT);

      // Must contain exact Rand amounts
      expect(letter).toContain('R120.50');
      expect(letter).toContain('R95.20');
      expect(letter).toContain('R25.30');

      // Must contain all 4 legal citations
      expect(letter).toContain('Section 102(1)(a)');
      expect(letter).toContain('Mkontwana v Nelson Mandela Metropolitan Municipality');
      expect(letter).toContain('Tarica v City of Johannesburg');
      expect(letter).toContain('Glofurn');

      // Must contain account details
      expect(letter).toContain('20123456789');
      expect(letter).toContain('42 Main Road, Rondebosch');

      // Must contain bylaw citation
      expect(letter).toContain('Item 7 of the City of Cape Town Credit Control');

      // Must contain undisputed warning
      expect(letter).toContain('continue paying the undisputed portion');

      // Must contain Section 62 deadline warning
      expect(letter).toContain('30 calendar days');

      // Snapshot
      expect(letter).toMatchSnapshot();
    });
  });

  describe('Section 102 — Multi Error CoCT', () => {
    it('produces table with all recoverable errors', () => {
      const letter = buildSection102Letter(MULTI_ERROR_INPUT);

      // Recoverable errors in table (2 of 3 — estimated reading is non-recoverable)
      expect(letter).toContain('Water Tier 2');
      expect(letter).toContain('Refuse Removal');

      // Total overcharge = 70 + 70 = 140
      expect(letter).toContain('R140.00');

      // Non-recoverable in separate section
      expect(letter).toContain('ADDITIONAL OBSERVATIONS');
      expect(letter).toContain('Estimated reading is 3x actual historical average');

      // Reading type in table
      expect(letter).toContain('actual');

      // Snapshot
      expect(letter).toMatchSnapshot();
    });
  });

  describe('Section 62 Appeal', () => {
    it('produces appeal letter with original errors reproduced', () => {
      const letter = buildSection62AppealLetter({
        accountHolder: 'John Doe',
        idNumber: '8501015800088',
        accountNumber: '20123456789',
        propertyAddress: '42 Main Road, Rondebosch, 7700',
        municipalityName: 'City of Cape Town',
        billPeriod: 'March 2025',
        originalReferenceNumber: 'CoCT-2025-03-00123',
        originalDisputeDate: '20/03/2025',
        rejectionDate: '10/04/2025',
        rejectionReason: 'The account has been verified and found to be correct.',
        appealRecipient: 'The Municipal Manager, City of Cape Town',
        errors: [makeError()],
        rebuttalParagraph: 'The municipality has failed to address the specific tariff discrepancy identified. The gazetted rate for Tier 1 water is R9.52/kl, but the bill applies R12.05/kl.',
      });

      // Must reference Section 62
      expect(letter).toContain('Section 62');
      expect(letter).toContain('Section 62(1)');

      // Must reference original dispute
      expect(letter).toContain('CoCT-2025-03-00123');
      expect(letter).toContain('20/03/2025');

      // Must reproduce error table
      expect(letter).toContain('R120.50');
      expect(letter).toContain('R95.20');

      // Must contain rebuttal
      expect(letter).toContain('R9.52/kl');
      expect(letter).toContain('R12.05/kl');

      // Must contain legal citations
      expect(letter).toContain('Mkontwana');
      expect(letter).toContain('Tarica');

      // Snapshot
      expect(letter).toMatchSnapshot();
    });
  });

  describe('Section 50 Notice', () => {
    it('produces informational notice for valuation disputes', () => {
      const notice = buildSection50Notice({
        accountHolder: 'John Doe',
        accountNumber: '20123456789',
        propertyAddress: '42 Main Road, Rondebosch, 7700',
        municipalityName: 'City of Cape Town',
        billPeriod: 'March 2025',
        valuationErrors: [
          makeError({
            line_item: 'Property Rates',
            service_type: 'rates',
            issue: 'Property valuation appears incorrect — zoning mismatch',
            dispute_channel: 'section_50_valuation',
          }),
        ],
      });

      // Must reference Section 50
      expect(notice).toContain('Section 50');
      expect(notice).toContain('SACPVP');
      expect(notice).toContain('Valuation Roll');

      // Must explain what Billdog cannot do
      expect(notice).toContain('property valuation disputes require a professional property valuer');

      // Snapshot
      expect(notice).toMatchSnapshot();
    });
  });
});
