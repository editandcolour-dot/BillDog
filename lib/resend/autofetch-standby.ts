/**
 * Standby email — sent after successful credential verification + QStash enqueue.
 * Tells the user their bills are being processed.
 *
 * Trigger: POST /api/autofetch/credentials, step 12 (after QStash publish succeeds).
 * NOT sent if QStash fails — user gets a 500 error instead.
 *
 * OPTIONAL CONNECT-TIME NOTICE — errors PROPAGATE from here; the caller
 * (credentials route) catches them and continues, explicitly treating this
 * send as non-blocking. Result-bearing emails (autofetch-result/-report)
 * are fail-closed instead — do not model new result emails on this one.
 */
import { getResendClient } from './client';

export interface StandbyEmailParams {
  userEmail: string;
  userName: string;
  municipalityName: string;
  accountUrl: string;
}

export async function sendAutofetchStandbyEmail(params: StandbyEmailParams): Promise<void> {
  const { userEmail, userName, municipalityName, accountUrl } = params;
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

  await resend.emails.send({
    from: `Billdog <${fromEmail}>`,
    to: [userEmail],
    subject: `Connected to ${municipalityName} — we're analysing your bills`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #0A1628;">
        <h2 style="color: #0A1628; margin-bottom: 16px;">You're connected, ${userName}!</h2>

        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          We've successfully verified your <strong>${municipalityName}</strong> portal credentials
          and started fetching your billing history.
        </p>

        <div style="background: #F0F7FF; border-left: 4px solid #E8760A; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #0A1628;">What happens next:</p>
          <ul style="margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;">
            <li><strong>Latest bill:</strong> analysed within 5 minutes</li>
            <li><strong>36-month history:</strong> full backfill completes within 24 hours</li>
            <li><strong>Results email:</strong> you'll receive a summary once analysis is complete</li>
          </ul>
        </div>

        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          You can check progress any time on your
          <a href="${accountUrl}" style="color: #E8760A; text-decoration: underline;">account dashboard</a>.
        </p>

        <p style="font-size: 14px; color: #64748B; margin-top: 32px;">
          Your municipal portal credentials are encrypted with AES-256-GCM and never stored in plain text.
          You can revoke access at any time from your account settings.
        </p>

        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94A3B8;">
          Billdog (Pty) Ltd · Cape Town, South Africa<br/>
          <a href="https://www.billdog.co.za/popia" style="color: #94A3B8;">POPIA compliance</a> ·
          <a href="mailto:support@billdog.co.za" style="color: #94A3B8;">support@billdog.co.za</a>
        </p>
      </div>
    `,
  });
}
