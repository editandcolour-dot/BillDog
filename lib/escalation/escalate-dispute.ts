/**
 * Core Escalation Engine for Billdog.
 *
 * Handles querying due cases, processing each escalation,
 * sending emails, updating DB, and logging errors.
 *
 * Rules:
 * - One failed case never stops the batch.
 * - Never advance stage if send fails.
 * - Log all failures to cron_errors.
 * - Check last_escalation_at to prevent double-sends.
 */

import { createClient } from '@supabase/supabase-js';
import { getResendClient } from '@/lib/resend/client';
import {
  STAGE_CONFIG,
  getNextActionDate,
  type EscalationContext,
} from './stage-config';
import type { EscalationHistoryEntry } from '@/types';

// ---------------------------------------------------------------------------
// Supabase service client (bypasses RLS for cron operations)
// ---------------------------------------------------------------------------

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EscalationCase {
  id: string;
  user_id: string;
  status: string;
  municipality: string;
  account_number: string;
  bill_period: string | null;
  letter_content: string | null;
  letter_sent_at: string | null;
  municipality_email: string | null;
  escalation_stage: number;
  next_action_at: string | null;
  last_escalation_at: string | null;
  escalation_history: EscalationHistoryEntry[];
  dispute_type: string | null;
  id_secret_id: string | null;
}

interface EscalationResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ caseId: string; stage: number; error: string }>;
}

// ---------------------------------------------------------------------------
// Query: get cases ready for escalation
// ---------------------------------------------------------------------------

export async function getCasesReadyForEscalation(): Promise<EscalationCase[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('cases')
    .select(`
      id, user_id, status, municipality, account_number,
      bill_period, letter_content, letter_sent_at,
      municipality_email, escalation_stage, next_action_at,
      last_escalation_at, escalation_history, dispute_type, id_secret_id
    `)
    .in('status', ['sent', 'escalated'])
    .not('next_action_at', 'is', null)
    .lte('next_action_at', new Date().toISOString())
    .lt('escalation_stage', 7)
    .order('next_action_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to query escalation cases: ${error.message}`);
  }

  return (data ?? []) as EscalationCase[];
}

// ---------------------------------------------------------------------------
// Process: escalate a single case
// ---------------------------------------------------------------------------

async function escalateCase(
  caseRow: EscalationCase,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();
  const nextStage = caseRow.escalation_stage + 1;
  const config = STAGE_CONFIG[nextStage];

  if (!config) {
    return { success: false, error: `No stage config for stage ${nextStage}` };
  }

  // ------------------------------------------------------------------
  // 1. Fetch profile + municipality data
  // ------------------------------------------------------------------
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', caseRow.user_id)
    .single();

  if (!profile) {
    return { success: false, error: 'User profile not found' };
  }

  const { data: muni } = await supabase
    .from('municipalities')
    .select('dispute_email, ombudsman_email, speaker_office_email, speaker_name')
    .eq('name', caseRow.municipality)
    .single();

  const municipalityEmail = muni?.dispute_email ?? caseRow.municipality_email ?? '';
  if (!municipalityEmail) {
    return { success: false, error: 'No municipality email found' };
  }

  // ------------------------------------------------------------------
  // 1.5 Fetch decrypted ID if stage requires it
  // ------------------------------------------------------------------
  let decryptedId: string | null = null;
  if (caseRow.id_secret_id) {
    const { data: idData, error: idError } = await supabase.rpc('get_poppi_id', {
      case_id: caseRow.id
    });
    if (!idError && idData) {
      decryptedId = idData;
    }
  }

  // ------------------------------------------------------------------
  // 2. Build escalation context
  // ------------------------------------------------------------------
  const ctx: EscalationContext = {
    caseId: caseRow.id,
    accountNumber: caseRow.account_number,
    accountHolder: profile.full_name,
    municipality: caseRow.municipality,
    municipalityEmail,
    ombudsmanEmail: muni?.ombudsman_email ?? null,
    speakerOfficeEmail: muni?.speaker_office_email ?? null,
    speakerName: muni?.speaker_name ?? null,
    billPeriod: caseRow.bill_period ?? 'Unknown',
    letterContent: caseRow.letter_content ?? '',
    disputeType: (caseRow.dispute_type as EscalationContext['disputeType']) ?? null,
    userEmail: profile.email,
    currentStage: caseRow.escalation_stage,
    letterSentAt: caseRow.letter_sent_at ?? caseRow.last_escalation_at ?? new Date().toISOString(),
    idNumber: decryptedId,
  };

  // ------------------------------------------------------------------
  // 3. Stage 7 — close without sending
  // ------------------------------------------------------------------
  if (config.closesCase) {
    const historyEntry: EscalationHistoryEntry = {
      stage: nextStage,
      action: config.name,
      timestamp: new Date().toISOString(),
      resend_id: null,
      recipient: 'N/A — case closed',
    };

    const { error: updateError } = await supabase
      .from('cases')
      .update({
        status: 'closed',
        escalation_stage: nextStage,
        next_action_at: null,
        last_escalation_at: new Date().toISOString(),
        escalation_history: [...(caseRow.escalation_history ?? []), historyEntry],
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseRow.id);

    if (updateError) {
      return { success: false, error: `DB update failed: ${updateError.message}` };
    }

    // Log timeline event
    await supabase.from('case_events').insert({
      case_id: caseRow.id,
      event_type: 'case_closed_unresolved',
      note: 'Case closed — all escalation stages exhausted.',
    });

    // Notify user of closure
    await sendUserNotification(ctx, nextStage, true);

    return { success: true };
  }

  // ------------------------------------------------------------------
  // 3.5 Stage 5 — ID Collection Pause
  // ------------------------------------------------------------------
  if (nextStage === 5 && !caseRow.id_secret_id && ctx.disputeType !== 'electricity') {
    // If it's electricity, it goes to NERSA which does not strictly require ID via this form right now.
    // If it's Public Protector, we MUST pause and ask the user for their ID.
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        escalation_stage: 5,
        next_action_at: null, // Halts the cron
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseRow.id);

    if (updateError) {
      return { success: false, error: `DB update failed: ${updateError.message}` };
    }

    await supabase.from('case_events').insert({
      case_id: caseRow.id,
      event_type: 'escalation_sent',
      note: 'Escalation halted: Awaiting Public Protector ID collection from user.',
      metadata: { stage: nextStage, paused_for_id: true }
    });
    
    // We notify user that they must provide their ID via the dashboard.
    // (We reuse the user notification but flag it)
    await sendUserNotification(ctx, nextStage, false);
    
    return { success: true };
  }

  // ------------------------------------------------------------------
  // 4. Send escalation email(s) (stages 2-6)
  // ------------------------------------------------------------------
  const messages = config.getMessages(ctx);
  const newHistoryEntries: EscalationHistoryEntry[] = [];
  const resendIds: string[] = [];

  try {
    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

    for (const msg of messages) {
      if (msg.actionName === 'Speaker Escalation' && !ctx.speakerOfficeEmail) {
        // Technically already skipped in stage-config by `if` logic, but keeping explicit handling if needed
        continue;
      }

      const { data: sendResult, error: sendError } = await resend.emails.send({
        from: `Billdog Disputes <${fromEmail}>`,
        to: msg.recipients,
        cc: msg.cc ? [...msg.cc, ctx.userEmail] : [ctx.userEmail],
        replyTo: `case-${caseRow.id}@disputes.billdog.co.za`,
        subject: msg.subject,
        text: msg.body,
      });

      if (sendError) {
        return { success: false, error: `Resend failed for ${msg.actionName}: ${sendError.message}` };
      }

      const rId = sendResult?.id ?? null;
      if (rId) resendIds.push(rId);

      newHistoryEntries.push({
        stage: nextStage,
        action: msg.actionName,
        timestamp: new Date().toISOString(),
        resend_id: rId,
        recipient: msg.recipients.join(', '),
      });

      // Log timeline event for each message
      await supabase.from('case_events').insert({
        case_id: caseRow.id,
        event_type: msg.eventType,
        note: `${msg.actionName} sent to ${msg.recipients.join(', ')}`,
        metadata: { stage: nextStage, resend_id: rId },
      });
    }

    // Explicitly note unavailable speaker if stage 3
    if (nextStage === 3 && !ctx.speakerOfficeEmail) {
      await supabase.from('case_events').insert({
        case_id: caseRow.id,
        event_type: 'escalation_speaker',
        note: 'Speaker contact unavailable',
        metadata: { stage: nextStage, skipped: true },
      });
      newHistoryEntries.push({
        stage: nextStage,
        action: 'Speaker Escalation (Skipped)',
        timestamp: new Date().toISOString(),
        resend_id: null,
        recipient: 'None (Unavailable)',
      });
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Email send exception: ${msg}` };
  }

  // ------------------------------------------------------------------
  // 5. Update case in DB (only after successful send)
  // ------------------------------------------------------------------
  const nextActionDate = getNextActionDate(nextStage);

  const { error: updateError } = await supabase
    .from('cases')
    .update({
      status: 'escalated',
      escalation_stage: nextStage,
      next_action_at: nextActionDate?.toISOString() ?? null,
      last_escalation_at: new Date().toISOString(),
      escalation_history: [...(caseRow.escalation_history ?? []), ...newHistoryEntries],
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseRow.id);

  if (updateError) {
    return { success: false, error: `DB update failed after send: ${updateError.message}` };
  }

  // Notify user
  await sendUserNotification(ctx, nextStage, false);

  return { success: true };
}

// ---------------------------------------------------------------------------
// User notification email
// ---------------------------------------------------------------------------

async function sendUserNotification(
  ctx: EscalationContext,
  stage: number,
  isClosed: boolean,
): Promise<void> {
  try {
    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';
    const config = STAGE_CONFIG[stage];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://billdog.co.za';

    const subject = isClosed
      ? `Case Update: Your dispute has been closed — ${ctx.municipality}`
      : `Case Update: ${config?.name ?? `Stage ${stage}`} — ${ctx.municipality}`;

    const body = isClosed
      ? [
          `Hi ${ctx.accountHolder},`,
          '',
          `Your billing dispute for account ${ctx.accountNumber} (${ctx.municipality}, ${ctx.billPeriod}) has been closed after all automated escalation steps were exhausted.`,
          '',
          `What was done on your behalf:`,
          `1. Original dispute letter sent to ${ctx.municipality}`,
          `2. Two follow-up letters sent`,
          `3. Escalated to Municipal Ombudsman`,
          `4. ${ctx.disputeType === 'electricity' ? 'Complaint filed with NERSA' : 'Complaint filed with Public Protector'}`,
          `5. Final demand letter sent`,
          '',
          `Next steps you can take:`,
          `- Visit your local municipal office in person`,
          `- Consult a legal professional for further action`,
          `- Contact the relevant councillor for your ward`,
          '',
          `View your case: ${appUrl}/case/${ctx.caseId}`,
          '',
          `We're sorry we couldn't resolve this automatically. No fees will be charged.`,
          '',
          `Billdog Team`,
        ].join('\n')
      : [
          `Hi ${ctx.accountHolder},`,
          '',
          `We've sent a ${config?.name?.toLowerCase() ?? 'follow-up'} letter for your dispute:`,
          '',
          `Municipality: ${ctx.municipality}`,
          `Account: ${ctx.accountNumber}`,
          `Period: ${ctx.billPeriod}`,
          `Stage: ${stage} of 7`,
          '',
          `View your case: ${appUrl}/case/${ctx.caseId}`,
          '',
          `We'll keep following up if the municipality doesn't respond.`,
          '',
          `Billdog Team`,
        ].join('\n');

    await resend.emails.send({
      from: `Billdog <${fromEmail}>`,
      to: [ctx.userEmail],
      subject,
      text: body,
    });
  } catch {
    // User notification failure should not break escalation
    console.error(`[escalation] Failed to notify user ${ctx.userEmail} for case ${ctx.caseId}`);
  }
}

// ---------------------------------------------------------------------------
// Batch processor: process all due cases
// ---------------------------------------------------------------------------

export async function processEscalationBatch(): Promise<EscalationResult> {
  const result: EscalationResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  const cases = await getCasesReadyForEscalation();
  result.processed = cases.length;

  const supabase = getServiceClient();

  for (const caseRow of cases) {
    try {
      const outcome = await escalateCase(caseRow);

      if (outcome.success) {
        result.succeeded++;
      } else {
        result.failed++;
        const errorInfo = {
          caseId: caseRow.id,
          stage: caseRow.escalation_stage + 1,
          error: outcome.error ?? 'Unknown error',
        };
        result.errors.push(errorInfo);

        // Log to cron_errors table
        await supabase.from('cron_errors').insert({
          case_id: caseRow.id,
          stage: caseRow.escalation_stage + 1,
          error: outcome.error,
          metadata: { run_at: new Date().toISOString() },
        });
      }
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      const errorInfo = {
        caseId: caseRow.id,
        stage: caseRow.escalation_stage + 1,
        error: msg,
      };
      result.errors.push(errorInfo);

      // Log to cron_errors table
      await supabase.from('cron_errors').insert({
        case_id: caseRow.id,
        stage: caseRow.escalation_stage + 1,
        error: msg,
        metadata: { run_at: new Date().toISOString(), stack: err instanceof Error ? err.stack : undefined },
      });
    }
  }

  return result;
}
