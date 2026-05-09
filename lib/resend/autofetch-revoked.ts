import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

export interface AutofetchRevokedData {
  userEmail: string;
  userName: string;
  municipalityName: string;
  reason: 'invalid_credentials' | 'mfa_required' | 'too_many_failures' | string;
  settingsUrl: string;
}

export async function sendAutofetchRevokedEmail(data: AutofetchRevokedData): Promise<void> {
  const { userEmail, userName, municipalityName, reason, settingsUrl } = data;

  let reasonText = "We were unable to connect to the municipal portal.";
  if (reason === 'invalid_credentials') {
    reasonText = "The credentials provided are no longer valid (e.g. your password was changed).";
  } else if (reason === 'mfa_required') {
    reasonText = "The municipal portal has enforced Multi-Factor Authentication (MFA), which requires manual input.";
  } else if (reason === 'too_many_failures') {
    reasonText = "We experienced repeated connection failures to the municipal portal over several days.";
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0B1F3A; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #EF4444;">Auto-fetch Connection Paused</h1>
      <p>Hi ${userName},</p>
      <p>We've paused the auto-fetch connection for your <strong>${municipalityName}</strong> account.</p>
      
      <p style="background-color: #F8FAFF; border-left: 4px solid #EF4444; padding: 12px 16px; margin: 20px 0;">
        <strong>Reason:</strong> ${reasonText}
      </p>

      <p><strong>Your existing bills are safe.</strong> All bills we have already downloaded and analysed remain accessible in your dashboard.</p>
      
      <p>To resume auto-fetch, please visit your settings page to reconnect your account with updated credentials, or you can switch back to manually uploading bills as they arrive.</p>

      <div style="margin: 30px 0;">
        <a href="${settingsUrl}" style="background-color: #1A56DB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Update Connection Settings</a>
      </div>

      <hr style="border: 1px solid #E2E8F0; margin: 30px 0;" />
      
      <p style="font-size: 12px; color: #64748B;">
        Your connection was automatically revoked to protect your privacy and security.
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: `Billdog <${FROM_EMAIL}>`,
      to: userEmail,
      subject: `Action Required: ${municipalityName} Connection Paused`,
      html,
    });

    if (result.error) {
      console.error('[resend] Failed to send autofetch revoked email:', result.error);
    } else {
      console.log(`[resend] Sent autofetch revoked email to ${userEmail}`);
    }
  } catch (err) {
    console.error('[resend] Unexpected error sending autofetch revoked email:', err);
  }
}
