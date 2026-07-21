import { getResendClient } from './client';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

export interface AutofetchResultFinding {
  title: string;
  issue: string;
  amount: number | null;
}

export interface AutofetchResultEmailData {
  userName: string;
  municipalityName: string;
  billPeriod: string | null;
  totalRecoverable: number;
  findings: AutofetchResultFinding[];
  caseUrl: string;
}

/**
 * Per-bill result email for the recurring autofetch pipeline: carries the
 * ACTUAL audit outcome (findings + recoverable total, or an explicit
 * clean-bill notice). Distinct from sendAutofetchReportEmail, which is the
 * one-time 3-year backfill digest sent at initial connect.
 */
export function buildAutofetchResultEmail(
  data: AutofetchResultEmailData
): { subject: string; html: string } {
  const { userName, municipalityName, billPeriod, totalRecoverable, findings, caseUrl } = data;
  const hasFindings = findings.length > 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://billdog.co.za';

  const subject = hasFindings
    ? `New ${municipalityName} bill: R${totalRecoverable.toFixed(2)} in billing errors found`
    : `New ${municipalityName} bill: no billing errors found`;

  const periodHtml = billPeriod
    ? `<p style="color: #64748B;">Billing period: <strong>${billPeriod}</strong></p>`
    : '';

  const outcomeHtml = hasFindings
    ? `
      <div style="background-color: #F8FAFF; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">Audit Result</h2>
        <p style="margin-bottom: 0;"><strong style="color: #EF4444; font-size: 1.1em;">R${totalRecoverable.toFixed(2)} in billing errors found</strong></p>
      </div>
      <h3>What we found</h3>
      <ul>
        ${findings.map(f => `<li><strong>${f.title}</strong>${f.amount != null ? `: R${f.amount.toFixed(2)}` : ''} &mdash; ${f.issue}</li>`).join('')}
      </ul>
      <p>Review the findings and send your dispute letter from your case page.</p>
    `
    : `
      <div style="background-color: #F8FAFF; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">Audit Result</h2>
        <p style="margin-bottom: 0;"><strong style="color: #10B981; font-size: 1.1em;">No billing errors found</strong></p>
      </div>
      <p>Good news &mdash; we audited this bill line by line and found no billing errors. No action is needed.</p>
    `;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0B1F3A; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #F97316;">Your New ${municipalityName} Bill Has Been Audited</h1>
      <p>Hi ${userName},</p>
      <p>We automatically fetched your latest municipal bill and ran the full audit.</p>
      ${periodHtml}

      ${outcomeHtml}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${caseUrl}" style="background-color: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Case</a>
      </div>

      <hr style="border: 1px solid #E2E8F0; margin: 30px 0;" />

      <p style="font-size: 12px; color: #64748B;">
        This automated audit was performed based on your consent.
        <a href="${appUrl}/account" style="color: #1A56DB;">Manage auto-fetch settings or revoke access</a>.
        Read our <a href="${appUrl}/privacy" style="color: #1A56DB;">Privacy Policy</a>.
      </p>
    </div>
  `;

  return { subject, html };
}

/**
 * Send the per-bill result email. FAIL-CLOSED BY DESIGN: a Resend error (or a
 * missing RESEND_API_KEY) THROWS to the caller — the analysis worker marks the
 * job failed. Never swallow here; the spec's deliverable is "user receives the
 * result", so a silent send failure is a pipeline failure.
 */
export async function sendAutofetchResultEmail(
  data: AutofetchResultEmailData & { userEmail: string }
): Promise<void> {
  const { subject, html } = buildAutofetchResultEmail(data);

  const result = await getResendClient().emails.send({
    from: `Billdog <${FROM_EMAIL}>`,
    to: data.userEmail,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Autofetch result email failed: ${result.error.message ?? String(result.error)}`);
  }

  console.log(`[resend] Sent autofetch result email to ${data.userEmail}`);
}
