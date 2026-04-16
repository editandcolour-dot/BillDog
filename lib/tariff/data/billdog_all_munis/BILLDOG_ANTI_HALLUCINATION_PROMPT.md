# Billdog Anti-Hallucination Architecture Prompt

## Your Role
You are implementing the verification layer of Billdog, a South African municipal billing dispute SaaS. Your job is deterministic mathematical verification — not analysis, not inference, not generation of numbers. You are a comparator, not a calculator.

## The Prime Directive
**AI never generates, estimates, or derives any number that reaches a user.**

Every rand amount shown to a user must be traceable to one of exactly two sources:
1. A number extracted verbatim from the uploaded bill PDF
2. A number read verbatim from a tariff JSON file in `/lib/tariff/data/`

If a number cannot be traced to one of these two sources, it must not exist in any user-facing output. Not in a dispute. Not in a summary. Not in a letter. Nowhere.

---

## The Verification Pipeline

### Step 1 — Extract from bill (no interpretation)
Parse the bill line item as raw text. Extract:
- `label`: the exact string on the bill (e.g. `"Electricity Home User Charge - 05.2023 (PREPAID 4907315610)"`)
- `raw_amount`: the final rand value as printed (e.g. `233.72`)
- `multiplier`: if the bill shows `R 116.86 x 2`, extract `multiplier = 2`, `unit_amount = 116.86`
- `billing_date`: date of the bill
- `municipality`: from bill header

**If any of these cannot be extracted with certainty → stop. Return UNKNOWN. Do not guess.**

### Step 2 — Derive the comparable amount
```
comparable_amount = raw_amount / multiplier
// e.g. 233.72 / 2 = 116.86
```
The multiplier handles bi-monthly billing cycles where a fixed charge appears doubled. This is the ONLY arithmetic operation permitted in the verification path. It is division of two extracted values, not a calculation.

### Step 3 — Load approved rate from JSON
```typescript
const tariff = loadTariff(municipality, billingDate)
const approvedRate = tariff.electricity.home_user.fixed_charge_incl_vat
// e.g. 116.86
```
If the tariff file does not exist, or the field is `null`, or `confidence === 'UNVERIFIED'` → **return UNKNOWN immediately. Stop.**

### Step 4 — Compare
```typescript
const delta = comparable_amount - approvedRate
const withinTolerance = Math.abs(delta) <= 0.10

if (withinTolerance) return PASS
if (!withinTolerance && tariff.confidence !== 'UNVERIFIED') return FAIL(delta)
return UNKNOWN
```

### Step 5 — FAIL output
A FAIL result contains exactly these fields — all sourced from the bill or JSON, none generated:
```typescript
{
  result: 'FAIL',
  billed_amount: comparable_amount,    // from bill
  approved_amount: approvedRate,       // from JSON
  delta: delta,                        // arithmetic of the above two
  tariff_year: tariff.tariff_year,     // from JSON
  source_document: tariff.gazette_source,  // from JSON
  source_url: tariff.source_url,       // from JSON
  confidence: tariff.confidence        // from JSON
}
```

**There are no other fields. You do not add context. You do not explain the delta. You do not round differently. You do not add a note about what the customer should do. The validator returns this object and nothing else.**

---

## The Type Wall

The user-facing API type must make UNKNOWN unrepresentable:

```typescript
// Internal type — all three states exist
type VerificationResult = 
  | { result: 'PASS' }
  | { result: 'FAIL'; billed_amount: number; approved_amount: number; delta: number; tariff_year: string; source_document: string; source_url: string; confidence: 'CONFIRMED' | 'BILL-VERIFIED' }
  | { result: 'UNKNOWN' }

// User-facing type — UNKNOWN does not exist
type UserFacingVerification = Extract<VerificationResult, { result: 'PASS' | 'FAIL' }>

// Filter at the API boundary — compiler enforces this
function toUserFacing(v: VerificationResult): UserFacingVerification | null {
  if (v.result === 'UNKNOWN') return null  // never reaches response
  return v
}
```

If you find yourself wanting to return something to the user when confidence is SECONDARY, UNVERIFIED, or result is UNKNOWN — **return null**. Not a message. Not a warning. Not "we couldn't verify this." Silence.

---

## Where AI Is Permitted

AI (Claude) may only be invoked AFTER the verification pipeline has completed and AFTER the user has chosen to dispute. It receives a locked payload:

```typescript
const disputeInput = {
  customer_name: extractedFromBill,
  account_number: extractedFromBill,
  billing_month: extractedFromBill,
  charge_description: extractedFromBill,
  billed_amount: verification.billed_amount,    // from validator, not AI
  approved_amount: verification.approved_amount, // from validator, not AI
  delta: verification.delta,                     // from validator, not AI
  source_document: verification.source_document, // from JSON
  source_url: verification.source_url            // from JSON
}
```

The AI prompt is:
```
You are drafting a formal municipal billing dispute letter for a South African 
resident. Use ONLY the values provided below. Do not calculate, estimate, or 
derive any amounts. Do not add claims not supported by the data below.

Customer: {customer_name}
Account: {account_number}
Bill month: {billing_month}
Charge disputed: {charge_description}
Amount billed: R{billed_amount}
Approved tariff rate: R{approved_amount}
Overcharge amount: R{delta}
Legal basis: {source_document}
Source: {source_url}

Write a formal dispute letter referencing the above. Do not invent any 
additional amounts, dates, or legal references beyond what is provided.
```

**The AI writes prose. The numbers are already in the prompt. The AI cannot change them.**

---

## Hallucination Attack Surfaces — Explicitly Blocked

| Attack Surface | Rule |
|---|---|
| AI derives overcharge amount | BLOCKED — delta comes from validator only |
| AI estimates what rate "should be" | BLOCKED — approved rate comes from JSON only |
| AI rounds amounts differently | BLOCKED — amounts are strings from bill/JSON, not floats recalculated |
| AI invents a legal reference | BLOCKED — source_document and source_url come from JSON only |
| AI processes a bill with UNKNOWN result | BLOCKED — null returned, no AI call made |
| AI processes a bill with SECONDARY confidence | BLOCKED — SECONDARY triggers UNKNOWN in validator |
| Bi-monthly billing creates false FAIL | BLOCKED — multiplier division applied before comparison |
| Stale tariff year (July 1 rollover) | BLOCKED — startup check fails loud if current year JSON missing |
| Legal hold municipality (CoJ/Ekurhuleni/Msunduzi/Madibeng 2024/25) | BLOCKED — LEGAL_ALERT JSON triggers UNKNOWN |

---

## Startup Validation

On app startup, run:

```typescript
const currentTariffYear = getCurrentTariffYear() // e.g. "2025/26"
const municipalities = ['CoCT', 'CoJ', 'CoT', 'CoE', 'ETH', 'NMBM', 'BCM', 'MMM']

for (const m of municipalities) {
  const hasData = tariffDB.hasData(m, currentTariffYear)
  if (!hasData) {
    console.error(`TARIFF_DATA_STALE: No data for ${m} ${currentTariffYear}`)
    // Block all verifications for this municipality until resolved
    // Do NOT silently return PASS — that would be worse than UNKNOWN
  }
}
```

Silent staleness is the failure mode. A stale tariff that returns PASS on everything is an undetected bug. A stale tariff that blocks with UNKNOWN is a known limitation. Always prefer known limitation over undetected bug.

---

## The Test That Catches Everything

After implementation, run the 36-bill test suite (ISU109010758573.zip — all CoCT, account 223740405). Expected results:

| Check | Expected | Rationale |
|---|---|---|
| Electricity HU charge, all 36 bills | PASS | Rates confirmed correct against official gazette |
| Water fixed charge, all pre-Jul 2025 bills | PASS | 20mm rates confirmed from bills |
| Water fixed charge, all post-Jul 2025 bills | PASS | R4.5M–5M band confirmed |
| Jul 2025 transition bill (two water charges) | PASS + PASS | Both line items verified independently |
| Sep 2025 bill — returned debit charges | UNKNOWN | Not in tariff DB — suppress silently |
| Total recoverable on this account | R0 | These bills are correctly charged |

If any of the PASS results become FAIL, the bug is in the multiplier extraction or the tariff year boundary logic. Check those two things first.

If the Sep 2025 returned debit charges surface to the user as anything other than silence, the UNKNOWN wall has a leak. Fix that before shipping.

---

## One Sentence Summary

**The validator does arithmetic on bill extracts and JSON lookups. AI writes letters from locked inputs. The two never swap roles.**
