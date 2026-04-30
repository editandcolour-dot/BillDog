import { ValidationFinding } from '@/types/analysis';
import { WardCouncillor } from './wardCouncillorLookup';
import { buildVerificationBlock, VerificationBlockInput } from '@/lib/letters/verification-block';

export interface EscalationLetter {
  step: number;
  sentAt: string;
  reference: string;
}

export interface EscalationLetterInput {
  step: 1 | 2 | 3 | 4;
  caseId: string;
  accountNumber: string;
  propertyAddress: string;
  municipalityName: string;
  municipalityCode: string;
  findings: ValidationFinding[];
  priorLetters: EscalationLetter[];
  wardCouncillor?: WardCouncillor | null;
  verification: VerificationBlockInput;
}

export function generateLetter(input: EscalationLetterInput): {
  subject: string;
  body: string;
  recipientEmail: string;
  recipientName: string;
  ccEmails: string[];
} {
  const dateFormatted = new Date().toLocaleDateString('en-ZA', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  const reference = `BD-${input.municipalityCode}-${input.caseId.substring(0, 8).toUpperCase()}`;

  const formatFindings = () => {
    return input.findings.map(f => 
      `- ${f.description} (Error on line: ${f.lineReference})\n  Billed: R${f.billedAmount.toFixed(2)}${f.expectedAmount ? ` | Expected: R${f.expectedAmount.toFixed(2)}` : ''}`
    ).join('\n\n');
  };

  const getPriorReferences = () => {
    if (input.priorLetters.length === 0) return 'No prior correspondence.';
    return input.priorLetters.map(pl => `Step ${pl.step} Letter sent on ${new Date(pl.sentAt).toLocaleDateString('en-ZA')} (Ref: BD-STEP${pl.step}-${input.caseId.substring(0,8).toUpperCase()})`).join('\n');
  };

  let subject = '';
  let body = '';
  let ccEmails: string[] = [];

  switch (input.step) {
    case 1:
      subject = `Formal Billing Dispute — Account ${input.accountNumber} — ${input.municipalityName}`;
      body = `To: The Billing Department, ${input.municipalityName}
Date: ${dateFormatted}
Reference: ${reference}

We act on behalf of the account holder for property located at: ${input.propertyAddress}.

In terms of Section 95(f) of the Local Government: Municipal Systems Act 32 of 2000, we hereby formally dispute the charges levied on Account Number ${input.accountNumber}.

Our automated verification system has identified the following billing errors:
${formatFindings()}

We request that these errors be corrected and the account credited within 30 days of this notice.

Yours faithfully,
Billdog (Pty) Ltd
disputes@billdog.co.za`;
      break;

    case 2:
      subject = `Escalation: Unresolved Billing Dispute — Account ${input.accountNumber} — Ref ${reference}`;
      if (input.wardCouncillor?.email) ccEmails.push(input.wardCouncillor.email);
      body = `To: The Municipal Manager / Independent Ombudsman, ${input.municipalityName}
Date: ${dateFormatted}
Reference: ${reference}

We act on behalf of the account holder for property located at: ${input.propertyAddress}.

On ${input.priorLetters[0] ? new Date(input.priorLetters[0].sentAt).toLocaleDateString() : 'a prior date'}, we lodged a formal dispute (Ref: ${reference}) regarding Account Number ${input.accountNumber}. No substantive response or resolution has been received within the statutory 30-day period.

We attach/reference the previous correspondence below to formally escalate this matter in terms of Section 74 of the Municipal Systems Act.
Furthermore, we point out that Section 102 prevents the disconnection of services for disputed amounts.

Prior Correspondence:
${getPriorReferences()}

Specific Errors:
${formatFindings()}

We await your urgent intervention.

Yours faithfully,
Billdog (Pty) Ltd
disputes@billdog.co.za`;
      break;

    case 3:
      subject = `Complaint of Maladministration — ${input.municipalityName} — Account ${input.accountNumber}`;
      if (input.wardCouncillor?.email) ccEmails.push(input.wardCouncillor.email);
      // Determine if electricity dispute to cc NERSA
      const hasElect = input.findings.some(f => f.type === 'HUC_AMOUNT_WRONG' || f.type === 'OVER_APPROVED_INCREASE');
      if (hasElect) ccEmails.push('complaints@nersa.org.za');
      
      body = `To: The Public Protector Provincial Office
Date: ${dateFormatted}
Reference: ${reference}-PP

In terms of Section 182 of the Constitution, we hereby lodge a formal complaint of maladministration regarding the persistent failure of ${input.municipalityName} to resolve a verified billing dispute for Account Number ${input.accountNumber}.

Dispute Timeline:
${getPriorReferences()}

The municipality has failed to resolve the following identified errors:
${formatFindings()}

${hasElect ? 'This includes electricity tariff violations contravening the Electricity Regulation Act s4(e).' : ''}

We request an investigation into the municipality's failure to adhere to administrative justice principles in resolving consumer disputes.

Yours faithfully,
Billdog (Pty) Ltd
disputes@billdog.co.za`;
      break;

    case 4:
      subject = `Unresolved Municipal Billing Complaint — ${input.municipalityName}`;
      body = `To: The Presidential Hotline
Date: ${dateFormatted}
Account Number: ${input.accountNumber}

We request urgent assistance regarding systemic failure by ${input.municipalityName} to resolve a factual billing dispute. 
Despite formal lodgement to the billing department, escalation to the Municipal Manager, and reporting to the Public Protector, the account remains uncorrected.

Timeline of formal dispute action taken:
${getPriorReferences()}

Property Address: ${input.propertyAddress}
Errors Identified:
${formatFindings()}

We request Presidential Hotline intervention to instruct the municipality to clear these erroneous charges.

Yours faithfully,
Billdog (Pty) Ltd
disputes@billdog.co.za`;
      break;
  }

  const verifiedBody = buildVerificationBlock(input.verification) + '\n\n' + body;

  return {
    subject,
    body: verifiedBody,
    recipientEmail: '', // Populated by Engine
    recipientName: '',  // Populated by Engine
    ccEmails
  };
}
