import { getResendClient } from './client';

export async function sendBill2Reminder(toEmail: string, caseId: string, municipalityName: string) {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

  await resend.emails.send({
    from: `Billdog <${fromEmail}>`,
    to: [toEmail],
    subject: `Has ${municipalityName} fixed your bill yet? (Case ${caseId})`,
    text: `It has been 30 days since we sent your dispute to ${municipalityName}.\n\nTo check if they have resolved the issue, please upload your latest municipal statement. We'll automatically compare it to your original bill and check for corrections.\n\nUpload latest bill: ${process.env.NEXT_PUBLIC_APP_URL}/case/${caseId}/verify`,
  });
}
