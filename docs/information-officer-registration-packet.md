# Information Officer Registration — Submission Packet

**Purpose:** Pre-filled packet for Jason Thwaits to submit personally to
the Information Regulator's online portal. **Billdog AI agents will not
and cannot submit this on your behalf** — POPIA s.55 places personal
statutory accountability on the Information Officer, and the IR's
portal requires identity verification of the actual person registering.
This file does the paperwork; you click the submit button.

---

## 1. Why you (the human) must submit this yourself

- The Regulator's eServices portal requires verification of the
  registering individual's SA ID and contact details.
- The registration is a sworn statement of personal accountability
  under POPIA s.55(1).
- An AI agent submitting on your behalf would (a) constitute
  impersonation of a registrable individual to a government regulator,
  and (b) put the validity of the registration at risk.

I have pre-filled every field I can verify from the codebase and your
existing communications. Fields marked **[YOU FILL IN]** require
information I do not have access to.

---

## 2. Where to register

1. Go to https://inforegulator.org.za
2. Click **eServices** → **Information Officer Registration**
3. Create a portal account if you don't already have one (uses your
   personal SA ID for verification).
4. Choose **Private Body / Juristic Person** registration.

The direct URL has changed in the past; always navigate via the IR
home page rather than a bookmarked link.

---

## 3. Pre-filled fields

### 3.1 Particulars of the responsible party (the company)

| Field | Value |
|-------|-------|
| Registered name | Billdog (Pty) Ltd |
| Trade name | Billdog |
| Type of body | Private body (juristic person, for-profit) |
| Company / Close Corporation registration number | **[YOU FILL IN — from your CIPC certificate]** |
| VAT number, if registered | **[YOU FILL IN]** |
| Sector | Technology / Consumer services |
| Province | Western Cape |
| Physical address | **[YOU FILL IN — registered office address]** |
| Postal address | Same as physical, unless different |
| Business telephone | **[YOU FILL IN]** |
| Business email | privacy@billdog.co.za |
| Website | https://billdog.co.za |

### 3.2 Particulars of the Information Officer

| Field | Value |
|-------|-------|
| Full names | Jason Thwaits |
| Title in the company | Director |
| SA ID number | **[YOU FILL IN]** |
| Personal email (for verification) | **[YOU FILL IN — must match your portal account]** |
| Work email | privacy@billdog.co.za |
| Work telephone | **[YOU FILL IN]** |
| Mobile | **[YOU FILL IN]** |
| Postal address | Same as company unless different |

### 3.3 Particulars of the Deputy Information Officer

Recommended but **not yet appointed**. You may either:

- leave blank for now and update within 30 days of appointing one, or
- delay submission until you have appointed a deputy.

I recommend leaving blank and updating later — getting the IO
registration in place is more urgent than the deputy slot.

### 3.4 Categories of personal information processed

Tick the following on the form (these are drawn from the Privacy
Policy and the POPIA processing record in
`docs/paia-popia-manual.md`):

- [x] Personal contact details (name, email, telephone)
- [x] Identifying information (SA ID number — encrypted at rest)
- [x] Financial information (payment card via PayFast tokenisation only;
       transaction history)
- [x] Service-account information (municipal account numbers, addresses,
       bill PDFs)
- [x] Technical information (IP, device, session)

Do **not** tick: biometric, health, religion, race, criminal record,
trade-union membership, sexual orientation. We do not process any of
these.

### 3.5 Cross-border transfers

If the form asks "Do you transfer personal information outside the
Republic?" — answer **Yes** and list:

- Anthropic (USA), Resend (USA / EU), Voyage AI (USA), Railway (USA),
  Cloudflare (global), Upstash QStash (USA / EU).

Reliance: data-subject consent obtained at registration (POPIA s.72(1)(b)).

### 3.6 PAIA Manual

The IR portal may ask whether you have a PAIA Manual.
Answer **Yes** and upload `docs/paia-popia-manual.md` (export to PDF
first — Word → Print → Save as PDF works, or use any markdown-to-PDF
tool). Once Billdog publishes the manual at
`https://billdog.co.za/legal/paia`, you can supply that URL instead.

---

## 4. Supporting documents to have ready

Before you start, save these as PDFs on your desktop:

1. **PAIA Manual** — `docs/paia-popia-manual.md` (export to PDF).
2. **CIPC company registration certificate** — from your CIPC files.
3. **Your SA ID** — front and back, scanned. The portal may ask for upload.
4. **Privacy Policy** — current live version at
   `https://billdog.co.za/privacy` (you can supply the URL; saving a
   PDF is a useful belt-and-braces backup).
5. **Incident Response Runbook** — `docs/incident-response.md`
   (export to PDF; may be requested as evidence of POPIA s.19
   security safeguards).

---

## 5. Step-by-step (estimated 30–45 minutes)

1. Open https://inforegulator.org.za in a private browser window.
2. Click **eServices** → **Register**. Create a portal account using
   your personal SA ID and a personal email.
3. Verify your portal account via the OTP / email link.
4. Log in. Open **Information Officer Registration**.
5. Select **Private body** → **Juristic person**.
6. Fill out fields using **Section 3** of this packet.
7. Upload supporting documents from **Section 4**.
8. Review the summary screen carefully — printer-friendly view, save
   as PDF, store in `docs/regulator/io-submission-YYYY-MM-DD.pdf`.
9. Submit. The portal will issue a reference number — record it in
   the same folder.
10. Update `docs/paia-popia-manual.md` Part A § 1 with the registration
    confirmation reference once you receive it.

---

## 6. After submission

- The Regulator typically does not issue a "certificate" — the
  submission reference plus your portal account constitutes the
  registration.
- You become the personally-accountable Information Officer from the
  date of submission.
- Diarise the next annual review (1 June 2027 in `paia-popia-manual.md`).
- If anything in §3.1 or §3.2 changes (address, telephone, IO change),
  update the registration within 30 days.

---

## 7. Common mistakes to avoid

- **Using a generic email** for the IO portal account. Use a personal
  one tied to your SA ID. The work mailbox (`privacy@billdog.co.za`)
  goes in the IO contact details, not the portal login.
- **Skipping the PAIA Manual** upload. The form may let you proceed
  without it, but PAIA s.51 still requires you to have one.
- **Listing yourself as both IO and Deputy IO**. Leave Deputy blank
  rather than self-appointing.
- **Forgetting to update after registration**. Add the reference
  number to PAIA Manual Part A and the Privacy Policy contact
  section.
