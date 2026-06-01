import { getResendClient } from './client';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

export interface AutofetchReportData {
  userEmail: string;
  userName: string;
  billsAnalysed: number;
  billsSkipped: number;
  totalRecoverable: number;
  topFindings: {
    period: string;
    amount: number;
    issue: string;
  }[];
  dashboardUrl: string;
}

export async function sendAutofetchReportEmail(data: AutofetchReportData): Promise<void> {
  const { userEmail, userName, billsAnalysed, billsSkipped, totalRecoverable, topFindings, dashboardUrl } = data;

  const findingsHtml = topFindings.length > 0
    ? `
      <h3>Top Findings</h3>
      <ul>
        ${topFindings.map(f => `<li><strong>${f.period}</strong>: R${f.amount.toFixed(2)} (${f.issue})</li>`).join('')}
      </ul>
    `
    : '<p>No significant overcharges found in this audit.</p>';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0B1F3A; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #F97316;">Your 3-Year Bill Audit is Complete</h1>
      <p>Hi ${userName},</p>
      <p>We've finished scanning your municipal account history.</p>
      
      <div style="background-color: #F8FAFF; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">Audit Summary</h2>
        <ul style="list-style-type: none; padding-left: 0;">
          <li><strong>Bills Analysed:</strong> ${billsAnalysed}</li>
          <li><strong>Bills Skipped (Duplicates):</strong> ${billsSkipped}</li>
          <li><strong style="color: #10B981; font-size: 1.1em;">Total Recoverable: R${totalRecoverable.toFixed(2)}</strong></li>
        </ul>
      </div>

      ${findingsHtml}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="background-color: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Full Dashboard</a>
      </div>

      <hr style="border: 1px solid #E2E8F0; margin: 30px 0;" />
      
      <p style="font-size: 12px; color: #64748B;">
        This automated audit was performed based on your consent. 
        <a href="${dashboardUrl}/settings" style="color: #1A56DB;">Manage auto-fetch settings or revoke access</a>.
        Read our <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy" style="color: #1A56DB;">Privacy Policy</a>.
      </p>
    </div>
  `;

  try {
    const result = await getResendClient().emails.send({
      from: `Billdog <${FROM_EMAIL}>`,
      to: userEmail,
      subject: 'Your 3-Year Bill Audit is Complete',
      html,
    });

    if (result.error) {
      console.error('[resend] Failed to send autofetch report email:', result.error);
    } else {
      console.log(`[resend] Sent autofetch report email to ${userEmail}`);
    }
  } catch (err) {
    console.error('[resend] Unexpected error sending autofetch report email:', err);
  }
}
