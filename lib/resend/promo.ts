import { getResendClient } from './client';
import { EmailError } from './send-dispute';

export interface PromoEmailParams {
  userEmail: string;
}

export async function sendPromoConfirmation(params: PromoEmailParams): Promise<string> {
  const resend = getResendClient();

  const subject = 'Your free Billdog dispute is locked in 🐕';

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

  const textBody = `Hi there,

Your FIRSTTEN promo code has been successfully applied!

We have received your case and your dispute letter is ready. Because you are one of our first 10 resolved cases, you will NOT be charged our standard 20% success fee for this dispute. It is completely free.

Please ensure you review and send your letter from the dashboard.
Please note that municipal resolutions can take several weeks, but we will track all updates.

Woof,
The Billdog Team`;

  const { data, error } = await resend.emails.send({
    from: `Billdog <${fromEmail}>`,
    to: [params.userEmail],
    subject,
    text: textBody,
  });

  if (error) {
    throw new EmailError(
      `Failed to send promo confirmation: ${error.message}`,
      'SEND_FAILED',
    );
  }

  return data!.id;
}
