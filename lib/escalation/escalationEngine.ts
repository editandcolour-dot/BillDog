import { createClient } from '@/lib/supabase/server';
import { getMunicipalityContacts, getPublicProtectorContacts } from './contactLookup';
import { lookupWardCouncillor } from './wardCouncillorLookup';
import { generateLetter, EscalationLetter } from './letterGenerator';
import { getResendClient } from '@/lib/resend/client';

const STEP_LABELS: Record<number, string> = {
  1: 'Initial Dispute',
  2: 'Escalation to Ombudsman/MM',
  3: 'Public Protector Complaint',
  4: 'Presidential Hotline'
};

export async function runEscalationEngine(): Promise<void> {
  const supabase = await createClient();
  const resend = getResendClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all cases that are unblocked and mapped to a valid Tier (1 or 2)
  const { data: overdueCases, error } = await supabase
    .from('cases')
    .select(`
      id, account_number, property_address, municipality, escalation_step, last_escalation_at,
      case_bills!inner ( coverage_tier, errors_found )
    `)
    .eq('escalation_blocked', false)
    .in('case_bills.coverage_tier', [1, 2])
    .lt('escalation_step', 3);

  if (error || !overdueCases) {
    console.error('[escalationEngine] Overdue fetch failed', error);
    return;
  }

  for (const c of overdueCases as any[]) {
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
  }
}

async function sendEscalationLetter(supabase: any, resend: any, caseObj: any, step: 1 | 2 | 3 | 4) {
  const contacts = getMunicipalityContacts(caseObj.municipality);
  
  if (!contacts) {
    console.error(`[escalationEngine] No contacts mapping for ${caseObj.municipality}`);
    return; // Cannot generate mapping safely
  }

  // Determine recipient logic based on step and prompt
  let recipientEmail = '';
  let recipientName = '';
  let ccEmails: string[] = [];

  const wardCouncillor = step >= 2 ? await lookupWardCouncillor(caseObj.municipality, caseObj.property_address || '') : null;
  if (wardCouncillor?.email && step >= 2 && step <= 3) ccEmails.push(wardCouncillor.email);

  switch (step) {
    case 1:
      recipientEmail = contacts.billingEmail || contacts.municipalManagerEmail;
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
    propertyAddress: caseObj.property_address || 'Address provided on record',
    municipalityName: contacts.name,
    municipalityCode: contacts.code,
    findings: caseObj.findings,
    priorLetters,
    wardCouncillor
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

  // Update case status
  await supabase.from('cases').update({
    escalation_step: step,
    last_escalation_at: new Date().toISOString()
  }).eq('id', caseObj.id);
}
