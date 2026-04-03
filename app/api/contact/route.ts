import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getRateLimiter, rateLimitExceededResponse } from '@/lib/rate-limit';

const contactLimiter = getRateLimiter(10, '1 h');

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
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success } = await contactLimiter.limit(`contact_${ip}`);
    if (!success) return rateLimitExceededResponse();

    const body = (await request.json()) as ContactRequest;

    // Trim and sanitize basic inputs
    const name = body.name?.trim() || '';
    const email = body.email?.trim() || '';
    const subject = body.subject?.trim() || 'General Enquiry';
    const message = body.message?.trim() || '';

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 },
      );
    }

    // HIGH-03 Fix contact form lengths and sanitize
    if (subject.length > 200) {
      return NextResponse.json({ error: 'Subject cannot exceed 200 characters.' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message cannot exceed 2000 characters.' }, { status: 400 });
    }
    
    // Simple sanitization to strip illegal HTML tags
    const sanitizeHtml = (str: string) => str.replace(/<[^>]*>?/gm, '');
    const cleanSubject = sanitizeHtml(subject);
    const cleanMessage = sanitizeHtml(message);

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 },
      );
    }

    // Send via Resend to support inbox
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za',
      to: 'support@billdog.co.za',
      replyTo: email,
      subject: `[Contact] ${cleanSubject} — ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Subject: ${cleanSubject}`,
        '',
        'Message:',
        cleanMessage,
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
