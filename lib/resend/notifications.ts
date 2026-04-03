import { getResendClient } from './client';

export async function sendResolutionSuccessEmail(toEmail: string, amount: number, fee: number, caseId: string) {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

  await resend.emails.send({
    from: `Billdog <${fromEmail}>`,
    to: [toEmail],
    subject: `Great news — your dispute was resolved (Case ${caseId})`,
    text: `Your municipality responded and credited R${amount.toFixed(2)} to your account.\n\nAs agreed, we have safely charged the 20% success fee of R${fee.toFixed(2)} to your card on file.\n\nThank you for using Billdog.`,
  });
}

export async function sendResolutionConfirmEmail(toEmail: string, caseId: string, parsedAmount: number | null) {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

  const amountText = parsedAmount ? `We think R${parsedAmount.toFixed(2)} was credited.` : `We think your bill was corrected.`;

  await resend.emails.send({
    from: `Billdog <${fromEmail}>`,
    to: [toEmail],
    subject: `Your municipality responded — please confirm (Case ${caseId})`,
    text: `Your municipality responded to your dispute letter.\n\n${amountText}\n\nPlease log in to your Billdog account to confirm the exact amount on your latest statement so we can close this case.\n\nDashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });
}
