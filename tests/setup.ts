/**
 * Global test setup — runs before all tests.
 * Sets test env vars and resets mocks between tests.
 */

// Required env vars (test values — never real credentials)
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
