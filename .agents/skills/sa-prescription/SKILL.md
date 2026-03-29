---
name: sa-prescription
description: South African prescription law for municipal billing disputes. AI Agent, Legal Agent, and UI Agent MUST read this before any bill analysis, letter generation, or results display.
---

# Prescription Law — Billdog

> **Consumed by:** AI Agent, Legal Agent, UI Agent
> **Project:** Billdog — SA municipal billing dispute platform
> **Legal basis:** Prescription Act (No. 68 of 1969), Section 11
> **Constraint:** ARCHITECTURE.md Section 12, Constraint 8 — app must warn users if bill period is outside prescription window
> **Core rule:** Never file a dispute on a prescribed claim. It wastes the user's time and damages Billdog's credibility.

---

## 1. What Prescription Means — Plain English

**After a certain period, a debt becomes legally unenforceable.**

- The municipality can no longer collect it — even if they send a bill
- The consumer can no longer claim a refund — even if they were overcharged
- This cuts both ways — it **protects** consumers from old municipal debt AND **limits** how far back Billdog can dispute

Think of it as a legal expiry date on debts. Once expired, neither side can act on it.

### Why Billdog Cares
- Disputing a prescribed charge is **legally pointless** — the municipality can simply cite prescription and dismiss it
- Filing prescribed claims wastes the user's time and Billdog's resources
- Worse: it **damages credibility** — if we send a letter with prescribed items, the municipality discredits the entire dispute

---

## 2. Prescription Periods — Section 11

| Service | Period | Practical Limit |
|---|---|---|
| Electricity | **3 years** | Bills from 36+ months ago are prescribed |
| Water | **3 years** | Bills from 36+ months ago are prescribed |
| Gas | **3 years** | Bills from 36+ months ago are prescribed |
| Rates (property tax) | **30 years** | Almost never relevant in practice |
| Sewerage | **30 years** | Classified as a levy |
| Refuse removal | **30 years** | Classified as a levy |

### The 3-Year Rule
For day-to-day Billdog operations, the **3-year rule** is what matters. Most municipal disputes involve electricity and water charges, both of which prescribe after 3 years.

### The 30-Year Services
Rates, sewerage, and refuse have a 30-year prescription period because they are classified as statutory **levies**, not service charges. In practice, this means prescription almost never applies to these items.

---

## 3. When Prescription Starts Running

| Scenario | Prescription Starts |
|---|---|
| Normal bill issued | **Date the bill was issued** (when the debt became due) |
| Bill never issued (estimated readings corrected later) | **Date the municipality reasonably should have billed** |
| Backdated reconciliation bill | **Date of the original billing period**, not the reconciliation date |

### Key Principle
Prescription runs from when the **debt became due** — not from when the consumer noticed the error.

```
Bill issued for March 2023 electricity → prescription starts March 2023
Consumer notices the error in January 2026 → only 1 month left
Consumer notices in April 2026 → prescribed (3 years elapsed)
```

**The consumer's ignorance does not extend the clock.**

---

## 4. What STOPS Prescription (Interruption)

These events **reset the prescription clock to zero**:

| Event | Effect | Warning Level |
|---|---|---|
| Consumer **acknowledges debt in writing** | Resets the full 3-year clock | 🔴 CRITICAL |
| Consumer **makes partial payment** | Resets clock for **entire** debt | 🔴 CRITICAL |
| Municipality **serves court summons** | Stops prescription | 🟡 Inform user |
| Consumer **signs payment arrangement** | Resets clock | 🔴 CRITICAL |

### The Acknowledgement Trap
Municipalities know about prescription. Their common tactic:

1. Send a letter saying "You owe R15,000 from 2021"
2. Ask the consumer to sign a payment arrangement
3. Consumer signs → prescription resets → municipality now has 3 fresh years to collect

**Billdog must warn users:**
> ⚠️ **NEVER sign any document from the municipality without reading it carefully.** Signing an acknowledgement of debt or payment arrangement resets the prescription period entirely. Contact us before signing anything.

---

## 5. What Does NOT Interrupt Prescription

These events have **no legal effect** on prescription:

| Event | Legal Effect |
|---|---|
| Paying "under protest" (writing objection on payment) | **None** — prescription still runs |
| Raising a verbal complaint at municipal office | **None** — verbal disputes don't count |
| Logging a query on the municipal portal | **None** — portal queries are not formal acknowledgements |
| Receiving a statement of account | **None** — receiving a statement is passive |
| The municipality sending reminders or demands | **None** — demand letters don't interrupt |

**Rule:** The only thing that resets prescription is the **consumer's own action** (signing, paying, or acknowledging).

---

## 6. The Paid Amount Trap

**Once an amount has been paid, it cannot prescribe. No refund claim is possible.**

| Scenario | Outcome |
|---|---|
| Consumer overpaid R3,000 in electricity, noticed the same month | Dispute and claim refund ✅ |
| Consumer overpaid R3,000, didn't notice for 2 years | Dispute and claim refund ✅ (within 3 years) |
| Consumer overpaid R3,000, noticed after 4 years | Prescribed — no refund ❌ |
| Consumer overpaid R3,000, paid without knowing it was wrong | **No refund** — payment is acceptance ❌ |

### Marketing Implication
This is why Billdog's core message is:

> **"Check your bill BEFORE you pay."**

Once the money leaves the account, the consumer's leverage drops dramatically. Billdog adds the most value when users upload bills **before** paying them.

---

## 7. How Billdog Must Handle Prescription

### Calculation Logic
```typescript
// lib/prescription.ts

interface PrescriptionCheck {
  status: 'normal' | 'approaching' | 'prescribed';
  monthsRemaining: number | null;
  message: string;
}

const PRESCRIPTION_MONTHS: Record<string, number> = {
  electricity: 36,
  water: 36,
  gas: 36,
  rates: 360,
  sewerage: 360,
  refuse: 360,
};

export function checkPrescription(
  billPeriod: string,    // e.g. "2023-03" or "March 2023"
  serviceType: string,   // e.g. "electricity", "water", "rates"
): PrescriptionCheck {
  const billDate = parseBillPeriod(billPeriod);
  const now = new Date();
  const monthsElapsed = monthsBetween(billDate, now);
  const limit = PRESCRIPTION_MONTHS[serviceType.toLowerCase()] ?? 36;
  const monthsRemaining = limit - monthsElapsed;

  if (monthsRemaining <= 0) {
    return {
      status: 'prescribed',
      monthsRemaining: 0,
      message: `This ${serviceType} charge is older than ${limit / 12} years and is legally prescribed. We cannot dispute it.`,
    };
  }

  if (monthsRemaining <= 6) {
    return {
      status: 'approaching',
      monthsRemaining,
      message: `This charge is approaching the ${limit / 12}-year prescription limit. Act immediately — only ${monthsRemaining} months remaining.`,
    };
  }

  return {
    status: 'normal',
    monthsRemaining,
    message: '',
  };
}

function parseBillPeriod(period: string): Date {
  // Handle "March 2023", "2023-03", "03/2023" formats
  // Return the first day of the billing month
  // Implementation depends on bill format
  // ...
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12
    + (to.getMonth() - from.getMonth());
}
```

### Application Rules

| Months Elapsed | Service Type | Status | Action |
|---|---|---|---|
| 0–30 months | Water/Electricity | `normal` | Proceed normally |
| 30–36 months | Water/Electricity | `approaching` | Flag as urgent, warn user |
| 36+ months | Water/Electricity | `prescribed` | **Exclude from dispute** |
| 0–354 months | Rates/Sewerage/Refuse | `normal` | Proceed normally |
| 354–360 months | Rates/Sewerage/Refuse | `approaching` | Flag as urgent |
| 360+ months | Rates/Sewerage/Refuse | `prescribed` | Exclude from dispute |

---

## 8. UI Warnings — Analysis Results Page

### Prescribed Banner (Red)
```html
<div class="bg-error/10 border border-error/20 rounded-xl p-4 flex items-start gap-3">
  <ShieldXIcon class="w-5 h-5 text-error shrink-0 mt-0.5" />
  <div>
    <p class="text-error font-bold text-sm">Prescribed — Cannot Dispute</p>
    <p class="text-grey text-sm mt-1">
      This charge is older than 3 years and is legally prescribed under 
      Section 11 of the Prescription Act. We cannot include it in your dispute.
    </p>
  </div>
</div>
```

### Approaching Prescription Banner (Orange)
```html
<div class="bg-orange/10 border border-orange/20 rounded-xl p-4 flex items-start gap-3">
  <AlertTriangleIcon class="w-5 h-5 text-orange shrink-0 mt-0.5" />
  <div>
    <p class="text-orange font-bold text-sm">Approaching Prescription — Act Now</p>
    <p class="text-grey text-sm mt-1">
      This charge expires in {monthsRemaining} months. File your dispute 
      immediately to preserve your rights.
    </p>
  </div>
</div>
```

### Normal (No Banner)
No prescription warning displayed. Proceed to letter generation.

---

## 9. Partial Bill Handling

A single bill may contain **both prescribed and non-prescribed errors**.

### Example
```
March 2023 bill contains:
  ├── Water overcharge: R450     → 36 months old → PRESCRIBED ❌
  ├── Electricity overcharge: R1,200 → 36 months old → PRESCRIBED ❌
  └── Rates error: R800          → 36 months old → NORMAL ✅ (30-year limit)
```

### Rules
1. **Dispute only non-prescribed items** — never include prescribed charges in the letter
2. **Clearly exclude prescribed items** — the letter should not reference them
3. **Explain to the user** why certain items were excluded:
   > "2 charges on your March 2023 bill are older than 3 years and cannot be disputed under the Prescription Act. The remaining R800 rates error has been included in your dispute letter."
4. **Adjust totals** — `total_recoverable` should only include non-prescribed amounts

### In Analysis Results UI
```
Total on bill:        R2,450
Prescribed (excluded): R1,650  ← greyed out, strikethrough
Recoverable:          R800     ← highlighted in success green
```

---

## 10. Backdated Billing Trap

### The Scenario
1. Municipality estimates meter readings for 12 months (no actual reading taken)
2. An actual reading is finally taken
3. Municipality sends a single reconciliation bill covering all 12 months
4. The reconciliation bill arrives in March 2026 but covers charges back to March 2023

### The Problem
- The reconciliation bill is dated March 2026 (looks fresh)
- But the underlying charges are from March 2023 (36 months old)
- Individual monthly charges within the reconciliation may be prescribed

### How Billdog Handles This
1. **Identify backdated amounts** — Claude analysis should flag charges that reference prior periods
2. **Calculate prescription per line item** — not per bill date
3. **Flag prescribed line items** within the reconciliation
4. **Cite Gallagher Estates** — municipality cannot backdate and apply **current (higher) tariff rates** to old consumption

### In the Dispute Letter
> "The reconciliation bill dated [date] includes charges dating back to [period]. In terms of Section 11 of the Prescription Act, charges for electricity and water services prescribed after three (3) years. Additionally, per Gallagher Estates (Pty) Ltd v City of Johannesburg (2016), the municipality may not apply current tariff rates to historical consumption."

---

## 11. User Education Copy

### For the Analysis Results Page
> **What is prescription?**
> The law says municipalities only have 3 years to collect electricity and water debts. After that, you don't owe it and they can't make you pay. But this also means we can only dispute charges from the last 3 years.

### For the Bill Upload Page
> **Why check your bill now?**
> Once you pay, even by mistake, you cannot get that money back through a legal dispute. The earlier you check, the more we can recover.

### For the Payment Warning
> **Keep paying the undisputed amount.**
> While your dispute is active, you must continue paying the portion of your bill that is correct. If you stop all payments, the municipality can legally disconnect your services — even during an active dispute.

### For the Sign-Nothing Warning
> **⚠️ Don't sign anything from the municipality without checking with us first.**
> Signing an "acknowledgement of debt" or a payment arrangement resets the 3-year clock. This is a common tactic municipalities use to revive old debts. We can advise you before you sign.
