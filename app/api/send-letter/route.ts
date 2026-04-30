import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendDisputeLetter } from '@/lib/resend/send-dispute';
import { buildVerificationBlock } from '@/lib/letters/verification-block';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // 2. Parse request
    let body;
    try {
      const textBody = await request.text();
      if (!textBody) return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
      body = JSON.parse(textBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { caseId } = body;
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    // 3. Fetch case + ownership check
    const { data: caseRecord, error: dbError } = await supabase
      .from('cases')
      .select('id, user_id, status, letter_content, municipality, account_number, bill_period, property_address')
      .eq('id', caseId)
      .single();

    if (dbError || !caseRecord || caseRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }

    // 3a. Defensive consent re-check — generation should already have gated, but
    // mandate may have been revoked between generate and send.
    const { data: canSubmit } = await supabase.rpc('can_submit_dispute', { target_case_id: caseId });
    if (!canSubmit) {
      await supabase.from('case_events').insert({
        case_id: caseId,
        event_type: 'send_blocked_no_consent',
        note: 'Send blocked — consent revoked or ID missing at send time.',
      });
      return NextResponse.json({ error: 'CONSENT_OR_ID_MISSING' }, { status: 412 });
    }

    if (caseRecord.status !== 'letter_ready') {
      return NextResponse.json({ error: 'Letter is not ready to be sent.' }, { status: 400 });
    }

    if (!caseRecord.letter_content) {
      return NextResponse.json({ error: 'No letter content found.' }, { status: 400 });
    }

    // 3b. Strict verification-block check.
    // The preview textarea is editable — a user could have stripped the
    // block before clicking send. Verify both required markers are present.
    // If either is missing, rebuild the block, prepend, persist, and audit.
    let letterContent: string = caseRecord.letter_content;
    const hasHeader = letterContent.includes('ACCOUNT HOLDER VERIFICATION');
    const hasMandate = letterContent.includes('MANDATE');
    if (!hasHeader || !hasMandate) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, address, email, mandate_consent_at')
        .eq('id', user.id)
        .single();

      const { data: idNumber } = await supabase.rpc('get_poppi_id', { target_case_id: caseId });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caseRec = caseRecord as any;
      const propertyAddress: string =
        (caseRec.property_address && String(caseRec.property_address).trim()) ||
        (profile?.address && String(profile.address).trim()) ||
        '';

      if (!profile?.full_name || !idNumber || !profile.mandate_consent_at || !propertyAddress) {
        return NextResponse.json({ error: 'Cannot reconstruct verification block — required fields missing.' }, { status: 412 });
      }

      const block = buildVerificationBlock({
        fullName: profile.full_name,
        idNumber,
        accountNumber: caseRecord.account_number || '',
        propertyAddress,
        email: profile.email || user.email || '',
        municipalityName: caseRecord.municipality || '',
        caseId: caseRecord.id,
        mandateConsentAt: profile.mandate_consent_at,
      });

      letterContent = block + '\n\n' + letterContent;

      const { error: restoreUpdateError } = await supabase
        .from('cases')
        .update({ letter_content: letterContent })
        .eq('id', caseId);
      if (restoreUpdateError) {
        console.error('[API/SendLetter] Failed to persist restored letter_content:', restoreUpdateError);
      }

      await supabase.from('case_events').insert({
        case_id: caseId,
        event_type: 'verification_block_restored',
        note: 'Verification block was missing from saved letter at send time and has been auto-restored.',
        metadata: {
          missing_header: !hasHeader,
          missing_mandate: !hasMandate,
          restored_at: new Date().toISOString(),
        },
      });
    }

    // 4. Fetch municipality email
    const { data: municipalityRecord, error: muniError } = await supabase
      .from('municipalities')
      .select('dispute_email')
      .eq('name', caseRecord.municipality)
      .single();

    if (muniError || !municipalityRecord?.dispute_email) {
      // Graceful degradation / error handling for missing municipality
      return NextResponse.json({ error: `Could not find a dispute email for ${caseRecord.municipality}.` }, { status: 400 });
    }

    const municipalityEmail = municipalityRecord.dispute_email;
    const userEmail = user.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found on account' }, { status: 400 });
    }

    // 5. Send via Resend
    let messageId;
    try {
      messageId = await sendDisputeLetter({
        municipalityEmail,
        userEmail,
        accountNumber: caseRecord.account_number,
        municipalityName: caseRecord.municipality,
        billPeriod: caseRecord.bill_period || 'Unknown',
        letterContent,
        caseId: caseRecord.id,
      });
    } catch (emailError: unknown) {
      console.error('[API/SendLetter] Email sending failed:', emailError);
      
      // Update case to indicate failure
      await supabase.from('cases').update({ status: 'send_failed' }).eq('id', caseId);
      
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      await supabase.from('case_events').insert({
        case_id: caseId,
        event_type: 'send_failed',
        note: `Failed to deliver dispute letter to ${caseRecord.municipality}. Reason: ${errorMessage}`,
      });

      return NextResponse.json({ error: 'Failed to send dispute letter.' }, { status: 500 });
    }

    // 6. Update case success status
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        status: 'sent',
        letter_sent_at: new Date().toISOString(),
        municipality_email: municipalityEmail
      })
      .eq('id', caseId);

    if (updateError) {
      console.error('[API/SendLetter] Failed to append success state to DB:', updateError);
      // It sent, but DB failed. Log it and return success still so user isn't stuck.
    }

    // 7. Log success event
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'letter_sent',
      note: `Dispute letter formally sent to ${caseRecord.municipality}.`,
      metadata: {
        resend_id: messageId,
        recipient_type: 'municipality',
        subject: `Formal Dispute — Account ${caseRecord.account_number} — ${caseRecord.municipality} — ${caseRecord.bill_period}`,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, caseId }, { status: 200 });

  } catch (globalError) {
    console.error('[API/SendLetter] Global uncaught error:', globalError);
    return NextResponse.json({ error: 'An unexpected internal error occurred' }, { status: 500 });
  }
}
