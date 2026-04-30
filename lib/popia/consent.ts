/**
 * Versioned consent text. Bump version on any wording change — never edit in place.
 * The version string is stored on profiles.* alongside the timestamp.
 */

export const POPIA_CONSENT_V1 = {
  version: 'v1',
  text: `I consent to Billdog processing my personal information — including my ID, municipal account details, and bill documents — to identify and dispute billing errors. My data may be shared with Anthropic (AI analysis), Supabase (storage), Resend (email), and PayFast (payments) solely for this purpose. I can request access, correction, or deletion at any time via support@billdog.co.za.`,
} as const;

export const MANDATE_CONSENT_V1 = {
  version: 'v1',
  text: `I authorise Billdog (Pty) Ltd to act as my representative in correspondence with my municipality regarding billing disputes on my account. This mandate covers drafting and sending dispute letters, follow-ups, and escalations on my behalf, and remains in force until I revoke it via my account settings or by email to support@billdog.co.za.`,
} as const;

export const CURRENT_POPIA_CONSENT = POPIA_CONSENT_V1;
export const CURRENT_MANDATE_CONSENT = MANDATE_CONSENT_V1;
