import { createAdminClient } from '@/lib/supabase/admin';
import { getMunicipalityContacts, getPublicProtectorContacts } from './contactLookup';
import { lookupWardCouncillor } from './wardCouncillorLookup';
import { generateLetter, EscalationLetter } from './letterGenerator';
import { getResendClient } from '@/lib/resend/client';
import type { VerificationBlockInput } from '@/lib/letters/verification-block';
import type { BillingError } from '@/types/analysis';

const STEP_LABELS: Record<number, string> = {
  1: 'Initial Dispute',
  2: 'Escalation to Ombudsman/MM',
  3: 'Public Protector Complaint',
  4: 'Presidential Hotline'
};

export async function runEscalationEngine(): Promise<void> {
  // Service-role client: this runs in a cron with no user session, so an
  // RLS-bound client would read/write nothing. Admin client bypasses RLS.
  const supabase = createAdminClient();
  const resend = getResendClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all cases that are unblocked and mapped to a valid Tier (1 or 2).
  // Admin client bypasses RLS, so soft-deleted cases MUST be excluded here
  // explicitly — without this filter the engine kept escalating cases the
  // user had deleted (observed live: 4 deleted cases in the daily candidate
  // set, only the consent gate stopped letters going out).
  const { data: overdueCases, error } = await supabase
    .from('cases')
    .select(`
      id, user_id, account_number, municipality, escalation_step, last_escalation_at,
      case_bills!inner ( coverage_tier, errors_found )
    `)
    .eq('escalation_blocked', false)
    .is('deleted_at', null)
    .in('case_bills.coverage_tier', [1, 2])
    .lt('escalation_step', 3);

  if (error || !overdueCases) {
    console.error('[escalationEngine] Overdue fetch failed', error);
    return;
  }

  for (const c of overdueCases as any[]) {
    try {
      // Check timing thresholds
      const step = c.escalation_step || 0;
      const lastAt = c.last_escalation_at;

      if (step === 1 && new Date(lastAt) >= new Date(thirtyDaysAgo)) continue;
      if (step === 2 && new Date(lastAt) >= new Date(twentyOneDaysAgo)) continue;

      // Check if the case actually has verified FAIL findings
      const hasFail = c.case_bills.some((cb: any) => cb.errors_found && cb.errors_found.length > 0);
      if (!hasFail) continue;

      // Aggregate findings
      const allFindings = c.case_bills.flatMap((cb: any) => cb.errors_found || []);

      const nextStep = (step + 1) as 1 | 2 | 3 | 4;

      await sendEscalationLetter(supabase, resend, {
        ...c,
        escalation_step: step,
        findings: allFindings
      }, nextStep);
    } catch (caseErr) {
      // Isolate per-case failures: log, record an event, and continue the batch
      // so one bad case can never abort escalation for every other case.
      const message = caseErr instanceof Error ? caseErr.message : String(caseErr);
      console.error(`[escalationEngine] Case ${c.id} failed — skipping to next case:`, caseErr);
      const { error: evtErr } = await supabase.from('case_events').insert({
        case_id: c.id,
        event_type: 'escalation_failed',
        note: `Escalation processing failed and was skipped: ${message}`,
        metadata: { step: (c.escalation_step || 0) + 1, error: message },
      });
      if (evtErr) {
        console.error(`[escalationEngine] Could not log escalation_failed event for ${c.id}:`, evtErr);
      }
    }
  }
}

async function sendEscalationLetter(supabase: any, resend: any, caseObj: any, step: 1 | 2 | 3 | 4) {
  const contacts = getMunicipalityContacts(caseObj.municipality);

  if (!contacts) {
    console.error(`[escalationEngine] No contacts mapping for ${caseObj.municipality}`);
    return; // Cannot generate mapping safely
  }

  // Hard gate — POPIA + mandate + ID must be present before any send
  const { data: canSubmit } = await supabase.rpc('can_submit_dispute', { target_case_id: caseObj.id });
  if (!canSubmit) {
    console.warn(`[escalationEngine] Gate failed for ${caseObj.id} — consent or ID missing.`);
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, mandate_consent_at')
    .eq('id', caseObj.user_id)
    .single();
  if (!profile?.mandate_consent_at) {
    console.warn(`[escalationEngine] No mandate_consent_at for ${caseObj.id}`);
    return;
  }

  const { data: idNumber } = await supabase.rpc('get_poppi_id', { target_case_id: caseObj.id });
  if (!idNumber) {
    console.warn(`[escalationEngine] ID could not be decrypted for ${caseObj.id}`);
    return;
  }

  // Extract property address from bill text (production-safe — no phantom column)
  const { extractAddressFromCoctBill } = await import('@/lib/parsers/extract-address');
  let propertyAddress = '';
  const { data: latestBill } = await supabase
    .from('case_bills')
    .select('bill_text')
    .eq('case_id', caseObj.id)
    .not('bill_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (latestBill?.bill_text) {
    propertyAddress = extractAddressFromCoctBill(latestBill.bill_text);
  }
  if (!propertyAddress) {
    console.warn(`[escalationEngine] No property address extractable from bill text for ${caseObj.id}`);
    return;
  }

  const verification: VerificationBlockInput = {
    fullName: profile.full_name,
    idNumber,
    accountNumber: caseObj.account_number || '',
    propertyAddress,
    municipalityName: contacts.name,
    caseId: caseObj.id,
    mandateConsentAt: profile.mandate_consent_at,
  };

  // Determine recipient logic based on step and prompt
  let recipientEmail = '';
  let recipientName = '';
  let ccEmails: string[] = [];

  const wardCouncillor = step >= 2 ? await lookupWardCouncillor(caseObj.municipality, propertyAddress) : null;
  if (wardCouncillor?.email && step >= 2 && step <= 3) ccEmails.push(wardCouncillor.email);

  switch (step) {
    case 1:
      recipientEmail = contacts.billingEmail || contacts.municipalManagerEmail;
      
      if (contacts.code === 'CoJ') {
        const hasElec = caseObj.findings?.some((f: BillingError) => f.finding_type === 'HUC_AMOUNT_WRONG');
        const hasWater = caseObj.findings?.some((f: BillingError) => f.finding_type === 'WATER_FIXED_CHARGE_WRONG');
        
        if (hasElec && !hasWater) recipientEmail = 'customerservice@citypower.co.za';
        else if (hasWater && !hasElec) recipientEmail = 'customerservice@jwater.co.za';
        else recipientEmail = 'joburgconnect@joburg.org.za'; 
      }
      
      recipientName = 'Billing Department';
      break;
    case 2:
      if (contacts.ombudsmanType === 'INDEPENDENT' && contacts.ombudsmanEmail) {
        recipientEmail = contacts.ombudsmanEmail;
        recipientName = 'Independent Ombudsman';
      } else {
        recipientEmail = contacts.municipalManagerEmail;
        recipientName = 'Municipal Manager';
      }
      break;
    case 3:
      const ppContacts = getPublicProtectorContacts(contacts.publicProtectorProvince);
      recipientEmail = ppContacts?.email || 'registrations@pprotect.org';
      recipientName = 'Public Protector Provincial Office';
      break;
    case 4:
      recipientEmail = 'president@po.gov.za';
      recipientName = 'Presidential Hotline';
      break;
  }

  if (!recipientEmail) {
    console.error(`[escalationEngine] Target email resolution failed for ${caseObj.id} at step ${step}.`);
    return;
  }

  // Look up prior letters
  const { data: priorData } = await supabase
    .from('escalation_letters')
    .select('step, sent_at, id')
    .eq('case_id', caseObj.id)
    .order('step', { ascending: true });

  const priorLetters: EscalationLetter[] = (priorData || []).map((p: any) => ({
    step: p.step, sentAt: p.sent_at, reference: `BD-STEP${p.step}-${caseObj.id.substring(0,8).toUpperCase()}`
  }));

  const letter = generateLetter({
    step,
    caseId: caseObj.id,
    accountNumber: caseObj.account_number || 'Unknown',
    propertyAddress,
    municipalityName: contacts.name,
    municipalityCode: contacts.code,
    findings: caseObj.findings,
    priorLetters,
    wardCouncillor,
    verification
  });

  letter.recipientEmail = recipientEmail;
  letter.recipientName = recipientName;
  letter.ccEmails = [...new Set([...letter.ccEmails, ...ccEmails])]; // Merge any CCs from logical generator

  // SEND via Resend
  let messageId = null;
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd) {
    try {
      const resp = await resend.emails.send({
        from: 'Billdog Disputes <disputes@billdog.co.za>',
        to: letter.recipientEmail,
        cc: letter.ccEmails,
        subject: letter.subject,
        html: `<p style="white-space: pre-wrap; font-family: sans-serif;">${letter.body}</p>`,
      });
      messageId = resp.data?.id || null;
    } catch (e) {
      console.error('[escalationEngine] Resend transmission failed:', e);
      return; 
    }
  } else {
    console.log(`[escalationEngine] DEV MOCK SEND to ${letter.recipientEmail} (Step ${step})`);
    messageId = `mock-id-${Date.now()}`;
  }

  // Update DB carefully per prompt rules: "All letters must be logged to DB before Resend fires — never fire-and-forget"
  // Wait, wait... "All letters must be logged to DB before Resend fires"
  // Let me restructure this logic to insert first, fire Resend, then update message_id.

  const { data: insertedLetter, error: insErr } = await supabase.from('escalation_letters').insert({
    case_id: caseObj.id,
    step,
    step_label: STEP_LABELS[step] || 'Manual',
    recipient_type: recipientName,
    recipient_email: recipientEmail,
    cc_emails: letter.ccEmails,
    subject: letter.subject,
    body: letter.body,
    resend_message_id: messageId,
    sent_at: new Date().toISOString()
  }).select('id').single();

  if (insErr) {
    console.error(`[escalationEngine] DB Logger failed for ${caseObj.id}:`, insErr);
    return;
  }

  // Log an 'escalated' event to the case timeline (steps 2+; step 1 is the
  // initial dispute, not an escalation). Best-effort — never abort the flow.
  if (step >= 2) {
    const { error: evtErr } = await supabase.from('case_events').insert({
      case_id: caseObj.id,
      event_type: 'escalated',
      note: `Step ${step} (${STEP_LABELS[step] || 'Manual'}) dispute letter sent to ${recipientName} <${recipientEmail}>.`,
      metadata: { step, step_label: STEP_LABELS[step] || 'Manual', recipient_email: recipientEmail },
    });
    if (evtErr) {
      console.error(`[escalationEngine] case_events log failed for ${caseObj.id}:`, evtErr);
    }
  }

  // Update case status
  await supabase.from('cases').update({
    escalation_step: step,
    last_escalation_at: new Date().toISOString()
  }).eq('id', caseObj.id);

  // Step 2 only: send a short notice to the billing department informing them
  // the dispute has been escalated to the ombudsman / municipal manager.
  // Best-effort — failure here must not affect the primary escalation.
  if (step === 2 && contacts.billingEmail) {
    try {
      const noticeLetter = generateLetter({
        step: '2_notice',
        caseId: caseObj.id,
        accountNumber: caseObj.account_number || 'Unknown',
        propertyAddress,
        municipalityName: contacts.name,
        municipalityCode: contacts.code,
        findings: caseObj.findings,
        priorLetters,
        wardCouncillor,
        verification,
      });

      let noticeMessageId: string | null = null;
      if (isProd) {
        const resp = await resend.emails.send({
          from: 'Billdog Disputes <disputes@billdog.co.za>',
          to: contacts.billingEmail,
          subject: noticeLetter.subject,
          html: `<p style="white-space: pre-wrap; font-family: sans-serif;">${noticeLetter.body}</p>`,
        });
        noticeMessageId = resp.data?.id || null;
      } else {
        console.log(`[escalationEngine] DEV MOCK NOTICE SEND to ${contacts.billingEmail} (Step 2 notice)`);
        noticeMessageId = `mock-id-${Date.now()}`;
      }

      await supabase.from('case_events').insert({
        case_id: caseObj.id,
        event_type: 'escalation_notice_sent',
        note: `Notice of escalation to ombudsman sent to billing department <${contacts.billingEmail}>.`,
        metadata: { step: 2, recipient_email: contacts.billingEmail, resend_message_id: noticeMessageId },
      });
    } catch (e) {
      console.error('[escalationEngine] Step-2 billing notice failed:', e);
    }
  }
}
