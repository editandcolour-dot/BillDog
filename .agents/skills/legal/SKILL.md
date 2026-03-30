---
name: legal
description: POPIA compliance, privacy policy, terms of service, and data subject rights for Billdog. ALL agents MUST read this before building any legal page, consent flow, or data handling feature.
---

# POPIA Compliance Skill

> **Consumed by:** All agents building legal pages, consent flows, data export/deletion features
> **Project:** Billdog — SA municipal billing dispute platform
> **Legal basis:** Protection of Personal Information Act (No. 4 of 2013)
> **Regulator:** Information Regulator South Africa — inforegulator.org.za
> **Rule:** Every legal page must be in plain English. Reference POPIA, not GDPR. SA context always.

---

## South African Legal Requirements

### POPIA (Protection of Personal Information Act No. 4 of 2013)

POPIA is South Africa's primary data privacy law. Billdog must comply fully — fines up to R10 million and/or imprisonment up to 10 years for non-compliance.

---

## Mandatory User Rights to Implement

Every Billdog user has the following rights under POPIA:

| Right | Description | Implementation |
|---|---|---|
| **Right to access** | User can request all data Billdog holds about them | Settings → Download My Data (JSON export) |
| **Right to correct** | User can update any personal information | Settings → Edit Profile (already built) |
| **Right to delete** | User can request deletion of all personal data | Settings → Delete Account (hard delete) |
| **Right to object** | User can object to processing for marketing | Settings → Unsubscribe from marketing |
| **Right to data portability** | User can receive data in machine-readable format | Same as access — JSON export |

---

## Mandatory Documents

| Document | URL | Status |
|---|---|---|
| Privacy Policy | `/privacy` | To be built |
| Terms of Service | `/terms` | To be built |
| POPIA consent on signup | Signup form | Already built |

---

## Privacy Policy Must Include

The privacy policy at `/privacy` must contain all of the following sections:

1. **Identity of responsible party** — Billdog (Pty) Ltd
2. **What personal information is collected** — full data inventory (name, email, phone, address, account number, bill documents, payment token, IP address, usage data)
3. **Purpose of collection** — dispute municipal billing errors on behalf of the user
4. **Who data is shared with** — list ALL processors (see Data Processors section below)
5. **How long data is retained** — per-category retention periods (see Data Retention section below)
6. **User rights and how to exercise them** — access, correction, deletion, objection, portability
7. **Information Officer details** — name, email (privacy@billdog.co.za)
8. **Data breach notification process** — 72-hour notification to Information Regulator, user notification as soon as reasonably possible
9. **Cookie policy** — essential cookies only (session management), no tracking cookies
10. **How to lodge a complaint** — Information Regulator contact details
11. **Changes to this policy** — notification via email for material changes
12. **Effective date and version number** — e.g. "v1.0 — 30 March 2026"

---

## Terms of Service Must Include

The terms of service at `/terms` must contain all of the following:

1. **Service description** — AI-powered municipal billing dispute platform; analyses bills, generates dispute letters, sends to municipalities on user's behalf
2. **Success fee model** — 20% of funds recovered; charged only after user confirms resolution
3. **No upfront charges** — user pays nothing unless money is recovered
4. **User obligations** — provide accurate information, upload genuine bills, respond to municipality communications
5. **Billdog liability limitations** — not a law firm, not legal advice, no guarantee of outcomes, AI-powered analysis with human-reviewed letters
6. **Intellectual property** — dispute letter templates and AI analysis methodology belong to Billdog; user retains ownership of their uploaded documents
7. **Termination** — user can delete account at any time; Billdog can suspend accounts for abuse or fraud
8. **Governing law** — Republic of South Africa
9. **Dispute resolution** — South African courts with jurisdiction
10. **AI disclosure** — transparent about AI usage, model (Claude by Anthropic), what data is sent to AI
11. **Payment terms** — PayFast card-on-file, charged only on confirmed resolution, no recurring billing
12. **Age restriction** — 18+ only (or legal capacity to enter contracts in SA)

---

## Data Processors to Disclose

Every third party that handles user data must be disclosed in the privacy policy:

| Processor | Data Accessed | Purpose | Location |
|---|---|---|---|
| **Anthropic** (Claude AI) | Bill text, account number, municipality | AI bill analysis and dispute letter generation | US |
| **Supabase** | All user data and files | Database, authentication, file storage | EU-West-1 |
| **Resend** | Email address, user name | Email notifications and letter delivery | US |
| **PayFast** | Payment card token, amounts | Success fee processing | South Africa |
| **Voyage AI** | Bill text chunks (anonymised) | Legislation search embeddings | US |
| **Railway** | Application hosting | Infrastructure and deployment | US-East |
| **Cloudflare** | DNS queries, IP addresses | DNS resolution and security | Global |

**Rule:** Before launch, Billdog must have a signed DPA or Terms of Service covering data processing with each of these providers.

---

## Data Retention Policy

| Data Category | Retention Period | Trigger for Deletion |
|---|---|---|
| Active cases | Retained while account is active | Account deletion |
| Resolved cases | 5 years after resolution | Automated after 5 years (legal records) |
| Bill documents | Deleted after case closes | Automated on case closure |
| Profile data | Deleted on account deletion | User-initiated deletion |
| Payment tokens | Deleted on account deletion | User-initiated deletion |
| Transaction records (fee_charged) | 7 years | SARS tax requirement |
| Security logs | 12 months | Rolling retention |

---

## Account Deletion Requirements

When a user requests account deletion, Billdog MUST:

1. **Delete ALL personal data** — full_name, email, phone, address, account_number, municipality
2. **Delete ALL uploaded documents** — remove bill files from Supabase Storage
3. **Delete ALL case records** — cases, case_events, letter content
4. **Retain transaction records** — fee_charged amounts only (anonymised, SARS requirement)
5. **Confirm deletion to user via email** — send confirmation email before deleting email address
6. **Make deletion irreversible** — no "soft delete" with recovery option
7. **Complete within reasonable time** — immediate for profile and files, batch job for storage cleanup
8. **Sign user out** — destroy session immediately after deletion

---

## Information Officer

POPIA Section 55 requires every Responsible Party to designate an Information Officer:

| Field | Value |
|---|---|
| Role | Information Officer |
| Contact email | privacy@billdog.co.za |
| Registration | Must register with Information Regulator before launch |
| Registration URL | https://inforegulator.org.za/registration |
| Display | Must be shown on `/popia` page |

### Information Regulator Contact Details

Include on privacy policy and POPIA pages:

```
Information Regulator (South Africa)
Website: inforegulator.org.za
Email: inforeg@justice.gov.za
Telephone: 010 023 5200
Physical: JD House, 27 Stiemens Street, Braamfontein, Johannesburg
```

---

## Tone for Legal Pages

| Principle | Example ✅ | Anti-example ❌ |
|---|---|---|
| **Plain English** | "We collect your name and email to create your account." | "The Data Subject hereby consents to the processing of personal information as defined in..." |
| **SA context** | "Under POPIA, you have the right to..." | "Under GDPR Article 17, you have the right to..." |
| **Honest about AI** | "We use AI (Claude by Anthropic) to analyse your bill for errors." | "Our proprietary algorithms..." |
| **Clear about data flow** | "Your bill text is sent to Anthropic's servers in the US for analysis." | "Data may be processed by third parties." |
| **No false promises** | "We'll fight for a correction, but outcomes depend on your municipality." | "Guaranteed results." |

---

## Design Requirements

### Page Layout
- **Public pages** — no auth required, accessible to everyone
- **Route group:** `app/(public)/` — `/privacy`, `/terms`, `/popia`
- **Design system:** Navy headings (Bebas Neue), DM Sans body, off-white/white alternating sections
- **Mobile responsive** — must work at 320px minimum
- **Max content width:** 1200px, centred, 6% horizontal padding

### Required Elements
- **Footer links** from all pages to Privacy, Terms, POPIA
- **Version and date** visible at top and bottom of each legal page
- **Table of contents** on longer pages (privacy, terms)
- **Section labels** in orange uppercase (standard Billdog pattern)
- **Back to top** link on long pages

### SEO
- Each page must have static `metadata` (title, description, openGraph)
- Semantic HTML: `<article>`, `<section>`, proper heading hierarchy (`<h1>` once per page)

---

## Pre-Launch Compliance Checklist

- [ ] Privacy policy published at `/privacy`
- [ ] Terms of Service published at `/terms`
- [ ] POPIA compliance page published at `/popia`
- [ ] Information Officer registered with Information Regulator
- [ ] Consent checkboxes on signup (unchecked by default) — already built
- [ ] Consent stored with timestamp and version — already built
- [ ] Data export API built (`/api/user/export`)
- [ ] Account deletion API built (`/api/user/delete`)
- [ ] Cookie banner informing about essential cookies
- [ ] No unnecessary PII sent to third-party APIs — verified
- [ ] Data Processing Agreements with all processors
- [ ] Footer links to Privacy, Terms, POPIA on all pages — already built
