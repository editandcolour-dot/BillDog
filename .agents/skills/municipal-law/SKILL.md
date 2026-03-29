---
name: municipal-law
description: South African municipal billing dispute law for Billdog. AI Agent and Legal Agent MUST read this before generating any dispute letter or legal reference.
---

# Municipal Billing Law — South Africa

> **Consumed by:** AI Agent (letter generation), Legal Agent
> **Project:** Billdog — SA municipal billing dispute platform
> **Jurisdiction:** South Africa — all 9 provinces, 8 metros in v1
> **Rule:** Every dispute letter must be legally accurate, correctly cited, and procedurally unassailable. Municipalities dismiss letters on technicalities. We don't give them the opportunity.

---

## 1. Municipal Systems Act (No. 32 of 2000) — Primary Weapon

This is Billdog's core legislation. Every dispute letter must reference it.

### Section 95 — Customer Care Obligations

The municipality **must**:
- Provide **accurate bills** to every consumer
- Provide **accessible dispute mechanisms** — cannot make disputing unreasonably difficult
- Respond to queries **promptly** — no indefinite delays
- Ensure their billing system is **reasonably accurate**

**Use in letters:** When the municipality has failed to provide a clear or accurate bill, or when they refuse to engage with the dispute.

### Section 102(1) — The Dispute Right

> "A person liable for the payment of any amount arising from the provision of a municipal service may dispute any account or decision of a municipality by serving a written objection on the municipal manager."

**Key elements:**
- Every consumer has the **right** to dispute — not a privilege, a right
- Must be **in writing** — verbal complaints are not formal disputes
- Must be served on the **municipal manager** — not the call centre, not a cashier
- Must specify the **disputed amount and reason** — vague objections can be dismissed
- Municipality must **investigate and respond** — they cannot ignore a formal dispute

### Section 102(2) — The Protection Clause

> "The municipality may not disconnect or discontinue the provision of a municipal service while a dispute is under investigation."

**This is the most important clause in our arsenal.**

- Municipality **CANNOT** cut water, electricity, or refuse collection during an active dispute
- The dispute is "active" from the moment the formal letter is served
- **Exception:** The consumer must continue paying the **undisputed portion** of the account
- If they disconnect during a dispute: the disconnection is **unlawful**

**Rule:** Every single dispute letter must cite Section 102(2). No exceptions.

---

## 2. Onus of Proof — The Municipality Must Prove It

### Gallagher Estates v City of Johannesburg (2016)

**Facts:** Property owner disputed the water bill. Municipality claimed the meter readings were correct.

**Held (High Court):**
- The **municipality bears the onus of proof** — they must prove the billed amount is correct
- The consumer only needs to raise a **bona fide dispute** (genuine, reasonable objection)
- The consumer does **NOT** need to prove the amount is wrong
- The municipality **DOES** need to prove the amount is right
- If the municipality cannot produce verifiable meter readings, the charge is disputed

**Use in letters:** Every letter involving meter reading disputes, estimated readings, or unexplained charges. This case shifts the burden entirely onto the municipality.

**Citation format:**
> "As established in Gallagher Estates (Pty) Ltd v City of Johannesburg Metropolitan Municipality (2016), the onus of proving the accuracy of the billed amount rests with the municipality."

### Mkontwana v Nelson Mandela Metropolitan Municipality (2005)

**Facts:** Constitutional Court case examining municipal billing obligations.

**Held (Constitutional Court):**
- Municipalities have a **constitutional obligation** to maintain reasonably accurate billing records
- Billing accuracy is not merely an administrative convenience — it is a **constitutional duty**
- Systematic billing errors indicate a failure to meet this constitutional standard

**Use in letters:** When there are multiple errors on the same bill or a pattern of errors across billing periods. This elevates the complaint from administrative to constitutional.

**Citation format:**
> "Per Mkontwana v Nelson Mandela Metropolitan Municipality 2005 (CC), municipalities bear a constitutional duty to maintain reasonably accurate billing records."

---

## 3. Municipal Property Rates Act (No. 6 of 2004)

### Section 49 — Objection to Property Valuation

**Different process from utility billing disputes.** Property rates are based on the municipal valuation of the property.

- Objection must be lodged with the municipal **Valuation Appeal Board**
- **Strict time limits** — objections only accepted during the annual valuation roll review period (usually 30–60 days, advertised in local media)
- Requires **independent valuation** as supporting evidence — the consumer must commission their own property valuation
- Appeal Board hearing is formal — consumer may present or send a representative

**Use in letters:** When the rates charge is based on an incorrect property valuation. This is a separate process from Section 102 disputes and must be handled via the Valuation Appeal Board.

**Warning:** Missing the objection window means waiting for the next valuation cycle. Flag urgency to users.

---

## 4. Prescription Act (No. 68 of 1969)

### Section 11 — Prescription Periods

Prescription determines **how far back** a consumer can claim for overcharges.

| Service | Prescription Period | Notes |
|---|---|---|
| Electricity | **3 years** | From the date the overcharge was billed |
| Water | **3 years** | From the date the overcharge was billed |
| Gas | **3 years** | From the date the overcharge was billed |
| Rates | **30 years** | Much longer — rates are statutory, not service-based |
| Sewerage | **30 years** | Classified as a levy, not a service charge |
| Refuse removal | **30 years** | Classified as a levy, not a service charge |

### Critical Rules

| Rule | Impact |
|---|---|
| Prescription starts when consumer **knew or should have known** about overcharge | Ignorance is not a defence if the bill clearly shows the error |
| Once paid, amount **cannot prescribe** — no refund claim possible | Payment is acceptance. Must dispute BEFORE paying. |
| Payment **under protest** does NOT interrupt prescription | Writing "under protest" on a check is legally meaningless |
| Signing an **acknowledgement of debt** DOES interrupt prescription | Resets the clock — municipality knows this tactic |
| **Never sign acknowledgement of debt** without legal advice | Always warn users in the app UI |

### Use in Letters
- Calculate the prescription window for each disputed charge
- Only dispute charges within the prescription period
- If charges are near the 3-year boundary, file immediately
- State the prescription defence explicitly if the municipality tries to back-bill

**Citation format:**
> "In terms of Section 11 of the Prescription Act (No. 68 of 1969), the claim for electricity/water charges prescribed after three (3) years."

---

## 5. Electricity Regulation Act (No. 4 of 2006)

### NERSA (National Energy Regulator of South Africa)

NERSA has the mandate to resolve disputes between electricity suppliers and consumers.

**Escalation path:**
1. Exhaust the municipal internal dispute process first (Section 102 letter)
2. If municipality fails to resolve within 30 days → file with NERSA
3. NERSA can:
   - Investigate the complaint
   - Mandate corrections
   - Order compensation
   - Impose penalties on the municipality

**Filing with NERSA:**
- Website: [nersa.org.za](https://nersa.org.za)
- Email: complaints@nersa.org.za
- Required: original bill, meter photos, all correspondence history, municipal reference number

**Use in letters:** Mention NERSA as the escalation body in electricity disputes. This signals to the municipality that the consumer knows their rights beyond the internal process.

---

## 6. Water Services Act (No. 108 of 1997)

- Establishes the **right to basic water services**
- Municipality must investigate metering complaints
- If municipality fails to resolve → escalate to **Department of Water and Sanitation**

**Use in letters:** For water billing disputes, reference the consumer's right to basic water services and the municipality's obligation to investigate metering accuracy.

---

## 7. Escalation Ladder

Always follow this order. Never skip steps — it weakens the legal position.

### Step 1: Internal Municipal Dispute (Section 102 Letter)
- **Billdog generates this letter**
- Serve on the Municipal Manager (not the call centre)
- Expected response: **14–30 days**
- Keep proof of delivery (email read receipt, hand delivery with signature, registered post receipt)
- **This step is mandatory before any escalation**

### Step 2: Municipal Ombudsman
- Free, independent mediation service
- Available in most metros (Cape Town, Johannesburg, eThekwini, Tshwane)
- Requires: original reference number from Step 1
- Only available **after exhausting internal process**

### Step 3: NERSA (Electricity Only)
- Email: complaints@nersa.org.za
- Tel: 012 401 4600
- Only for electricity disputes — not water, rates, or refuse
- Requires: all correspondence from Steps 1–2

### Step 4: Public Protector
- Website: publicprotector.org
- Tel: 0800 11 20 40 (free call)
- For **maladministration and systemic failures**
- Use when the municipality refuses to engage at all
- The Public Protector can compel the municipality to respond

### Step 5: High Court (Last Resort)
- Requires an attorney
- Billdog refers to legal partners at this stage
- Only if all administrative remedies exhausted
- Consumer can claim legal costs if successful

---

## 8. Formal Dispute Letter — Must-Haves

A letter is **procedurally invalid** without ALL of these elements:

- [ ] Full name and postal/email address of account holder
- [ ] Municipal account number
- [ ] Property address and erf number (if rates-related)
- [ ] Specific disputed line items with **exact amounts** (not vague references)
- [ ] Reason for dispute **per line item** (not a blanket "I disagree")
- [ ] Legal basis **per disputed item** (cite the Act, section number)
- [ ] Clear statement of what resolution is requested (correction, refund, credit)
- [ ] Deadline for response (**30 calendar days** is standard per Section 102)
- [ ] Statement that services must not be disconnected per **Section 102(2)**
- [ ] Date of the letter
- [ ] Account holder's name as signature

**Why each matters:**
- Missing account number → municipality can ignore (can't identify the account)
- Missing specific amounts → municipality can dismiss as vague
- Missing legal basis → municipality can ignore as a complaint, not a dispute
- Missing Section 102(2) → services may be disconnected during investigation
- Missing deadline → municipality can delay indefinitely

---

## 9. Payment During Dispute — Critical User Warning

This must be displayed prominently in the Billdog UI:

> **⚠️ IMPORTANT: You must continue paying the undisputed portion of your bill.**
>
> While your dispute is active, the municipality cannot disconnect your services — but only if you keep paying the amount that is NOT disputed.
>
> **How to calculate:** Take the average of your last 3–6 months of bills. That's your undisputed amount. Pay that every month while the dispute is open.
>
> **If you stop all payments:** The municipality may legally disconnect your services, even with an active dispute.

### In the App
- Show this warning on the **dispute submission page**
- Show this warning in the **case detail page**
- Calculate and display the estimated undisputed amount based on bill history
- Set a recurring reminder to pay the undisputed portion

---

## 10. Common Error Types — Legal Basis Quick Reference

Use this mapping in the Claude analysis prompt and letter generation:

| Error Type | Primary Legal Basis | Secondary |
|---|---|---|
| Estimated/incorrect meter reading | MSA Section 102 + Gallagher Estates | Municipality must prove accuracy |
| Backdated charges beyond 3 years | MSA Section 102 + Prescription Act s11 | 3-year limit for utilities |
| Wrong property valuation | MPRA Section 49 | Valuation Appeal Board process |
| Ghost debt / unknown charges | MSA Section 102 + Gallagher | Onus on municipality to prove |
| Duplicate charges | MSA Section 102 | Clear billing error |
| Unapplied rebate or discount | MSA Section 102 + MSA Section 95 | Customer care obligation |
| Incorrect tariff applied | MSA Section 102 + Electricity Reg Act | NERSA escalation if unresolved |
| Billing for vacant property | MSA Section 102 | Must prove consumption occurred |
| Charges during disconnection | MSA Section 102 | Cannot bill for undelivered service |
| Sewerage based on wrong water reading | MSA Section 102 | Derivative error from water reading |

### In Claude Prompts
The analysis prompt should use these exact mappings when identifying the `legal_basis` field for each error. The letter generator should expand these into full citations with section text from the RAG system.
