import { getResendClient } from './client';

export class EmailError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'EmailError';
  }
}

export interface DisputeEmailParams {
  municipalityEmail: string;
  userEmail: string;
  accountNumber: string;
  municipalityName: string;
  billPeriod: string;
  letterContent: string;    // Plain text from cases.letter_content
  caseId: string;
}

export async function sendDisputeLetter(params: DisputeEmailParams): Promise<string> {
  const resend = getResendClient();

  const subject = `Formal Dispute — Account ${params.accountNumber} — ${params.municipalityName} — ${params.billPeriod}`;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

  const { data, error } = await resend.emails.send({
    from: `Billdog Disputes <${fromEmail}>`,
    to: [params.municipalityEmail],
    cc: [params.userEmail],
    replyTo: `case-${params.caseId}@disputes.billdog.co.za`,
    subject,
    text: params.letterContent,    // Plain text ONLY — no HTML property
  });

  if (error) {
    throw new EmailError(
      `Failed to send dispute letter: ${error.message}`,
      'SEND_FAILED',
    );
  }

  return data!.id;   // Resend message ID for tracking
}
