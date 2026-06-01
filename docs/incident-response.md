# Billdog — Personal-Data Incident Response Runbook

**Owner:** Information Officer (Jason Thwaits, privacy@billdog.co.za)
**Last reviewed:** 1 June 2026
**Statutory basis:** POPIA s.22 (notification of security compromises)

---

## 0. Scope

This runbook applies to any event in which there are reasonable grounds to
believe that the personal information of a Billdog user has been accessed
or acquired by an unauthorised person. Examples:

- Supabase row, bucket, or vault secret exfiltrated
- Resend / Anthropic / PayFast / Voyage AI processor breach affecting our data
- Lost or compromised admin credentials (Railway, Supabase, GitHub, Resend, QStash)
- Bill PDF sent to wrong recipient
- Anomalous large-scale read of cases / case_bills / profiles
- Public exposure of an internal endpoint that returned PII
- Stolen / lost staff laptop with cached service-role keys or production data

If you are uncertain whether something qualifies — **treat it as if it does**
until you can rule it out.

---

## 1. The 72-hour clock

POPIA s.22(1) requires notification "as soon as reasonably possible after
the discovery of the compromise". The Information Regulator interprets this
as 72 hours from the moment a reasonable belief is formed.

> Start a wall-clock timer the moment a credible report reaches the
> Information Officer. The timer does **not** reset when you escalate.

---

## 2. Immediate actions (first 60 minutes)

| # | Action | Owner |
|---|--------|-------|
| 1 | Open an incident channel; assign an incident commander | IO |
| 2 | Snapshot Supabase logs, Railway logs, Cloudflare logs to a private bucket | IC |
| 3 | Rotate any credential plausibly involved (service role keys, PayFast token, Resend API key, QStash signing keys, Supabase Vault keys) | IC |
| 4 | If credentials are suspected leaked publicly, revoke them at source **before** rotation, not after | IC |
| 5 | Lock down: temporarily disable signups; pause cron jobs (`/api/cron/*`) | IC |
| 6 | Begin a written timeline log; every action, decision, and finding gets a timestamp | IC |
| 7 | Confirm whether personal information was actually accessed (not just exposed); preserve evidence | IO |

Do **not** publicly announce the incident in this hour. Premature notice
without facts is worse than a short delay.

---

## 3. Triage (first 24 hours)

Decide:

1. **What categories of personal information were affected?**
   (POPIA distinguishes between general PI and special/children's PI.)
2. **How many data subjects are affected?**
3. **Is there a reasonable belief that the information has been or will be
   accessed by an unauthorised person?**
4. **What is the likely harm?** (Identity theft, fraud, account takeover,
   reputational damage, financial loss.)

If steps 1–3 yield a "yes" on POPIA s.22's trigger, prepare both the
Regulator notification and the data-subject notification in parallel.

---

## 4. Notifying the Information Regulator (within 72 hours)

**Channel:** email to `inforeg@justice.gov.za` with the subject line
`POPIA s.22 Security Compromise Notification — Billdog (Pty) Ltd`.

Attach the completed notification (template below). The Regulator's
current online portal form may be used in addition to, not instead of,
the email — keep written evidence of delivery.

### Template — Regulator letter

```
[Date]

The Information Regulator
JD House, 27 Stiemens Street
Braamfontein, Johannesburg

By email: inforeg@justice.gov.za

POPIA Section 22 — Notification of Security Compromise
Responsible Party: Billdog (Pty) Ltd  (Reg. no. [______])
Information Officer: Jason Thwaits, privacy@billdog.co.za

1. Description of the compromise
   [Plain-language description of what happened, when it was discovered,
   and how.]

2. Possible consequences for data subjects
   [Identity theft risk / financial fraud risk / etc.]

3. Categories and approximate number of data subjects
   [e.g., approximately N users; categories: name, email, municipal
   account number, SA ID (encrypted), bill PDF.]

4. Measures the responsible party intends to take or has taken
   [Credential rotation, patch deployed, processor terminated, etc.]

5. Recommendations to data subjects
   [What we are advising affected users to do.]

6. Whether the responsible party has notified data subjects
   [Yes / In progress, date.]

Information Officer signature:
________________________  Jason Thwaits
```

---

## 5. Notifying affected users (in parallel)

**Channel:** email via Resend, from `privacy@billdog.co.za`, plain text
where possible (high deliverability, low spam risk).

### Template — user email

```
Subject: Important security notice about your Billdog account

Hi [first name],

We are writing to let you know that on [date] we discovered that
[plain-language description of the incident and the data involved].

What this means for you
- [Specific risks, e.g. "your municipal account number was exposed";
   "your password was not affected because we don't store passwords
   directly".]

What we have done
- [Credential rotation, patches, processor changes, etc.]

What we recommend you do
- [Specific actions, e.g. "change your municipality online-account
   password", "monitor your municipal account for unfamiliar charges".]

We have notified the Information Regulator of South Africa in accordance
with section 22 of POPIA.

We are sorry this happened. If you have questions, reply to this email
or contact our Information Officer at privacy@billdog.co.za.

Jason Thwaits
Information Officer, Billdog (Pty) Ltd
```

---

## 6. Containment and remediation (Day 1 – Day 7)

- Patch the underlying vulnerability; document the root cause in
  `AGENT_BRAIN/FAULT_LOG.md` and `AGENT_BRAIN/PROJECT_MEMORY.md`.
- If a third-party processor was the source, retain their breach
  notification, ask for their forensic report, and assess whether to
  continue using them.
- Re-enable signups and cron jobs only once the IO is satisfied the
  compromise is closed.
- Run an internal credential-rotation pass even if the original incident
  is not traced to credential leak — assume blast radius is wider than
  proven.

---

## 7. Post-incident review (Day 7 – Day 30)

Within 30 days of containment, the IO must produce a short post-mortem:

1. Timeline (with timestamps).
2. Root cause.
3. What detection mechanism caught (or failed to catch) the incident.
4. What permanent change has been made to prevent recurrence.
5. Confirmation that the Regulator's response (if any) has been actioned.

The post-mortem lives at `AGENT_BRAIN/incidents/YYYY-MM-DD-<slug>.md`.

---

## 8. Decision tree — do I notify?

```
Is personal information involved?  ── no ──> Not a POPIA s.22 incident.
                                              Document and close.
       │ yes
       ▼
Is there reasonable belief that an
unauthorised person accessed it?  ── no ──> Not a notifiable compromise.
                                              Document and close.
       │ yes
       ▼
NOTIFY: Information Regulator (within 72 hours)
       + affected data subjects (as soon as reasonably possible).
```

When uncertain, default to notifying.

---

## 9. Contact log (keep current)

| Role | Name | Email | Mobile |
|------|------|-------|--------|
| Information Officer | Jason Thwaits | privacy@billdog.co.za | [____] |
| Deputy IO | _vacant_ | — | — |
| Lead engineer on call | _rotation_ | — | — |
| Supabase support | — | support@supabase.com | — |
| Resend support | — | support@resend.com | — |
| Anthropic trust & safety | — | privacy@anthropic.com | — |

Update at least quarterly.
