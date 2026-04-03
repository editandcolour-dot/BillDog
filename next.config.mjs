/** @type {import('next').NextConfig} */
const required = [
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'PAYFAST_MERCHANT_ID',
  'PAYFAST_MERCHANT_KEY',
  'PAYFAST_PASSPHRASE',
  'RESEND_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];



const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' *.supabase.co api.anthropic.com;" }
];

const nextConfig = {
  serverExternalPackages: ['pdf-parse'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default (phase) => {
  // Only validate during runtime, not during build
  if (phase !== 'phase-production-build' && process.env.NODE_ENV === 'production') {
    required.forEach(key => {
      if (!process.env[key]) {
        throw new Error(`Missing required env var: ${key}`);
      }
    });
  }

  return nextConfig;
};
