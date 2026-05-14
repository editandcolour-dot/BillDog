/**
 * Verification block prepended to every outbound dispute letter.
 * Required by SA municipalities (CoCT Ombudsman precedent) to prove the user
 * authorised Billdog to act and to identify the account holder.
 *
 * Single source of truth — imported by lib/claude/generate-letter.ts (Step 1)
 * and lib/escalation/escalate-dispute.ts (Steps 2-7) / letterGenerator.ts.
 */

export interface VerificationBlockInput {
  fullName: string;
  idNumber: string;
  accountNumber: string;
  propertyAddress: string;
  email: string;
  municipalityName: string;
  caseId: string;
  mandateConsentAt: string;
}

export function buildVerificationBlock(i: VerificationBlockInput): string {
  const mandateDate = new Date(i.mandateConsentAt).toISOString().split('T')[0];

  return `ACCOUNT HOLDER VERIFICATION
Full name:        ${i.fullName}
ID number:        ${i.idNumber}
Account number:   ${i.accountNumber}
Property address: ${i.propertyAddress}

MANDATE
I, ${i.fullName}, have authorised Billdog (Pty) Ltd
to lodge this billing dispute and correspond with
${i.municipalityName} on my behalf. Mandate granted
${mandateDate}, reference ${i.caseId}.

Submitted by: Billdog (Pty) Ltd, disputes@billdog.co.za
On behalf of: ${i.fullName}

---`;
}
