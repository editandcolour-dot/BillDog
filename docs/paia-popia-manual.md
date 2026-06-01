# Billdog (Pty) Ltd — Combined PAIA Manual & POPIA Records of Processing

**Section 51 PAIA Manual** | **Section 17 POPIA Processing Record**
**Version:** 1.0
**Date adopted:** 1 June 2026
**Next review:** 1 June 2027

Prepared in accordance with section 51 of the Promotion of Access to
Information Act 2 of 2000 (PAIA) and section 17 of the Protection of
Personal Information Act 4 of 2013 (POPIA).

---

## PART A — PAIA MANUAL

### 1. Particulars of the head of the private body

| Item | Detail |
|------|--------|
| Name of company | Billdog (Pty) Ltd |
| Company registration number | **[to be inserted]** |
| Trade name | Billdog |
| Physical address | **[to be inserted — e.g. Cape Town, Western Cape]** |
| Postal address | Same as physical, or **[insert]** |
| Website | https://billdog.co.za |
| Telephone | **[to be inserted]** |
| Head of the body | Jason Thwaits, Director |
| Information Officer | Jason Thwaits |
| IO email | privacy@billdog.co.za |
| IO postal address | Same as company |

### 2. Section 10 PAIA Guide

The Information Regulator's Guide on how to use PAIA is available at
https://inforegulator.org.za and from the Regulator at JD House, 27
Stiemens Street, Braamfontein, Johannesburg, telephone 010 023 5200,
email inforeg@justice.gov.za.

### 3. Records held by Billdog

#### 3.1 Records automatically available

The following records are published on the Billdog website and may be
accessed without a formal PAIA request:

- Privacy Policy — https://billdog.co.za/privacy
- Terms of Service — https://billdog.co.za/terms
- This PAIA Manual — https://billdog.co.za/legal/paia

#### 3.2 Records available on request (PAIA Form 02)

| Subject | Category |
|---------|----------|
| Personal information held about the requester (user) | Personal records |
| Records of disputes lodged on the requester's behalf | Operational records |
| Records of payments made by the requester to Billdog | Financial records |
| Records of correspondence with municipalities relating to the requester's account | Operational records |

#### 3.3 Records held but not generally available

| Subject | Reason for non-disclosure |
|---------|---------------------------|
| Source code, internal infrastructure documentation | Commercial information (PAIA s.36, s.68) |
| Personal information of other data subjects | Privacy (PAIA s.34, s.63) |
| Records subject to processor confidentiality agreements (Anthropic, Supabase, Resend, PayFast, Voyage AI, Railway, Cloudflare) | Third-party commercial information (PAIA s.36) |
| Records that would prejudice the prevention or detection of municipal fraud | Law-enforcement record (PAIA s.39) |
| Internal incident response and security records | Defence, security, international relations (PAIA s.41) |

### 4. How to request access

A request must be made on **Form 02** (the prescribed PAIA request form),
available from https://inforegulator.org.za/forms.

Submit the completed form to:

- Email: privacy@billdog.co.za
- Post: [insert physical address]

### 5. Fees

Fees are as prescribed by Regulations published under PAIA. The current
schedule is published by the Information Regulator and is reviewed
annually.

| Fee | Amount |
|-----|--------|
| Request fee (where applicable) | R50.00 |
| Access fee — A4 photocopy / printout per page | R1.10 |
| Access fee — search and preparation, per hour | R30.00 |
| Deposit (where access fee likely to exceed R100) | One third of total fee |

Personal requesters seeking access to records about themselves are
exempt from the request fee but may be liable for the access fee.

### 6. Internal appeals procedure

Billdog (Pty) Ltd is a private body and is therefore not subject to the
internal appeal procedure in section 74 of PAIA. A requester whose
request is refused may either:

- apply to the Information Regulator in terms of section 77A; or
- apply to a competent court for relief in terms of section 78.

### 7. Grounds for refusal

Billdog may refuse a request under any of the mandatory or discretionary
grounds in PAIA Chapter 4, Part 3, including but not limited to:

- mandatory protection of the privacy of a third-party natural person (s.63);
- mandatory protection of commercial information of a third party (s.64);
- mandatory protection of confidential information of a third party (s.65);
- protection of safety of individuals (s.66);
- protection of records privileged from production in legal proceedings (s.67);
- protection of commercial information of the body itself (s.68);
- protection of research information (s.69).

### 8. Information that will be processed under POPIA (cross-reference)

See Part B below.

---

## PART B — POPIA SECTION 17 PROCESSING RECORD

### B.1 Responsible party

| Item | Detail |
|------|--------|
| Responsible party | Billdog (Pty) Ltd |
| Contact for data-subject requests | privacy@billdog.co.za |
| Information Officer | Jason Thwaits |

### B.2 Purpose of processing

To identify and dispute billing errors on South African municipal
utility accounts on behalf of account holders who have appointed
Billdog as their representative.

### B.3 Categories of data subjects

- Account holders of South African municipal utility accounts who have
  registered for the Billdog service.

### B.4 Categories of personal information processed

| Category | Source | Special PI? |
|----------|--------|------------|
| Name and email | Direct from data subject | No |
| Municipal account number | Direct or from uploaded bill | No |
| Physical service address | Uploaded bill | No |
| Bill PDF / image (contents) | Uploaded by data subject | No |
| SA ID number (encrypted at rest) | Direct, only when needed to lodge a dispute | Yes — identity number |
| Payment-card token | PayFast (we never see the card) | No |
| IP address, session ID, audit logs | Automatic | No |

### B.5 Recipients (operators / processors)

| Processor | Purpose | Country |
|-----------|---------|---------|
| Anthropic (Claude AI) | Bill analysis, letter generation | USA |
| Supabase | Database, authentication, storage, vault | Region-dependent |
| Resend | Transactional and dispute-letter email | USA / EU |
| PayFast | Card tokenisation, payment processing | South Africa |
| Voyage AI | Legislation search embeddings (when active) | USA |
| Railway | Application hosting | USA |
| Cloudflare | DNS, edge security | Global |
| Upstash (QStash) | Scheduled jobs | USA / EU |

### B.6 Cross-border transfers

Several processors above are located outside South Africa. Transfer is
made in reliance on the data subject's consent obtained at registration
(POPIA s.72(1)(b)) and on the processors' contractual commitments to
protect personal information.

### B.7 Retention periods

| Data | Retention |
|------|-----------|
| Active case data | While the account is active |
| Resolved case metadata | Until the data subject requests deletion or closes the account |
| Bill documents | Removed 90 days after case resolution (cron: `/api/cron/cleanup-storage`) |
| Encrypted ID numbers | Removed 30 days after case resolution (cron: `/api/cron/wipe-ids`) |
| Profile data | Deleted on account deletion |
| Payment tokens | Deleted on account deletion |
| Transaction records | 7 years (SARS) — PII stripped |
| Security / access logs | Retained for incident-response purposes only |

### B.8 Security safeguards

- Row-Level Security on every user table.
- TLS in transit; AES-256 encryption at rest (Supabase) and Vault for
  ID numbers.
- Service-role keys restricted to server-side runtime; never exposed
  to the browser.
- PayFast ITN webhook validated by IP allowlist + HMAC signature.
- QStash signature validation on scheduled-job endpoints.
- Quarterly credential rotation; documented incident response procedure
  at `docs/incident-response.md`.

### B.9 Data-subject rights

In accordance with POPIA Chapter 3, data subjects may at any time:

- request access to their personal information (s.23);
- request correction or deletion of inaccurate, irrelevant, excessive,
  out-of-date, incomplete, misleading or unlawfully obtained PI (s.24);
- object to processing (s.11(3));
- withdraw consent (s.11(2)(b)).

Requests are handled by the Information Officer at
privacy@billdog.co.za and acted upon within a reasonable time, not
exceeding 30 days.

### B.10 Complaints

A data subject who is dissatisfied with how a request has been handled
may complain to the Information Regulator:

Information Regulator (South Africa)
JD House, 27 Stiemens Street, Braamfontein, Johannesburg
Email: inforeg@justice.gov.za
Telephone: 010 023 5200
Website: https://inforegulator.org.za

---

## Approval

This Manual was approved by the head of the private body on the date
shown on the cover page.

________________________
Jason Thwaits
Director and Information Officer
Billdog (Pty) Ltd
