import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactRequest;

    // Validate required fields
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 },
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 },
      );
    }

    // Send via Resend to support inbox
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za',
      to: 'support@billdog.co.za',
      replyTo: body.email,
      subject: `[Contact] ${body.subject || 'General Enquiry'} — ${body.name}`,
      text: [
        `Name: ${body.name}`,
        `Email: ${body.email}`,
        `Subject: ${body.subject || 'General Enquiry'}`,
        '',
        'Message:',
        body.message,
      ].join('\n'),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/contact] Error sending contact email', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 },
    );
  }
}
