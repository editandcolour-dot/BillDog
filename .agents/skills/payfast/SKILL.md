---
name: payfast
description: PayFast card-on-file tokenisation and success-fee charging for Billdog. Payment Agent MUST read this before building any payment, tokenisation, or charge functionality.
---

# PayFast — Billdog

> **Consumed by:** Payment Agent — read before building any payment functionality
> **Project:** Billdog — SA municipal billing dispute platform
> **Revenue model:** 20% success fee on recovered amounts — charged only on confirmed resolution
> **Security:** See `security` skill for ITN validation, IP whitelisting, and signature verification
> **Rule:** Money is involved. Every charge must be explicit, confirmed, and idempotent. No speculative charges. No silent failures.

---

## PART 1: PayFast Fundamentals

### What Billdog Uses PayFast For

| Use Case | ✅ / ❌ | Details |
|---|---|---|
| Card-on-file tokenisation | ✅ | Save card at signup without charging |
| Success fee charge | ✅ | Charge 20% of recovered amount on resolution |
| Subscriptions | ❌ | Not a subscription product |
| Once-off payment at signup | ❌ | No upfront fees — tokenise only |

### Environments

| Environment | URL | Credentials | Use |
|---|---|---|---|
| **Sandbox** | `sandbox.payfast.co.za` | Sandbox merchant ID/key | Testing only |
| **Production** | `www.payfast.co.za` | Production merchant ID/key | Live payments |

**Rule:** Always use sandbox until explicitly ready for production launch. Different credentials per environment.

### Required Environment Variables
```env
PAYFAST_MERCHANT_ID=10000100          # From PayFast dashboard
PAYFAST_MERCHANT_KEY=46f0cd694581a     # From PayFast dashboard
PAYFAST_PASSPHRASE=your_passphrase    # Set in PayFast dashboard → Security
PAYFAST_ITN_URL=https://billdog.co.za/api/webhooks/payfast
PAYFAST_MODE=sandbox                   # 'sandbox' or 'production'
```

**Never commit these values.** Set in `.env` locally and Railway dashboard for production.

### PayFast Fees
- PayFast charges a per-transaction fee — check [payfast.co.za/fees](https://payfast.co.za/fees) for current rates
- Factor PayFast fees into the 20% success fee calculation
- Display the **net amount** to the user after PayFast fees are deducted
- Billdog absorbs the PayFast fee — the user pays exactly 20%

---

## PART 2: Card-on-File Tokenisation

### How It Works
```
User clicks "Add Card"
      │
      ▼
Billdog generates PayFast payment URL with tokenisation params
      │
      ▼
User redirected to PayFast hosted payment page
      │
      ▼
User enters card details DIRECTLY on PayFast
(card numbers NEVER touch Billdog servers)
      │
      ▼
PayFast sends ITN (webhook) to /api/webhooks/payfast
      │
      ▼
Billdog extracts token from ITN, stores in profiles.payfast_token
      │
      ▼
User redirected back to Billdog dashboard
```

### Generate Tokenisation URL
```typescript
// lib/payfast/tokenise.ts
import crypto from 'crypto';

interface TokeniseParams {
  userId: string;
  userEmail: string;
  userName: string;
}

export function generateTokeniseUrl(params: TokeniseParams): string {
  const baseUrl = process.env.PAYFAST_MODE === 'production'
    ? 'https://www.payfast.co.za/eng/process'
    : 'https://sandbox.payfast.co.za/eng/process';

  const data: Record<string, string> = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID!,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY!,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/dashboard?card=saved`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings?card=cancelled`,
    notify_url: process.env.PAYFAST_ITN_URL!,
    name_first: params.userName.split(' ')[0],
    email_address: params.userEmail,
    m_payment_id: params.userId,            // Match ITN to user
    amount: '0.00',                          // Zero charge — tokenise only
    item_name: 'Billdog — Save Card',
    subscription_type: '2',                  // Tokenisation (ad hoc)
    email_confirmation: '0',                 // No PayFast confirmation email
  };

  // Generate signature
  const signature = generateSignature(data, process.env.PAYFAST_PASSPHRASE!);
  data.signature = signature;

  // Build query string
  const queryString = Object.entries(data)
    .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
    .join('&');

  return `${baseUrl}?${queryString}`;
}

function generateSignature(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.entries(data)
    .filter(([key]) => key !== 'signature')
    .map(([key, val]) => `${key}=${encodeURIComponent(val.trim()).replace(/%20/g, '+')}`)
    .join('&');

  const withPassphrase = `${paramString}&passphrase=${encodeURIComponent(passphrase.trim())}`;
  return crypto.createHash('md5').update(withPassphrase).digest('hex');
}
```

### Receiving the Token via ITN
```typescript
// app/api/webhooks/payfast/route.ts
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.formData();

  // 1. Validate IP (see security skill)
  // 2. Validate signature (see security skill)
  // 3. Check payment status
  const paymentStatus = body.get('payment_status') as string;

  if (paymentStatus === 'COMPLETE') {
    const userId = body.get('m_payment_id') as string;
    const token = body.get('token') as string;

    if (token && userId) {
      // Store token — use service role (no user session in webhooks)
      const supabase = createAdminClient();
      await supabase
        .from('profiles')
        .update({ payfast_token: token })
        .eq('id', userId);

      await supabase.from('case_events').insert({
        case_id: null,
        event_type: 'card_tokenised',
        note: 'PayFast card token saved successfully.',
        metadata: { user_id: userId },
      });
    }
  }

  return NextResponse.json({ status: 'ok' });
}
```

### Rules
- **Never store raw card numbers** — ever. Not in the database, not in logs, not in temp files.
- **Token stored in `profiles.payfast_token`** — encrypted at rest by Supabase.
- **`m_payment_id` = user UUID** — this is how we match the ITN to the correct user.
- **`subscription_type: 2`** — this enables ad hoc (tokenisation) mode.
- **`amount: 0.00`** — zero charge for initial tokenisation.

---

## PART 3: Charging the Token

### When to Charge

| ✅ Charge | ❌ Never Charge |
|---|---|
| User confirms resolution on case detail page | Before resolution is confirmed |
| `amount_recovered` is saved and verified | Speculatively or preemptively |
| First charge for this case (`fee_charged IS NULL`) | Twice for the same case |

### Charge Calculation
```typescript
// lib/payfast/charge.ts

const MINIMUM_CHARGE_ZAR = 50;  // Not worth processing below R50
const FEE_PERCENTAGE = 0.20;

interface ChargeCalculation {
  amountRecovered: number;
  fee: number;
  belowMinimum: boolean;
}

export function calculateFee(amountRecovered: number): ChargeCalculation {
  const fee = Math.round(amountRecovered * FEE_PERCENTAGE * 100) / 100;
  return {
    amountRecovered,
    fee,
    belowMinimum: fee < MINIMUM_CHARGE_ZAR,
  };
}
```

### Ad Hoc Token Charge
```typescript
// lib/payfast/charge.ts

export async function chargeToken(params: {
  token: string;
  amount: number;      // In ZAR (e.g. 240.00)
  caseId: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.PAYFAST_MODE === 'production'
    ? 'https://api.payfast.co.za'
    : 'https://sandbox.payfast.co.za';

  const timestamp = new Date().toISOString();

  const headers: Record<string, string> = {
    'merchant-id': process.env.PAYFAST_MERCHANT_ID!,
    'version': 'v1',
    'timestamp': timestamp,
  };

  // Generate API signature
  headers.signature = generateApiSignature(headers, process.env.PAYFAST_PASSPHRASE!);

  const response = await fetch(
    `${baseUrl}/subscriptions/${params.token}/adhoc`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(params.amount * 100),   // Amount in cents
        item_name: `Billdog Success Fee — Case ${params.caseId}`,
        m_payment_id: params.caseId,
      }),
    },
  );

  if (response.ok) {
    return { success: true };
  }

  const errorBody = await response.text();
  console.error('[payfast/charge] Failed', {
    status: response.status,
    caseId: params.caseId,
    // Never log the token or amount details
  });

  return {
    success: false,
    error: response.status === 402
      ? 'Card declined — please update your card in Settings.'
      : 'Payment processing failed. Please try again.',
  };
}
```

### Idempotency Guard
```typescript
// Before charging — check if already charged
export async function processSuccessFee(
  caseId: string,
  amountRecovered: number,
  token: string,
): Promise<void> {
  const supabase = await createClient();

  // Idempotency check — CRITICAL
  const { data: existingCase } = await supabase
    .from('cases')
    .select('fee_charged')
    .eq('id', caseId)
    .single();

  if (existingCase?.fee_charged !== null) {
    console.warn('[payfast] Duplicate charge attempt blocked', { caseId });
    return; // Already charged — do nothing
  }

  const { fee, belowMinimum } = calculateFee(amountRecovered);

  if (belowMinimum) {
    // Below minimum — waive the fee
    await supabase.from('cases').update({ fee_charged: 0 }).eq('id', caseId);
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'fee_waived',
      note: `Fee of R${fee.toFixed(2)} below R${MINIMUM_CHARGE_ZAR} minimum. Waived.`,
    });
    return;
  }

  const result = await chargeToken({ token, amount: fee, caseId });

  if (result.success) {
    await supabase.from('cases').update({ fee_charged: fee }).eq('id', caseId);
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'fee_charged',
      note: `Success fee of R${fee.toFixed(2)} charged (20% of R${amountRecovered.toFixed(2)}).`,
    });
    // Send receipt email (see resend skill)
  } else {
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'charge_failed',
      note: result.error ?? 'Payment failed.',
    });
    // Notify user — but do NOT block case resolution
  }
}
```

### Rules for Charging
- **Check `fee_charged IS NULL` before** every charge attempt — prevents double-charging.
- **Never retry automatically** without user action — failed charges require the user to update their card.
- **Never block case resolution** on charge failure — the dispute result stands regardless of payment.
- **Log duplicate charge attempts** as security events.
- **Round to 2 decimal places** — `Math.round(amount * 100) / 100`.

---

## PART 4: Sandbox Testing

### Test Card Numbers

| Card | Number | CVV | Expiry |
|---|---|---|---|
| Visa | `4000 0000 0000 0002` | Any 3 digits | Any future date |
| Mastercard | `5200 0000 0000 0015` | Any 3 digits | Any future date |

### Test Checklist
Before going to production, verify all of the following in sandbox:

- [ ] **Tokenisation** — user redirected to PayFast, card saved, token received via ITN
- [ ] **Zero-amount charge** — no money taken during tokenisation
- [ ] **ITN received** — webhook endpoint receives and processes ITN correctly
- [ ] **Signature validation** — ITN signature verified, invalid signatures rejected
- [ ] **IP validation** — non-PayFast IPs rejected with 403
- [ ] **Ad hoc charge** — correct amount charged to token
- [ ] **Failed charge** — handled gracefully, user notified, case not blocked
- [ ] **Duplicate charge prevention** — second charge attempt blocked by idempotency check
- [ ] **Cancel flow** — user cancels on PayFast page, redirected back cleanly

### Sandbox Dashboard
```
https://sandbox.payfast.co.za/eng/merchant/dashboard
```
View all test transactions, ITN logs, and token details here.

---

## PART 5: User Experience

### Card Save Flow

**Trigger:** Letter preview page, before sending the dispute letter.

```
Letter preview → "Add your card to continue" → PayFast hosted page → 
Card saved → Return to letter preview → "Send Dispute Letter"
```

**UI Copy:**
```
💳 Add your card now
You only pay when we recover money for you.
20% success fee — charged only on confirmed resolution.
No recovery, no charge. Guaranteed.
```

- Show **PayFast logo** for trust (brand recognition in SA)
- After card saved: show ✅ success state with last 4 digits
- Card can be updated any time in Settings

### Charge Confirmation Flow

On the case resolution page — requires **explicit user action**:

```html
<div class="bg-off-white border border-light-grey rounded-2xl p-6">
  <h3 class="font-display text-xl text-navy">Confirm Resolution</h3>

  <div class="mt-4 space-y-2">
    <div class="flex justify-between text-base">
      <span class="text-grey">Amount recovered</span>
      <span class="text-navy font-bold">R1,200.00</span>
    </div>
    <div class="flex justify-between text-base">
      <span class="text-grey">Billdog fee (20%)</span>
      <span class="text-navy">R240.00</span>
    </div>
    <hr class="border-light-grey" />
    <div class="flex justify-between text-base">
      <span class="text-grey font-medium">You keep</span>
      <span class="text-success font-bold">R960.00</span>
    </div>
  </div>

  <button class="mt-6 btn-primary w-full">Confirm & Charge R240.00</button>
  <p class="mt-2 text-grey text-xs text-center">
    By confirming, you authorise Billdog to charge your saved card.
  </p>
</div>
```

**Rules:**
- Show exact amounts — recovered, fee, net to user
- **Explicit "Confirm & Charge" button** — never auto-charge
- Clear authorisation statement below the button

### Failed Charge UI
```
Toast (red): "Payment failed — please update your card in Settings."
```
- Case remains marked as resolved — do not unmark
- Settings page shows card update option
- Retry available from case detail page

---

## PART 6: VAT Considerations

### Current Status (v1)
- Billdog is **not VAT registered** at launch (below R1M turnover threshold)
- Success fee is **R amount only** — no VAT added
- **Monitor turnover** — register when approaching R1M annually

### When VAT Registered (Future)
```typescript
const VAT_RATE = 0.15;
const feeExclVat = amountRecovered * FEE_PERCENTAGE;
const vat = feeExclVat * VAT_RATE;
const feeInclVat = feeExclVat + vat;

// Display to user:
// Fee (excl. VAT): R240.00
// VAT (15%):        R36.00
// Total:           R276.00
```

- Include **VAT number** on all receipts
- PayFast charges VAT on **their** fees separately — that's their responsibility
- **Document this as a future consideration** — do not implement until registered
