import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('[FATAL] RESEND_API_KEY is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}
