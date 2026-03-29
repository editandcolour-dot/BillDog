---
name: testing
description: Testing patterns for Billdog. ALL agents MUST read this before writing any feature code. Untested code is unfinished code.
---

# Testing — Billdog

> **Consumed by:** ALL agents — read before writing any feature code
> **Project:** Billdog — SA municipal billing dispute platform
> **Stack:** Vitest (unit/integration), Playwright (E2E)
> **Rule:** A feature is not complete until it has tests. Tests are part of the definition of done.

---

## PART 1: Testing Philosophy

### Definition of Done
A feature is **not complete** until it has tests. No exceptions. Shipping untested code is shipping broken code you haven't found yet.

### Test Behaviour, Not Implementation
```typescript
// ✅ GOOD — tests what the code does
it('returns prescribed status for electricity charge older than 3 years', () => {
  const result = checkPrescription('2022-01', 'electricity');
  expect(result.status).toBe('prescribed');
});

// ❌ BAD — tests how the code does it
it('calls monthsBetween with correct dates', () => {
  checkPrescription('2022-01', 'electricity');
  expect(monthsBetween).toHaveBeenCalledWith(new Date(2022, 0), expect.any(Date));
});
```

If you refactor internals and tests still pass → **good tests.**
If you refactor internals and tests break → **bad tests.** Rewrite them.

### What to Test ✅
| Category | Examples |
|---|---|
| Pure functions | `calculateFee()`, `cleanExtractedText()`, `checkPrescription()` |
| API route handlers | Auth checks, input validation, error responses |
| Data transformations | Claude JSON parsing, bill text cleaning |
| Business logic | Prescription checks, fee calculations, letter validation |
| Security checks | ITN signature validation, IP whitelisting, RLS queries |
| Error paths | Timeout handling, malformed input, missing data |

### What NOT to Test ❌
| Category | Why |
|---|---|
| Third-party library internals | Supabase, Resend, Anthropic SDK — they test their own code |
| Static UI with no logic | A `<div>` with some text doesn't need a test |
| Type definitions | TypeScript compiler handles this |
| `console.log` statements | Not behaviour |
| CSS/styling | Visual regression is separate from logic testing |

### Testing Pyramid
```
          ┌─────────┐
          │  E2E    │  ← Least: 3 critical user journeys
          │  tests  │
         ┌┴─────────┴┐
         │ Integration │  ← Middle: API routes, DB queries
         │   tests     │    with mocked externals
        ┌┴─────────────┴┐
        │   Unit tests    │  ← Most: pure functions,
        │                  │    utilities, transformations
        └──────────────────┘
```

---

## PART 2: Testing Stack

### Unit & Integration — Vitest

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### E2E — Playwright

```bash
npm install -D @playwright/test
npx playwright install  # installs browsers
```

### API Mocking — MSW (optional)

```bash
npm install -D msw
```

### Vitest Config
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'node_modules',
        '.next',
        'tests',
        '**/*.config.*',
        '**/*.d.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### Playwright Config
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
```

### package.json Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## PART 3: File & Folder Structure

### Test Files Live Next to Code
```
lib/
  claude/
    analyse-bill.ts
    analyse-bill.test.ts        ← unit/integration test
    generate-letter.ts
    generate-letter.test.ts
  payfast/
    validate.ts
    validate.test.ts
    charge.ts
    charge.test.ts
  prescription.ts
  prescription.test.ts

app/
  api/
    cases/
      route.ts
      route.test.ts
    webhooks/
      payfast/
        route.ts
        route.test.ts

tests/
  setup.ts                      ← global setup
  mocks/
    supabase.ts                 ← shared Supabase mock
    claude.ts                   ← shared Claude mock
    resend.ts                   ← shared Resend mock
  helpers/
    payfast-itn.ts              ← ITN test data factory
    mock-session.ts             ← session factory
  e2e/
    auth.spec.ts                ← E2E: auth flow
    upload-flow.spec.ts         ← E2E: core product
    case-tracking.spec.ts       ← E2E: dashboard
```

### Naming Convention

| Type | Pattern | Example |
|---|---|---|
| Unit/integration | `*.test.ts` / `*.test.tsx` | `validate.test.ts` |
| E2E | `*.spec.ts` | `auth.spec.ts` |

---

## PART 4: Mocking Strategy

### Global Test Setup
```typescript
// tests/setup.ts
import '@testing-library/jest-dom';

// Set required env vars for tests
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.RESEND_FROM_EMAIL = 'test@billdog.co.za';
process.env.PAYFAST_MERCHANT_ID = '10000100';
process.env.PAYFAST_MERCHANT_KEY = 'test-merchant-key';
process.env.PAYFAST_PASSPHRASE = 'test-passphrase';
process.env.PAYFAST_MODE = 'sandbox';
process.env.VOYAGE_API_KEY = 'test-voyage-key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Reset all mocks between tests
afterEach(() => {
  vi.restoreAllMocks();
});
```

### Supabase Mock
```typescript
// tests/mocks/supabase.ts
export function createMockSupabase(overrides: Partial<MockSupabase> = {}) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };

  return {
    from: vi.fn(() => chainable),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
    storage: {
      from: vi.fn(() => ({
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.url' }, error: null }),
      })),
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    _chainable: chainable,  // Expose for per-test overrides
  };
}

// Mock session factory
export const mockSession = {
  user: {
    id: 'test-user-id-123',
    email: 'test@example.com',
    aud: 'authenticated',
  },
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
};
```

### Claude API Mock
```typescript
// tests/mocks/claude.ts
export const mockAnalysisResult = {
  errors: [
    {
      line_item: 'Water (estimated reading)',
      amount_charged: 3420,
      expected_amount: 1200,
      issue: 'Estimated reading significantly exceeds historical average',
      legal_basis: 'Section 102, Municipal Systems Act',
      recoverable: true,
    },
  ],
  total_billed: 5420,
  total_recoverable: 2220,
  confidence: 'high' as const,
  bill_period: 'January 2026',
  municipality_detected: 'City of Cape Town',
  summary: 'One billing error found: estimated water reading.',
};

export function mockClaudeClient() {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockAnalysisResult) }],
        usage: { input_tokens: 500, output_tokens: 200 },
      }),
    },
  };
}
```

### Resend Mock
```typescript
// tests/mocks/resend.ts
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({
        data: { id: 'mock-resend-id-456' },
        error: null,
      }),
    },
  })),
}));
```

### PayFast ITN Test Helper
```typescript
// tests/helpers/payfast-itn.ts
import crypto from 'crypto';

export function createMockITN(
  overrides: Record<string, string> = {},
): Record<string, string> {
  const params: Record<string, string> = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID!,
    m_payment_id: 'test-case-id',
    payment_status: 'COMPLETE',
    amount_gross: '240.00',
    pf_payment_id: `pf-test-${Date.now()}`,
    token: 'test-token-abc',
    ...overrides,
  };

  // Generate valid MD5 signature
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${encodeURIComponent(params[key].trim())}`)
    .join('&');

  const withPassphrase = `${paramString}&passphrase=${encodeURIComponent(process.env.PAYFAST_PASSPHRASE!)}`;
  params.signature = crypto.createHash('md5').update(withPassphrase).digest('hex');

  return params;
}
```

---

## PART 5: What Must Be Tested

### API Routes — Every Route Needs These 4 Tests Minimum

```typescript
// app/api/cases/route.test.ts
describe('GET /api/cases', () => {
  it('returns cases for authenticated user', async () => {
    // Mock session + cases
    const response = await GET(mockRequest);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(2);
  });

  it('returns 401 when no session', async () => {
    // Mock no session
    const response = await GET(mockRequest);
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid input', async () => {
    // Mock bad request body
    const response = await POST(mockBadRequest);
    expect(response.status).toBe(400);
  });

  it('returns 500 with friendly message on DB error', async () => {
    // Mock Supabase error
    const response = await GET(mockRequest);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).not.toContain('PGRST'); // No internal errors exposed
  });
});
```

### Claude Integration

```typescript
// lib/claude/analyse-bill.test.ts
describe('analyseBill', () => {
  it('returns correct error JSON structure for valid bill', async () => {
    const result = await analyseBill(validBillText);
    expect(result.errors).toBeInstanceOf(Array);
    expect(result.confidence).toMatch(/^(high|medium|low)$/);
    expect(result.total_recoverable).toBeGreaterThanOrEqual(0);
  });

  it('handles empty bill text gracefully', async () => {
    await expect(analyseBill('')).rejects.toThrow();
  });

  it('strips markdown fences from Claude response', () => {
    const raw = '```json\n{"errors":[]}\n```';
    const parsed = parseClaudeJson(raw);
    expect(parsed).toEqual({ errors: [] });
  });

  it('throws on malformed Claude response', () => {
    expect(() => parseClaudeJson('not json at all')).toThrow();
  });
});
```

### PDF Parsing

```typescript
// lib/pdf/parse.test.ts
describe('parseBill', () => {
  it('extracts text from valid PDF buffer', async () => {
    const text = await parseBill(validPdfBuffer, 'application/pdf');
    expect(text.length).toBeGreaterThan(50);
  });

  it('cleans excess whitespace from extracted text', () => {
    const cleaned = cleanExtractedText('hello   \n\n\n  world');
    expect(cleaned).not.toMatch(/\s{3,}/);
  });

  it('throws handled error for corrupt PDF', async () => {
    const corrupt = Buffer.from('not a pdf');
    await expect(parseBill(corrupt, 'application/pdf'))
      .rejects.toThrow(/couldn't read/i);
  });
});
```

### PayFast Security

```typescript
// lib/payfast/validate.test.ts
describe('PayFast validation', () => {
  it('accepts valid ITN signature', () => {
    const itn = createMockITN();
    expect(validateSignature(itn, process.env.PAYFAST_PASSPHRASE!)).toBe(true);
  });

  it('rejects tampered ITN signature', () => {
    const itn = createMockITN();
    itn.amount_gross = '9999.00'; // Tampered amount
    expect(validateSignature(itn, process.env.PAYFAST_PASSPHRASE!)).toBe(false);
  });

  it('rejects non-PayFast IP addresses', () => {
    expect(validateIp('192.168.1.1')).toBe(false);
  });

  it('accepts PayFast production IPs', () => {
    expect(validateIp('41.74.179.194')).toBe(true);
  });

  it('ignores duplicate ITN by pf_payment_id', async () => {
    // First call processes, second call returns early
  });
});
```

### Prescription Checks

```typescript
// lib/prescription.test.ts
describe('checkPrescription', () => {
  it('returns normal for 2-year-old electricity charge', () => {
    const twoYearsAgo = formatPeriod(subtractMonths(new Date(), 24));
    expect(checkPrescription(twoYearsAgo, 'electricity').status).toBe('normal');
  });

  it('returns approaching for 34-month-old water charge', () => {
    const period = formatPeriod(subtractMonths(new Date(), 34));
    expect(checkPrescription(period, 'water').status).toBe('approaching');
  });

  it('returns prescribed for 4-year-old electricity charge', () => {
    const fourYearsAgo = formatPeriod(subtractMonths(new Date(), 48));
    expect(checkPrescription(fourYearsAgo, 'electricity').status).toBe('prescribed');
  });

  it('returns normal for 29-year-old rates charge', () => {
    const period = formatPeriod(subtractMonths(new Date(), 348));
    expect(checkPrescription(period, 'rates').status).toBe('normal');
  });

  it('returns prescribed for 31-year-old rates charge', () => {
    const period = formatPeriod(subtractMonths(new Date(), 372));
    expect(checkPrescription(period, 'rates').status).toBe('prescribed');
  });
});
```

---

## PART 6: E2E Tests — Critical Paths Only

Three E2E tests required before launch:

### 1. Auth Flow
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('signup → confirm → onboarding → dashboard', async ({ page }) => {
  await page.goto('/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');
  await expect(page.getByText('Check your email')).toBeVisible();

  // Simulate email confirmation (test helper or direct DB)
  // ...

  await page.goto('/app/onboarding');
  await page.fill('[name="fullName"]', 'Test User');
  await page.fill('[name="municipality"]', 'City of Cape Town');
  await page.fill('[name="accountNumber"]', '223740405');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/app\/upload/);
});
```

### 2. Core Product Flow
```typescript
// tests/e2e/upload-flow.spec.ts
test('upload bill → view analysis → view letter', async ({ page }) => {
  // Login as existing test user
  await loginAsTestUser(page);

  await page.goto('/app/upload');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/sample-bill.pdf');

  // Wait for analysis
  await expect(page.getByText(/errors found/i)).toBeVisible({ timeout: 60_000 });

  // View letter
  await page.click('text=View Dispute Letter');
  await expect(page.getByText(/Section 102/)).toBeVisible();
});
```

### 3. Case Tracking
```typescript
// tests/e2e/case-tracking.spec.ts
test('dashboard shows cases with status', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/app/dashboard');

  await expect(page.getByText(/City of Cape Town/)).toBeVisible();
  await page.click('text=City of Cape Town');

  // Case detail with timeline
  await expect(page.getByText(/Letter sent/)).toBeVisible();
});
```

**Rule:** E2E tests use a **dedicated test Supabase project**. Never run E2E against production.

---

## PART 7: Test Quality Rules

### Arrange-Act-Assert Pattern
```typescript
it('returns errors for estimated water reading', async () => {
  // ARRANGE — set up test data and mocks
  const billText = 'Water (estimated) R3,420.00\nElectricity R1,200.00';
  vi.mocked(claudeClient.messages.create).mockResolvedValueOnce(mockResponse);

  // ACT — call the function under test
  const result = await analyseBill(billText);

  // ASSERT — verify the outcome
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].line_item).toContain('Water');
  expect(result.errors[0].recoverable).toBe(true);
});
```

### Rules

| Rule | Why |
|---|---|
| One assertion **concept** per test | Easy to pinpoint failures |
| Descriptive test names | `'returns 401 when no session'` not `'auth test 1'` |
| No test interdependence | Each test must run in isolation, any order |
| No hardcoded `setTimeout` | Use `waitFor()`, `findBy`, or proper async patterns |
| Clean up after tests | Reset mocks, clear state between tests |
| No network calls in unit tests | Mock all externals — Supabase, Claude, Resend, PayFast |
| Test fixtures in `tests/fixtures/` | Sample PDFs, bill text, mock data |

---

## PART 8: CI Integration

### Run Tests on Every Push
```yaml
# In Railway build command or GitHub Actions
npm run test:ci
```

### Build Failure Conditions
- ❌ Any test fails → build fails
- ❌ Coverage below 70% (statements, branches, functions) → build fails
- ❌ E2E critical paths fail → deploy blocked

### package.json
```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "vitest run --coverage && playwright test"
  }
}
```

### Pre-Merge Checklist
- [ ] `npm run test:ci` passes with 70%+ coverage
- [ ] No skipped tests (`.skip` or `.todo`)
- [ ] New feature has corresponding tests
- [ ] Mock data is realistic (not `'foo'`, `'bar'`, `123`)
