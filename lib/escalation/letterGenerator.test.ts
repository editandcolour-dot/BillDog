import { describe, it, expect } from 'vitest';
import { generateLetter, EscalationLetterInput } from './letterGenerator';
import type { BillingError } from '@/types/analysis';

/**
 * Regression: step-3 (Public Protector) escalation must cc NERSA for electricity
 * disputes. Findings are persisted BillingError objects keyed by `finding_type`; an
 * earlier bug read `f.type` (always undefined on a BillingError), so NERSA was never
 * cc'd. These tests pin the finding_type-based routing.
 */
function makeInput(findingType: string): EscalationLetterInput {
  const finding: BillingError = {
    line_item: 'Electricity HU Charge',
    amount_charged: 245.03,
    expected_amount: 205.03,
    issue: 'HU charge exceeds approved amount',
    legal_basis: 'Electricity Regulation Act s4(e)',
    recoverable: true,
    service_type: 'electricity',
    finding_type: findingType,
  };
  return {
    step: 3,
    caseId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    accountNumber: 'ACC-123',
    propertyAddress: '12 Main Road, Cape Town',
    municipalityName: 'City of Cape Town',
    municipalityCode: 'CoCT',
    findings: [finding],
    priorLetters: [],
    verification: {
      fullName: 'Jane Tester',
      idNumber: '8001015009087',
      accountNumber: 'ACC-123',
      propertyAddress: '12 Main Road, Cape Town',
      municipalityName: 'City of Cape Town',
      caseId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      mandateConsentAt: '2026-04-30T10:15:00.000Z',
    },
  };
}

describe('generateLetter — step 3 NERSA cc (finding_type routing)', () => {
  it("cc's NERSA when an electricity finding (HUC_AMOUNT_WRONG) is present", () => {
    const letter = generateLetter(makeInput('HUC_AMOUNT_WRONG'));
    expect(letter.ccEmails).toContain('complaints@nersa.org.za');
    expect(letter.body).toContain('electricity tariff violations');
  });

  it('does NOT cc NERSA for a non-electricity finding', () => {
    const letter = generateLetter(makeInput('RATES_CALC_ERROR'));
    expect(letter.ccEmails).not.toContain('complaints@nersa.org.za');
    expect(letter.body).not.toContain('electricity tariff violations');
  });
});
