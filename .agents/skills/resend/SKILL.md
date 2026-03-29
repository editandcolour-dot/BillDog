---
name: resend-email
description: Resend email patterns for Billdog dispute letter delivery and notifications. Email Agent MUST read this before building any email sending functionality.
---

# Resend Email — Billdog

> **Consumed by:** Email Agent — read before building any email functionality
> **Project:** Billdog — SA municipal billing dispute platform
> **From:** `disputes@billdog.co.za`
> **Reply-to:** `support@billdog.co.za`
> **Critical:** Dispute letters must be **plain text** — never HTML. Municipalities have strict email clients.

---

## PART 1: Setup

### Installation
```bash
npm install resend
```

### Server-Side Client
```typescript
// lib/email/client.ts
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
```

**Rules:**
- **Never instantiate in browser** — API key must stay server-side.
- **Never import in `'use client'` files.**
- **Singleton pattern** — reuse the client.

### Domain Verification

Before sending any real emails, verify `billdog.co.za` in the Resend dashboard and add these DNS records:

| Record | Type | Host | Value |
|---|---|---|---|
| SPF | TXT | `billdog.co.za` | `v=spf1 include:resend.com ~all` |
| DKIM | CNAME | (provided by Resend) | (provided by Resend) |
| DMARC | TXT | `_dmarc.billdog.co.za` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@billdog.co.za` |

**Without these records, emails land in spam.** Verify all records have propagated before sending any production emails.

### Environment Variables
```env
RESEND_API_KEY=re_xxxxxxxxxxxx    # Server-only — no NEXT_PUBLIC_
RESEND_FROM_EMAIL=disputes@billdog.co.za
```

---

## PART 2: Email Types

Billdog sends four types of email:

| Type | Format | Recipient | Purpose |
|---|---|---|---|
| **Dispute letter** | Plain text | Municipality | Core product — formal dispute |
| **Dispute confirmation** | HTML | User | Confirm letter was sent |
| **Resolution confirmation** | HTML | User | Case resolved + amount recovered |
| **Payment receipt** | HTML or plain text | User | Fee receipt for success charge |

---

## PART 3: Dispute Letter Email

This is the **core product email**. It must be perfect.

### Why Plain Text Only
- Municipalities may use strict, legacy email clients (Outlook 2007, GroupWise)
- HTML formatting may cause letters to be filtered or ignored
- Plain text is more **formal and professional** — it reads like a proper legal letter
- Plain text renders identically in every email client

### Subject Line Format
```
Formal Dispute — Account [account_number] — [municipality_name] — [bill_period]
```
Example:
```
Formal Dispute — Account 223740405 — City of Cape Town — January 2026
```

### Send Pattern
```typescript
// lib/email/send-dispute.ts
import { getResendClient } from '@/lib/email/client';

interface DisputeEmailParams {
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

  const { data, error } = await resend.emails.send({
    from: 'Billdog Disputes <disputes@billdog.co.za>',
    to: [params.municipalityEmail],
    cc: [params.userEmail],
    replyTo: params.userEmail,
    subject,
    text: params.letterContent,    // Plain text ONLY — no html property
  });

  if (error) {
    throw new EmailError(
      `Failed to send dispute letter: ${error.message}`,
      'SEND_FAILED',
    );
  }

  return data!.id;   // Resend message ID for tracking
}
```

### Rules
- **`to:`** — municipality dispute email from `municipalities` table
- **`cc:`** — user's email (they keep a copy)
- **`replyTo:`** — user's email (municipality replies go directly to user)
- **`text:`** — full plain text letter from `cases.letter_content` — **no modifications**
- **No `html:` property** — plain text only for dispute letters
- **Store Resend message ID** in `case_events` for delivery tracking

---

## PART 4: User Notification Emails

### Dispute Confirmation Email
Sent immediately after the dispute letter is delivered to the municipality.

```typescript
export async function sendDisputeConfirmation(params: {
  userEmail: string;
  userName: string;
  caseId: string;
  municipalityName: string;
  amountDisputed: number;
}): Promise<string> {
  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from: 'Billdog <disputes@billdog.co.za>',
    to: [params.userEmail],
    replyTo: 'support@billdog.co.za',
    subject: 'Your dispute has been submitted — Billdog',
    html: buildConfirmationHtml(params),
    text: buildConfirmationText(params),    // Always include plain text fallback
  });

  if (error) throw new EmailError(error.message, 'CONFIRMATION_FAILED');
  return data!.id;
}
```

**Content must include:**
- Case reference number
- Municipality name
- Amount disputed
- What happens next (municipality has 30 days to respond)
- Link to case dashboard (orange CTA button)
- Support contact: support@billdog.co.za

### Resolution Confirmation Email
```typescript
subject: 'Great news — your dispute was resolved — Billdog'
```

**Content must include:**
- Amount recovered
- Billdog fee (20%)
- Net amount to user
- Thank you message
- Link to case dashboard

### Payment Receipt Email
```typescript
subject: `Billdog fee receipt — Case ${caseId}`
```

**Content must include:**
- Case ID
- Amount recovered by dispute
- Billdog fee charged (20%)
- Date of charge
- VAT number (if Billdog is VAT registered)

---

## PART 5: HTML Email Template Rules

Email HTML is not web HTML. Most CSS doesn't work.

### Do's ✅
| Rule | Why |
|---|---|
| **Inline CSS only** | Email clients strip `<style>` blocks |
| **Table-based layout** | Outlook doesn't support flexbox or grid |
| **Max width 600px** | Standard email width, centered |
| **Single column** | Multi-column breaks in Outlook |
| **Arial or Helvetica fonts** | Web fonts don't load in email |
| **Always include `text:` fallback** | Some clients only show plain text |

### Don'ts ❌
| Rule | Why |
|---|---|
| No background images | Outlook blocks by default |
| No CSS grid or flexbox | Zero support in Outlook |
| No web fonts | Won't load — fallback is ugly |
| No `<div>` for layout | Use `<table>` for structure |
| No external stylesheets | Stripped by all email clients |

### CTA Button Template (Outlook-Compatible)
```html
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="https://app.billdog.co.za/dashboard"
  style="height:44px;v-text-anchor:middle;width:200px;" arcsize="10%" strokecolor="#F97316" fillcolor="#F97316">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:Arial;font-size:16px;font-weight:bold;">View Your Case</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="https://app.billdog.co.za/dashboard"
   style="background-color:#F97316;border-radius:6px;color:#ffffff;display:inline-block;
          font-family:Arial,sans-serif;font-size:16px;font-weight:bold;line-height:44px;
          text-align:center;text-decoration:none;width:200px;">
  View Your Case
</a>
<!--<![endif]-->
```

### Colour Palette for Emails
| Colour | Hex | Usage |
|---|---|---|
| Navy | `#0B1F3A` | Header background, heading text |
| Orange | `#F97316` | CTA buttons, highlights |
| White | `#FFFFFF` | Body background, button text |
| Grey | `#64748B` | Body text, captions |
| Light grey | `#E2E8F0` | Borders, dividers |

### Basic HTML Email Structure
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F8FAFF;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFF;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0B1F3A;padding:24px 32px;">
              <img src="https://app.billdog.co.za/logo-email.png" alt="Billdog" width="120" height="32" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <!-- Email content here -->
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFF;padding:24px 32px;border-top:1px solid #E2E8F0;">
              <p style="color:#64748B;font-size:12px;margin:0;">
                Billdog — Your Municipal Billing Advocate<br/>
                <a href="https://app.billdog.co.za/privacy" style="color:#1A56DB;">Privacy Policy</a> |
                <a href="https://app.billdog.co.za/popia" style="color:#1A56DB;">POPIA</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## PART 6: Error Handling

### Standard Error Pattern
```typescript
const { data, error } = await resend.emails.send({ /* ... */ });

if (error) {
  console.error('[email/send]', {
    type: error.name,
    message: error.message,
    recipient: recipientType,    // 'municipality' or 'user' — not the actual email
    caseId,
  });
  throw new EmailError(error.message, 'SEND_FAILED');
}
```

### Municipality Email Bounced
```typescript
// Webhook or check: if municipality email bounces
if (event.type === 'bounced') {
  // Mark municipality email as invalid
  await supabase
    .from('municipalities')
    .update({ dispute_email_valid: false })
    .eq('id', municipalityId);

  // Notify user
  await sendUserNotification({
    userEmail,
    subject: 'Dispute delivery issue — action needed',
    text: `We couldn't deliver your dispute letter to ${municipalityName}. ` +
          `Please contact the municipality directly at their office ` +
          `to get the correct dispute email address.`,
  });

  // Log event
  await supabase.from('case_events').insert({
    case_id: caseId,
    event_type: 'email_bounced',
    note: `Dispute letter bounced from ${municipalityName} dispute address.`,
  });
}
```

### Send Failure — Retry Pattern
```typescript
export async function sendWithRetry(
  sendFn: () => Promise<string>,
  caseId: string,
): Promise<string> {
  try {
    return await sendFn();
  } catch (firstError) {
    console.warn('[email] First attempt failed, retrying in 30s', { caseId });

    await new Promise(resolve => setTimeout(resolve, 30_000));

    try {
      return await sendFn();
    } catch (secondError) {
      console.error('[email] Second attempt failed', { caseId });

      // Update case status
      await supabase
        .from('cases')
        .update({ status: 'send_failed' })
        .eq('id', caseId);

      throw new EmailError(
        "We couldn't send your dispute letter. Please try again or contact support.",
        'SEND_FAILED_AFTER_RETRY',
      );
    }
  }
}
```

### Rate Limits
- **Resend free tier:** 100 emails/day, 1 email/second
- **Upgrade to paid plan before launch** — dispute letters are the core product
- Monitor daily send volume in Resend dashboard
- If approaching limit: queue emails, don't drop them

---

## PART 7: Logging

### Log Every Email to case_events
```typescript
// After successful send
await supabase.from('case_events').insert({
  case_id: caseId,
  event_type: 'letter_sent',    // or 'notification_sent'
  note: `Dispute letter sent to ${municipalityName}.`,
  metadata: {
    resend_id: messageId,
    recipient_type: 'municipality',    // Never log actual email address
    subject: subjectLine,
    timestamp: new Date().toISOString(),
  },
});
```

### Rules
- **Never log email body** content in `case_events` — it contains PII
- **Never log recipient email addresses** in `case_events` — log type only (`'municipality'`, `'user'`)
- **Always store Resend message ID** — needed for delivery tracking and debugging
- **Log send failures** with error type but not error detail

---

## PART 8: Deliverability Checklist

Before sending any production emails:

- [ ] `billdog.co.za` verified in Resend dashboard
- [ ] SPF record added and propagated (check via MXToolbox)
- [ ] DKIM records added and propagated
- [ ] DMARC record added
- [ ] Test email received in **Gmail inbox** (not spam/promotions)
- [ ] Test email received in **Outlook inbox** (not junk)
- [ ] Reply-to working — replies go to user's email
- [ ] Plain text dispute letter renders correctly (no encoding issues)
- [ ] HTML notification emails tested in Gmail, Outlook, Apple Mail
- [ ] CTA buttons clickable in Outlook (VML fallback works)
- [ ] Unsubscribe link working (for marketing emails only)
- [ ] Resend plan upgraded from free tier
- [ ] Bounce webhook configured to detect invalid municipality emails
