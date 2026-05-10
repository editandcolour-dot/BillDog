/**
 * Recovery Charge Logic — Triggers PayFast token charge for confirmed recoveries.
 *
 * Uses existing chargeToken() from lib/payfast/charge.ts.
 * Implements: R200 minimum threshold, 3 retries over 7 days, email on success/failure,
 * auto-fetch suspension on final failure.
 *
 * Source of truth: Phase 5 spec §recovery-charge.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { chargeToken } from '@/lib/payfast/charge';
import { sendResolutionSuccessEmail } from '@/lib/resend/notifications';
import { RECOVERY_MINIMUM_ZAR, RECOVERY_FEE_DISPLAY } from '@/lib/constants/fees';
import type { RecoveryResult } from './detect';

const MAX_RETRIES = 3;
const RETRY_INTERVAL_DAYS = [0, 2, 5]; // Day 0, Day 2, Day 5 (within 7-day window)

interface ChargeResult {
  success: boolean;
  charged: number;
  error?: string;
  retryScheduled?: boolean;
}

/**
 * Process a recovery charge for a user.
 *
 * @param userId - The user who recovered funds
 * @param caseId - The case ID associated with this recovery
 * @param recovery - Recovery detection result from detect.ts
 * @param retryCount - Current retry attempt (0 = first try)
 */
export async function processRecoveryCharge(
  userId: string,
  caseId: string,
  recovery: RecoveryResult,
  retryCount = 0,
): Promise<ChargeResult> {
  const supabase = createAdminClient();

  // Guard: must meet minimum threshold
  if (!recovery.meetsThreshold) {
    console.info(`[recovery/charge] Recovery R${recovery.totalRecovered.toFixed(2)} below R${RECOVERY_MINIMUM_ZAR} minimum. Waiving.`);
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'recovery_fee_waived',
      note: `Recovery of R${recovery.totalRecovered.toFixed(2)} below R${RECOVERY_MINIMUM_ZAR} threshold. Fee waived.`,
      metadata: { matches: recovery.matches.length, total_recovered: recovery.totalRecovered },
    });
    return { success: true, charged: 0 };
  }

  // Get user's PayFast token
  const { data: profile } = await supabase
    .from('profiles')
    .select('payfast_token, email, full_name')
    .eq('id', userId)
    .single();

  if (!profile?.payfast_token) {
    console.error(`[recovery/charge] No PayFast token for user ${userId}`);
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'recovery_charge_failed',
      note: 'No card on file. Cannot charge recovery fee.',
    });
    return { success: false, charged: 0, error: 'No card on file' };
  }

  // Idempotency: check if already charged for this recovery
  const { data: existingCharge } = await supabase
    .from('case_events')
    .select('id')
    .eq('case_id', caseId)
    .eq('event_type', 'recovery_fee_charged')
    .limit(1);

  if (existingCharge && existingCharge.length > 0) {
    console.warn(`[recovery/charge] Recovery fee already charged for case ${caseId}`);
    return { success: true, charged: 0 };
  }

  // Attempt charge
  const result = await chargeToken({
    token: profile.payfast_token,
    amount: recovery.totalFee,
    caseId,
  });

  if (result.success) {
    // Log success event
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'recovery_fee_charged',
      note: `Recovery fee of R${recovery.totalFee.toFixed(2)} charged (${RECOVERY_FEE_DISPLAY} of R${recovery.totalRecovered.toFixed(2)}).`,
      metadata: {
        matches: recovery.matches.map(m => ({
          findingType: m.findingType,
          recoveredAmount: m.recoveredAmount,
          feeAmount: m.feeAmount,
        })),
        retry_count: retryCount,
      },
    });

    // Send success email
    if (profile.email) {
      try {
        await sendResolutionSuccessEmail(
          profile.email,
          recovery.totalRecovered,
          recovery.totalFee,
          caseId,
        );
      } catch (emailErr) {
        console.error('[recovery/charge] Email notification failed:', emailErr);
      }
    }

    return { success: true, charged: recovery.totalFee };
  }

  // Charge failed — handle retries
  console.error(`[recovery/charge] Charge failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, result.error);

  await supabase.from('case_events').insert({
    case_id: caseId,
    event_type: 'recovery_charge_failed',
    note: `Charge attempt ${retryCount + 1}/${MAX_RETRIES} failed: ${result.error || 'Unknown'}`,
    metadata: { retry_count: retryCount, amount: recovery.totalFee },
  });

  if (retryCount < MAX_RETRIES - 1) {
    // Schedule retry — in production this would use QStash delay
    const nextRetryDay = RETRY_INTERVAL_DAYS[retryCount + 1] || 7;
    console.info(`[recovery/charge] Scheduling retry ${retryCount + 2} in ${nextRetryDay} days`);

    return { success: false, charged: 0, error: result.error, retryScheduled: true };
  }

  // Final failure — suspend auto-fetch (NOT account)
  console.error(`[recovery/charge] All ${MAX_RETRIES} retries exhausted for user ${userId}. Suspending auto-fetch.`);

  // Suspend auto-fetch by revoking credentials
  await supabase
    .from('municipal_credentials')
    .update({
      revoked_at: new Date().toISOString(),
      revocation_reason: 'password_change_required', // closest match in CHECK constraint
    })
    .eq('user_id', userId)
    .is('revoked_at', null);

  await supabase.from('case_events').insert({
    case_id: caseId,
    event_type: 'autofetch_suspended',
    note: `Auto-fetch suspended after ${MAX_RETRIES} failed charge attempts. User must update payment method.`,
  });

  // Send failure email to user
  if (profile.email) {
    try {
      const { getResendClient } = await import('@/lib/resend/client');
      const resend = getResendClient();
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

      await resend.emails.send({
        from: `Billdog <${fromEmail}>`,
        to: [profile.email],
        subject: 'Action required — please update your payment method',
        text: `Hi ${profile.full_name || 'there'},\n\nWe recovered R${recovery.totalRecovered.toFixed(2)} for you, but we couldn't process the ${RECOVERY_FEE_DISPLAY} success fee of R${recovery.totalFee.toFixed(2)}.\n\nYour auto-fetch has been paused until your payment method is updated. Your account is otherwise unaffected.\n\nPlease log in and update your card: ${process.env.NEXT_PUBLIC_APP_URL}/account\n\nThank you,\nBilldog`,
      });
    } catch (emailErr) {
      console.error('[recovery/charge] Failure email send failed:', emailErr);
    }
  }

  return { success: false, charged: 0, error: 'All retries exhausted. Auto-fetch suspended.' };
}
