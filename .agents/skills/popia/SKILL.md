---
name: popia-compliance
description: POPIA compliance patterns for Billdog. Legal Agent and UI Agent MUST read this before building any data collection, consent, privacy, or compliance feature.
---

# POPIA Compliance — Billdog

> **Consumed by:** Legal Agent (compliance pages, consent flow), UI Agent (privacy policy, consent UI, cookie banner, account deletion, data export)
> **Project:** Billdog — SA municipal billing dispute platform
> **Legal basis:** Protection of Personal Information Act (No. 4 of 2013)
> **Regulator:** Information Regulator South Africa — inforegulator.org.za
> **Penalty:** Fines up to R10 million and/or imprisonment up to 10 years
> **Rule:** Users trust us with their bills, addresses, and account numbers. POPIA compliance is both a legal obligation and our strongest trust signal.

---

## PART 1: POPIA Fundamentals

### What POPIA Is
The Protection of Personal Information Act (No. 4 of 2013) is South Africa's primary data privacy law. It regulates how organisations collect, process, store, and share personal information.

- **Enforced by:** Information Regulator South Africa
- **Website:** [inforegulator.org.za](https://inforegulator.org.za)
- **Effective date:** 1 July 2021 (grace period ended 30 June 2022)
- **Non-compliance penalties:** Fines up to R10 million and/or imprisonment up to 10 years

### Eight Conditions for Lawful Processing

| # | Condition | Billdog Application |
|---|---|---|
| 1 | **Accountability** | Billdog is the Responsible Party. We are accountable for all processing. |
| 2 | **Processing limitation** | Only collect what is needed for dispute services. No excess data. |
| 3 | **Purpose specification** | Tell users exactly why we collect each data point. |
| 4 | **Further processing limitation** | Never use data beyond stated purpose. No selling, no profiling. |
| 5 | **Information quality** | Keep data accurate and current. Users can correct at any time. |
| 6 | **Openness** | Be transparent about all processing. Privacy policy + POPIA page. |
| 7 | **Security safeguards** | Protect data with RLS, encryption, signed URLs, private storage. |
| 8 | **Data subject participation** | Users can access, correct, export, and delete their data. |

---

## PART 2: Billdog Data Inventory

### Personal Information Collected

| Data Point | Lawful Basis | Minimum Necessary? |
|---|---|---|
| Full name | Contract — required for dispute letter | ✅ Yes |
| Email address | Contract — account management + notifications | ✅ Yes |
| Phone number | Consent — optional support contact | Optional |
| Property address | Contract — required for dispute letter | ✅ Yes |
| Municipal account number | Contract — required for dispute | ✅ Yes |
| Bill documents (PDF/photos) | Contract — required for analysis | ✅ Yes |
| Payment card token | Contract — required for success fee | ✅ Yes |
| IP address | Legitimate interest — security logging | ✅ Yes |
| Usage data | Legitimate interest — service improvement | Aggregated only |

### Special Personal Information
POPIA gives **extra protection** to certain categories:

| Category | Does Billdog Collect? | Notes |
|---|---|---|
| Financial information | ✅ Yes — bill amounts, charges | Handle with extra care |
| Religious beliefs | ❌ No | Never collect |
| Race or ethnicity | ❌ No | Never collect |
| Health information | ❌ No | Never collect |
| Biometric data | ❌ No | Never collect |
| Criminal records | ❌ No | Never collect |

### Data Processors (Third Parties)

Each processor handles user data on Billdog's behalf. Each requires a **Data Processing Agreement (DPA)**.

| Processor | Data Accessed | Purpose |
|---|---|---|
| **Anthropic** (Claude API) | Bill text, account number, municipality | AI bill analysis + letter generation |
| **Supabase** | All user data + files | Database, auth, file storage |
| **Resend** | Email address, user name | Email notifications + letter delivery |
| **PayFast** | Payment card token, amounts | Success fee processing |
| **Voyage AI** | Bill text chunks (anonymised) | Legislation embeddings |
| **Railway** | Application hosting | Infrastructure |

**Rule:** Before launch, Billdog must have a signed DPA or Terms of Service covering data processing with each of these providers.

---

## PART 3: Consent Requirements

### Consent Must Be

| Attribute | Requirement | Implementation |
|---|---|---|
| Voluntary | Not forced as condition of service | Core consent required, optional items separate |
| Specific | For each purpose separately | Separate checkboxes per purpose |
| Informed | User understands what they consent to | Plain English description next to each checkbox |
| Unambiguous | Clear affirmative action | Unchecked checkbox — user must actively tick |
| Withdrawable | User can withdraw at any time | Settings → Privacy → Withdraw Consent |

### Consent Required at Signup

```html
<form>
  <!-- REQUIRED CONSENT -->
  <label class="flex items-start gap-3 min-h-[44px]">
    <input type="checkbox" required class="mt-1" />
    <span class="text-sm text-grey">
      I consent to Billdog processing my personal information to analyse 
      my municipal bills and generate dispute letters on my behalf. 
      This includes sending my bill text to AI services (Anthropic) for analysis.
      <a href="/privacy" class="text-blue underline">Read our Privacy Policy</a>
    </span>
  </label>

  <!-- REQUIRED CONSENT -->
  <label class="flex items-start gap-3 min-h-[44px]">
    <input type="checkbox" required class="mt-1" />
    <span class="text-sm text-grey">
      I agree to the 20% success fee on funds recovered through disputed charges, 
      as described in our <a href="/terms" class="text-blue underline">Terms of Service</a>.
    </span>
  </label>

  <!-- OPTIONAL CONSENT -->
  <label class="flex items-start gap-3 min-h-[44px]">
    <input type="checkbox" class="mt-1" />
    <span class="text-sm text-grey">
      I'd like to receive email updates about my case progress and tips 
      on managing municipal bills. (Optional — you can unsubscribe any time.)
    </span>
  </label>
</form>
```

### Rules
- **Checkboxes unchecked by default** — never pre-checked.
- **Cannot create account without required consent.**
- **Optional consent is truly optional** — service works without it.

### Consent NOT Required (Legitimate Interest)
- Security logging and fraud prevention
- Aggregate, anonymised analytics
- Essential cookies for session management

### Database Schema
```sql
-- Add to profiles table via migration
ALTER TABLE profiles ADD COLUMN consent_given boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN consent_timestamp timestamptz;
ALTER TABLE profiles ADD COLUMN consent_version text; -- e.g. "v1.0-2026-03-27"
ALTER TABLE profiles ADD COLUMN marketing_consent boolean DEFAULT false;
```

---

## PART 4: Data Subject Rights

### Right to Access
- User can request **all data** Billdog holds about them.
- Must respond within **30 days**.
- Implement: **Settings → Download My Data**
- Export includes: profile, all cases, all case events, consent record, bill file list.

```typescript
// API route: GET /api/user/export
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const [profile, cases, events] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('cases').select('*').eq('user_id', user.id),
    supabase.from('case_events').select('*, cases!inner(user_id)')
      .eq('cases.user_id', user.id),
  ]);

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    profile: profile.data,
    cases: cases.data,
    events: events.data,
  });
}
```

### Right to Correction
- User can update their profile at any time in **Settings**.
- Corrections reflected **immediately**.
- No approval process needed.

### Right to Deletion (Right to Be Forgotten)
| Data | Action | Timeline |
|---|---|---|
| Profile | Soft delete immediately, hard delete after 30 days | 30 days |
| Cases | Soft delete with profile | 30 days |
| Case events | Delete with cases | 30 days |
| Bill files | Delete from Supabase Storage | 30 days |
| Transaction records | **Retain** — SARS requirement | 7 years |
| Anonymise if retention required | Replace PII with "[DELETED USER]" | Immediate |

**Process:** Settings → Delete Account → confirm dialog → soft delete → hard delete after 30 days (cool-off period).

### Right to Object
- User can **object to marketing** at any time — must honour immediately.
- Cannot object to processing **necessary for the service** (bill analysis, letter generation).

### Right to Data Portability
- User can export data in **machine-readable JSON format**.
- Accessible via Settings → Download My Data.

---

## PART 5: Privacy Policy Page

### URL: `/privacy`

Must be written in **plain English** — no legal jargon that obscures meaning.

### Required Sections

1. **Who we are** — Responsible Party details, registered name, contact info
2. **What information we collect and why** — full data inventory table from Part 2
3. **How we use your information** — purpose per data point
4. **Who we share your information with** — processor list from Part 2
5. **How we protect your information** — RLS, encrypted storage, signed URLs, HTTPS
6. **How long we keep your information** — retention periods (see below)
7. **Your rights under POPIA** — access, correction, deletion, objection, portability
8. **How to exercise your rights** — Settings page + support email
9. **How to lodge a complaint** — Information Regulator contact details
10. **Cookie policy** — essential cookies only in v1
11. **Changes to this policy** — notification via email for material changes
12. **Last updated** — date and version number (e.g., "v1.0 — 27 March 2026")

### Data Retention Periods

| Data | Retention | Trigger |
|---|---|---|
| Bill documents | **90 days** after case closed | Automated deletion job |
| Case records | **3 years** after case closed | Prescription period |
| Transaction records | **7 years** | SARS tax requirement |
| Account data | **30 days** after deletion request | Cool-off period |
| Security logs | **12 months** | Rolling retention |

### Information Regulator Contact Details
Include on privacy policy and POPIA page:
```
Information Regulator (South Africa)
Website: inforegulator.org.za
Email: inforeg@justice.gov.za
Telephone: 010 023 5200
Physical: JD House, 27 Stiemens Street, Braamfontein, Johannesburg
```

---

## PART 6: POPIA Compliance Page

### URL: `/popia`

Separate from the privacy policy — more technical and detailed.

### Required Sections

1. **POPIA compliance statement** — "Billdog is committed to full compliance with POPIA..."
2. **Information Officer** — Name, contact details (required by POPIA to designate one)
3. **Data processing register summary** — What data, why, retention, processors
4. **List of data processors** — Table with processor name, data category, purpose
5. **Security measures** — High-level description (not technical detail that aids attackers)
6. **How to submit a data subject access request** — Step-by-step via Settings or email
7. **How to submit a deletion request** — Step-by-step via Settings or email
8. **PAIA manual reference** — Link to Promotion of Access to Information Act manual
9. **Date of last compliance review**

### Information Officer Registration
POPIA requires every Responsible Party to register an Information Officer with the Information Regulator:
- **Register at:** [inforegulator.org.za/registration](https://inforegulator.org.za/registration)
- **Must register before launch**
- **Display on POPIA page** — name and contact details

---

## PART 7: Technical Compliance

### Consent Capture in Signup
```typescript
// On signup form submission
const { error } = await supabase.from('profiles').upsert({
  id: user.id,
  full_name: form.fullName,
  email: form.email,
  consent_given: true,
  consent_timestamp: new Date().toISOString(),
  consent_version: 'v1.0-2026-03-27',
  marketing_consent: form.marketingConsent ?? false,
});
```

**Rule:** Do not allow account creation without `consent_given = true`.

### Data Minimisation in API Calls
```typescript
// ❌ BANNED — sending unnecessary PII to Claude
const prompt = `User: ${user.full_name} (${user.email}), phone: ${user.phone}
                Bill text: ${billText}`;

// ✅ REQUIRED — minimum necessary data
const prompt = `Municipality: ${municipality}
                Account: ${accountNumber}
                Bill text: ${billText}`;
// Name, email, phone are NOT needed for analysis
```

### Bill File Security
- **Private** Supabase Storage bucket — never public URLs
- **Signed URLs** with 1-hour expiry
- **Automated deletion** — bill files deleted 90 days after case closure
- **File path isolation** — `{userId}/{caseId}/{timestamp}.ext`

### Breach Notification
| Step | Timeline | Action |
|---|---|---|
| 1. Detect breach | Immediate | Log in incident register |
| 2. Assess severity | Within 24 hours | Determine scope and affected users |
| 3. Notify Information Regulator | Within **72 hours** | Submit breach notification form |
| 4. Notify affected users | As soon as reasonably possible | Email with: what happened, what data, what to do |
| 5. Document and remediate | Ongoing | Update FAULT_LOG.md, fix root cause |

### Cookie Compliance
- **v1: essential cookies only** — session management via Supabase auth
- Essential cookies do **not require consent** — they are necessary for the service
- **Cookie banner** still required — inform users about essential cookies
- If analytics added in v2 → consent required for non-essential cookies

---

## PART 8: Pre-Launch Compliance Checklist

- [ ] Information Officer registered with Information Regulator
- [ ] Privacy policy published at `/privacy`
- [ ] POPIA compliance page published at `/popia`
- [ ] Terms of Service published at `/terms`
- [ ] Consent checkboxes on signup (unchecked by default)
- [ ] Consent stored with timestamp and version in `profiles` table
- [ ] Data Processing Agreements with: Anthropic, Supabase, Resend, PayFast, Voyage AI, Railway
- [ ] Account deletion flow built and tested (Settings → Delete Account)
- [ ] Data export flow built and tested (Settings → Download My Data)
- [ ] Bill files in private storage bucket with signed URLs
- [ ] Automated file deletion job scheduled (90 days after case close)
- [ ] Cookie banner on site (essential cookies notice)
- [ ] No unnecessary PII sent to third-party APIs — verified per API call
- [ ] Breach notification procedure documented
- [ ] PAIA manual prepared and referenced on POPIA page
- [ ] Retention periods implemented and documented
