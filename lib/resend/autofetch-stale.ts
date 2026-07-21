/**
 * Transactional email: "your saved municipal login no longer works".
 *
 * Sent when fetch-latest detects INVALID_CREDENTIALS or MFA_REQUIRED. The
 * credential row is NOT revoked — we keep the encrypted password in place
 * so that if the failure was transient (rare), nothing is lost. The user
 * just needs to come back and re-enter their new portal password.
 *
 * Permitted under POPIA s11(1)(b) — transactional notice about an active
 * service the user has opted into.
 */

import { getResendClient } from '@/lib/resend/client';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

export interface AutofetchStaleData {
  userEmail: string;
  userName: string;
  municipalityName: string;
  /** 'invalid_credentials' or 'mfa_required'. Drives the wording but not the action. */
  reason: 'invalid_credentials' | 'mfa_required';
  /** Deep-link to /account where the Reconnect button lives. */
  reconnectUrl: string;
}

export async function sendAutofetchStaleEmail(data: AutofetchStaleData): Promise<void> {
  const { userEmail, userName, municipalityName, reason, reconnectUrl } = data;

  const reasonLine = reason === 'mfa_required'
    ? `${municipalityName} has enabled multi-factor authentication on your portal account, which our system can't complete on your behalf.`
    : `${municipalityName} rejected the saved password — most likely because you (or the portal) changed it.`;

  const actionLine = reason === 'mfa_required'
    ? `To resume monitoring, disable MFA on the ${municipalityName} portal, then click below to confirm your login still works.`
    : `To resume monitoring, click below and re-enter your current ${municipalityName} password. We'll save the new one and pick up where we left off.`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0B1F3A; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #F97316; font-family: 'Bebas Neue', Arial, sans-serif; letter-spacing: 0.05em;">
        ACTION NEEDED: RECONNECT YOUR ${municipalityName.toUpperCase()} ACCOUNT
      </h1>
      <p>Hi ${userName},</p>

      <p>${reasonLine}</p>

      <p style="background-color: #FFF7ED; border-left: 4px solid #F97316; padding: 12px 16px; margin: 20px 0;">
        <strong>What this means:</strong> We can't fetch new bills from ${municipalityName} until you reconnect.
        Your existing bills, analyses, and dispute letters are completely safe and still available in your dashboard.
      </p>

      <p>${actionLine}</p>

      <div style="margin: 30px 0;">
        <a href="${reconnectUrl}" style="background-color: #F97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em;">
          Reconnect ${municipalityName}
        </a>
      </div>

      <p style="font-size: 14px; color: #475569;">
        Prefer to stop monitoring? You can disconnect at any time from your
        <a href="${reconnectUrl}" style="color: #F97316;">account page</a>.
        Your right to delete your account and all stored data is preserved under POPIA — see the same page.
      </p>

      <hr style="border: 1px solid #E2E8F0; margin: 30px 0;" />

      <p style="font-size: 12px; color: #64748B;">
        You're receiving this transactional email because you enabled auto-fetch bill monitoring on Billdog.
        This is a service notice required to keep your account working, not marketing.
      </p>
    </div>
  `;

  // OPTIONAL COURTESY NOTICE — fail-open BY DESIGN. This reconnect nudge is
  // sent from a path that is already failing (invalid credentials / MFA); a
  // send error must not mask or escalate the underlying credential problem,
  // so it is logged and swallowed deliberately. Do NOT copy this pattern for
  // result-bearing emails (see autofetch-result.ts / autofetch-report.ts,
  // which throw).
  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from: `Billdog <${FROM_EMAIL}>`,
      to: userEmail,
      subject: `Action needed: reconnect your ${municipalityName} account`,
      html,
    });

    if (result.error) {
      console.error('[resend] Failed to send autofetch stale email (optional notice, continuing):', result.error);
    } else {
      console.log(`[resend] Sent autofetch stale email to ${userEmail}`);
    }
  } catch (err) {
    console.error('[resend] Unexpected error sending autofetch stale email (optional notice, continuing):', err);
  }
}
