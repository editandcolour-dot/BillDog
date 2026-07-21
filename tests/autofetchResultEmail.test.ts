import { describe, it, expect } from 'vitest';
import { buildAutofetchResultEmail } from '@/lib/resend/autofetch-result';

const base = {
  userName: 'Jason',
  municipalityName: 'City of Cape Town',
  billPeriod: '01/06/2026 to 30/06/2026',
  caseUrl: 'https://billdog.co.za/case/abc-123',
};

describe('buildAutofetchResultEmail', () => {
  it('leads the subject with the recoverable amount when errors were found', () => {
    const { subject } = buildAutofetchResultEmail({
      ...base,
      totalRecoverable: 342.5,
      findings: [{ title: 'Water consumption', issue: 'Tier 2 rate overcharge', amount: 342.5 }],
    });
    expect(subject).toBe('New City of Cape Town bill: R342.50 in billing errors found');
  });

  it('body carries the audit outcome: finding titles, amounts, issue text, period, case link', () => {
    const { html } = buildAutofetchResultEmail({
      ...base,
      totalRecoverable: 342.5,
      findings: [{ title: 'Water consumption', issue: 'Tier 2 rate overcharge', amount: 342.5 }],
    });
    expect(html).toContain('Water consumption');
    expect(html).toContain('R342.50');
    expect(html).toContain('Tier 2 rate overcharge');
    expect(html).toContain('01/06/2026 to 30/06/2026');
    expect(html).toContain('https://billdog.co.za/case/abc-123');
  });

  it('announces a clean bill explicitly when no errors were found', () => {
    const { subject, html } = buildAutofetchResultEmail({
      ...base,
      totalRecoverable: 0,
      findings: [],
    });
    expect(subject).toBe('New City of Cape Town bill: no billing errors found');
    expect(html.toLowerCase()).toContain('no billing errors');
    expect(html).toContain('https://billdog.co.za/case/abc-123');
  });

  it('tolerates a missing bill period without leaking "null" into the html', () => {
    const { html } = buildAutofetchResultEmail({
      ...base,
      billPeriod: null,
      totalRecoverable: 0,
      findings: [],
    });
    expect(html).not.toContain('null');
  });
});
