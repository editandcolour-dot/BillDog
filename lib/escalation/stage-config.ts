/**
 * Escalation Stage Configuration
 *
 * Defines the 7-stage escalation pipeline for Billdog dispute follow-ups.
 * Each stage has a delay, recipient logic, and email template builder.
 *
 * Stage 1: Initial letter (already sent by user flow — not processed here)
 * Stage 2-6: Automated follow-ups
 * Stage 7: Close as unresolved
 */

import type { DisputeType } from '@/types';

// ---------------------------------------------------------------------------
// Stage configuration
// ---------------------------------------------------------------------------

export interface EscalationMessage {
  actionName: string; // E.g. "Second Follow-Up" or "Speaker Escalation"
  recipients: string[];
  cc?: string[];
  subject: string;
  body: string;
  eventType: 'escalation_sent' | 'escalation_speaker' | 'case_closed_unresolved';
}

export interface StageConfig {
  stage: number;
  name: string;
  delayDays: number;
  /** Returns the messages to be sent for this stage. */
  getMessages: (ctx: EscalationContext) => EscalationMessage[];
  /** Whether this stage closes the case. */
  closesCase: boolean;
}

export interface EscalationContext {
  caseId: string;
  accountNumber: string;
  accountHolder: string;
  municipality: string;
  municipalityEmail: string;
  ombudsmanEmail: string | null;
  speakerOfficeEmail: string | null;
  speakerName: string | null;
  billPeriod: string;
  letterContent: string;
  disputeType: DisputeType | null;
  userEmail: string;
  currentStage: number;
  letterSentAt: string;
  idNumber: string | null;
}

// ---------------------------------------------------------------------------
// Email template helpers
// ---------------------------------------------------------------------------

function daysElapsed(letterSentAt: string): number {
  const sent = new Date(letterSentAt);
  const now = new Date();
  return Math.floor((now.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24));
}

function municipalityFollowUpBody(ctx: EscalationContext, stageLabel: string): string {
  const days = daysElapsed(ctx.letterSentAt);
  return [
    `Date: ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    '',
    `The Municipal Manager`,
    `${ctx.municipality}`,
    '',
    `RE: ${stageLabel} — FORMAL DISPUTE — Account ${ctx.accountNumber}`,
    '',
    `Dear Sir/Madam,`,
    '',
    `This letter serves as a ${stageLabel.toLowerCase()} regarding the formal billing dispute submitted on ${new Date(ctx.letterSentAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })} for account ${ctx.accountNumber}, billing period ${ctx.billPeriod}.`,
    '',
    `It has now been ${days} days since the original dispute was submitted. Section 102(1)(b) of the Municipal Systems Act (No. 32 of 2000) requires the municipality to investigate the matter and provide a written response.`,
    '',
    `Section 102(2) confirms that services may not be discontinued while the dispute is under investigation.`,
    '',
    `We respectfully request that this matter be attended to urgently and a substantive response be provided within 7 calendar days of this letter.`,
    '',
    `The account holder reserves all rights under the Municipal Systems Act and applicable legislation.`,
    '',
    `Yours faithfully,`,
    `On behalf of ${ctx.accountHolder}`,
    `Billdog Disputes`,
    `Reference: ${ctx.caseId}`,
  ].join('\n');
}

function ombudsmanBody(ctx: EscalationContext): string {
  const days = daysElapsed(ctx.letterSentAt);
  return [
    `Date: ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    '',
    `Municipal Ombudsman / Senior Complaints Manager`,
    `${ctx.municipality}`,
    '',
    `RE: ESCALATION — Unresolved Billing Dispute — Account ${ctx.accountNumber}`,
    '',
    `Dear Sir/Madam,`,
    '',
    `We write to escalate an unresolved billing dispute for account ${ctx.accountNumber} (${ctx.municipality}), billing period ${ctx.billPeriod}.`,
    '',
    `A formal dispute was submitted ${days} days ago under Section 102 of the Municipal Systems Act. Despite two follow-up communications, no substantive response has been received.`,
    '',
    `We respectfully request that this matter be escalated to the appropriate senior authority for urgent investigation.`,
    '',
    `The original dispute letter and all correspondence are available upon request.`,
    '',
    `Yours faithfully,`,
    `On behalf of ${ctx.accountHolder}`,
    `Billdog Disputes`,
    `Reference: ${ctx.caseId}`,
  ].join('\n');
}

function regulatorBody(ctx: EscalationContext): string {
  const days = daysElapsed(ctx.letterSentAt);
  const isElectricity = ctx.disputeType === 'electricity';
  const regulator = isElectricity
    ? 'the National Energy Regulator of South Africa (NERSA)'
    : 'the Public Protector of South Africa';

  return [
    `Date: ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    '',
    isElectricity ? 'National Energy Regulator of South Africa (NERSA)' : 'Office of the Public Protector',
    '',
    `RE: REGULATORY COMPLAINT — ${ctx.municipality} — Account ${ctx.accountNumber}`,
    '',
    `Dear Sir/Madam,`,
    '',
    `We write to lodge a formal complaint with ${regulator} regarding an unresolved municipal billing dispute.`,
    '',
    `Account holder: ${ctx.accountHolder}`,
    ctx.idNumber ? `ID Number: ${ctx.idNumber}` : null,
    `Municipality: ${ctx.municipality}`,
    `Account number: ${ctx.accountNumber}`,
    `Bill period: ${ctx.billPeriod}`,
    '',
    `A Section 102 dispute was submitted ${days} days ago. Despite multiple follow-up letters and escalation to the Municipal Ombudsman, no substantive response has been received.`,
    '',
    `We request that ${regulator} investigate this matter and compel the municipality to respond in accordance with its statutory obligations.`,
    '',
    `All supporting documentation is available upon request.`,
    '',
    `Yours faithfully,`,
    `On behalf of ${ctx.accountHolder}`,
    `Billdog Disputes`,
    `Reference: ${ctx.caseId}`,
  ].join('\n');
}

function finalDemandBody(ctx: EscalationContext): string {
  const days = daysElapsed(ctx.letterSentAt);
  return [
    `Date: ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    '',
    `The Municipal Manager`,
    `${ctx.municipality}`,
    '',
    `RE: FINAL DEMAND — Account ${ctx.accountNumber}`,
    '',
    `Dear Sir/Madam,`,
    '',
    `This is a final demand regarding the unresolved billing dispute for account ${ctx.accountNumber}, billing period ${ctx.billPeriod}.`,
    '',
    `It has now been ${days} days since the original Section 102 dispute was submitted. This matter has been escalated through the following channels without resolution:`,
    '',
    `1. Original dispute letter`,
    `2. First follow-up letter`,
    `3. Second follow-up letter & Speaker Escalation`,
    `4. Municipal Ombudsman escalation`,
    `5. ${ctx.disputeType === 'electricity' ? 'NERSA' : 'Public Protector'} complaint`,
    '',
    `Failure to respond within 7 calendar days will result in this matter being referred for legal review and the account holder exercising all available legal remedies.`,
    '',
    `Yours faithfully,`,
    `On behalf of ${ctx.accountHolder}`,
    `Billdog Disputes`,
    `Reference: ${ctx.caseId}`,
  ].join('\n');
}

function speakerEscalationBody(ctx: EscalationContext): string {
  return [
    `Date: ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    '',
    `Office of the Speaker`,
    ctx.speakerName ? `Attention: ${ctx.speakerName}` : `Attention: The Speaker`,
    `${ctx.municipality}`,
    '',
    `RE: Request for Intervention: Section 102 Dispute - ${ctx.accountNumber}`,
    '',
    `Dear Speaker,`,
    '',
    `This is a respectful request for intervention in an unresolved Section 102 billing dispute for account ${ctx.accountNumber}.`,
    '',
    `The original dispute was submitted on ${new Date(ctx.letterSentAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })} and multiple follow-ups have gone unanswered, resulting in a 14-day delay in response.`,
    '',
    `Under Section 152 of the Constitution, municipalities are mandated to provide democratic and accountable government and to ensure the provision of services. The failure of the municipal administration to acknowledge or resolve this dispute undermines this mandate.`,
    '',
    `We respectfully request your intervention in ensuring the municipality's finance department responds to this dispute and fulfils its statutory obligations.`,
    '',
    `A summary of the disputed amounts is attached in the original correspondence trail.`,
    '',
    `Yours faithfully,`,
    `On behalf of ${ctx.accountHolder}`,
    `Billdog Disputes`,
    `Reference: ${ctx.caseId}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

export const STAGE_CONFIG: Record<number, StageConfig> = {
  2: {
    stage: 2,
    name: 'First Follow-Up',
    delayDays: 7,
    getMessages: (ctx) => [{
      actionName: 'First Follow-Up',
      recipients: [ctx.municipalityEmail],
      subject: `FOLLOW-UP: Formal Dispute — Account ${ctx.accountNumber} — ${ctx.municipality}`,
      body: municipalityFollowUpBody(ctx, 'FIRST FOLLOW-UP'),
      eventType: 'escalation_sent',
    }],
    closesCase: false,
  },
  3: {
    stage: 3,
    name: 'Second Follow-Up & Speaker Escalation',
    delayDays: 7,
    getMessages: (ctx) => {
      const msgs: EscalationMessage[] = [];
      
      // 1. Second follow-up to municipality
      msgs.push({
        actionName: 'Second Follow-Up',
        recipients: [ctx.municipalityEmail],
        subject: `SECOND FOLLOW-UP: Formal Dispute — Account ${ctx.accountNumber} — ${ctx.municipality}`,
        body: municipalityFollowUpBody(ctx, 'SECOND FOLLOW-UP'),
        eventType: 'escalation_sent',
      });

      // 2. Speaker Escalation (if available)
      if (ctx.speakerOfficeEmail) {
        msgs.push({
          actionName: 'Speaker Escalation',
          recipients: [ctx.speakerOfficeEmail],
          cc: [ctx.municipalityEmail],
          subject: `Request for Intervention: Section 102 Dispute - ${ctx.accountNumber}`,
          body: speakerEscalationBody(ctx),
          eventType: 'escalation_speaker',
        });
      }

      return msgs;
    },
    closesCase: false,
  },
  4: {
    stage: 4,
    name: 'Ombudsman Escalation',
    delayDays: 7,
    getMessages: (ctx) => {
      const recipients = [ctx.municipalityEmail];
      if (ctx.ombudsmanEmail) recipients.push(ctx.ombudsmanEmail);
      return [{
        actionName: 'Ombudsman Escalation',
        recipients,
        subject: `ESCALATION: Unresolved Dispute — Account ${ctx.accountNumber} — ${ctx.municipality}`,
        body: ombudsmanBody(ctx),
        eventType: 'escalation_sent',
      }];
    },
    closesCase: false,
  },
  5: {
    stage: 5,
    name: 'NERSA / Public Protector',
    delayDays: 9,
    getMessages: (ctx) => {
      const recipients = [ctx.municipalityEmail];
      if (ctx.disputeType === 'electricity') {
        recipients.push('complaints@nersa.org.za');
      } else {
        recipients.push('info@pprotect.org');
      }
      return [{
        actionName: 'NERSA / Public Protector',
        recipients,
        subject: `REGULATORY COMPLAINT: ${ctx.municipality} — Account ${ctx.accountNumber}`,
        body: regulatorBody(ctx),
        eventType: 'escalation_sent',
      }];
    },
    closesCase: false,
  },
  6: {
    stage: 6,
    name: 'Final Demand',
    delayDays: 15,
    getMessages: (ctx) => [{
      actionName: 'Final Demand',
      recipients: [ctx.municipalityEmail],
      subject: `FINAL DEMAND: Account ${ctx.accountNumber} — ${ctx.municipality}`,
      body: finalDemandBody(ctx),
      eventType: 'escalation_sent',
    }],
    closesCase: false,
  },
  7: {
    stage: 7,
    name: 'Close as Unresolved',
    delayDays: 0,
    getMessages: () => [],
    closesCase: true,
  },
};

/** Schedule for next_action_at: stage → days until next action. */
export const STAGE_DELAY_DAYS: Record<number, number> = {
  1: 7,   // Stage 1→2
  2: 7,   // Stage 2→3
  3: 7,   // Stage 3→4
  4: 9,   // Stage 4→5
  5: 15,  // Stage 5→6
  6: 0,   // Stage 6→7 (same day)
};

/**
 * Calculate the next_action_at date for a given stage.
 * Returns null if no further escalation is scheduled.
 */
export function getNextActionDate(currentStage: number): Date | null {
  const days = STAGE_DELAY_DAYS[currentStage];
  if (days === undefined) return null;

  const next = new Date();
  next.setDate(next.getDate() + days);
  return next;
}
