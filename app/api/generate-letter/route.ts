import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDisputeLetter } from '@/lib/claude/generate-letter';
import { getLegislationContext } from '@/lib/rag/legislation';
import { getRateLimiter, rateLimitExceededResponse } from '@/lib/rate-limit';

const generateLimiter = getRateLimiter(20, '1 h');

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { success } = await generateLimiter.limit(`generate_${user.id}`);
    if (!success) return rateLimitExceededResponse();

    // 2. Parse request
    let body;
    try {
      const textBody = await request.text();
      if (!textBody) return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
      body = JSON.parse(textBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const caseId = body.caseId;
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    // 3. Fetch case + ownership check
    const { data: caseRecord, error: dbError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (dbError || !caseRecord || caseRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }

    if (!caseRecord.errors_found || caseRecord.errors_found.length === 0) {
      return NextResponse.json({ error: 'No billing errors found to dispute' }, { status: 400 });
    }

    // 3a. Hard gate — block generation if consent or ID missing
    const { data: canSubmit } = await supabase.rpc('can_submit_dispute', { target_case_id: caseId });
    if (!canSubmit) {
      await supabase.from('case_events').insert({
        case_id: caseId,
        event_type: 'send_blocked_no_consent',
        note: 'Letter generation blocked — POPIA consent, mandate, or account-holder ID missing.',
      });
      return NextResponse.json({ error: 'CONSENT_OR_ID_MISSING' }, { status: 412 });
    }

    // 4. Fetch user profile + mandate timestamp
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, address, account_number, municipality, email, mandate_consent_at')
      .eq('id', user.id)
      .single();

    // 4a. Resolve property address — hard gate, since empty → CoCT rejects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caseRec = caseRecord as any;
    const propertyAddress: string =
      (caseRec.property_address && String(caseRec.property_address).trim()) ||
      (profile?.address && String(profile.address).trim()) ||
      '';
    if (!propertyAddress) {
      await supabase.from('case_events').insert({
        case_id: caseId,
        event_type: 'send_blocked_no_address',
        note: 'Letter generation blocked — no property address on case or profile.',
      });
      return NextResponse.json({ error: 'PROPERTY_ADDRESS_MISSING' }, { status: 412 });
    }

    // 4b. Decrypt account-holder ID via Vault RPC
    const { data: idNumber } = await supabase.rpc('get_poppi_id', { target_case_id: caseId });
    if (!idNumber || !profile?.mandate_consent_at) {
      // Defensive — can_submit_dispute should have caught this, but guard anyway.
      return NextResponse.json({ error: 'CONSENT_OR_ID_MISSING' }, { status: 412 });
    }

    // 5. Filter out prescribed errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allErrors = caseRecord.errors_found as any[];
    const prescriptionWarnings = caseRecord.prescription_warnings || [];
    const prescribedExclusions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const disputeErrors: any[] = [];

    allErrors.forEach((err, i) => {
      const warning = prescriptionWarnings[i];
      if (warning && warning.status === 'prescribed') {
        prescribedExclusions.push(
          `${err.line_item} (R${err.amount_charged.toFixed(2)}) — prescribed under Prescription Act Section 11`
        );
      } else {
        disputeErrors.push(err);
      }
    });

    if (disputeErrors.length === 0) {
      return NextResponse.json({ error: 'All identified errors are prescribed and cannot be disputed.' }, { status: 400 });
    }

    // 6. Fetch legislation context via RAG (with fallback)
    const serviceTypes = disputeErrors.map((e: { service_type: string }) => e.service_type);
    const legislation = await getLegislationContext(serviceTypes);

    const accountHolder = profile?.full_name?.trim()
      ? profile.full_name.trim()
      : (user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Account Holder'));

    // 7. Generate letter via Claude
    const letterResult = await generateDisputeLetter({
      accountHolder,
      address: propertyAddress,
      accountNumber: profile?.account_number || caseRecord.account_number || '',
      municipality: profile?.municipality || caseRecord.municipality || '',
      billPeriod: caseRecord.bill_period || 'Unknown period',
      verification: {
        fullName: accountHolder,
        idNumber,
        accountNumber: profile?.account_number || caseRecord.account_number || '',
        propertyAddress,
        email: user.email || profile?.email || '',
        municipalityName: profile?.municipality || caseRecord.municipality || '',
        caseId: caseRecord.id,
        mandateConsentAt: profile.mandate_consent_at,
      },
      errors: disputeErrors,
      prescribedExclusions,
      legislationContext: legislation.text,
    });

    // 8. Save letter to cases table
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        letter_content: letterResult.letterContent,
        status: 'letter_ready',
      })
      .eq('id', caseId);

    if (updateError) {
      console.error('[API/GenerateLetter] Failed to save letter:', updateError);
      return NextResponse.json({ error: 'Failed to save generated letter' }, { status: 500 });
    }

    // 9. Log to case_events
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'letter_generated',
      note: `Dispute letter generated. ${disputeErrors.length} items disputed, ${prescribedExclusions.length} excluded (prescribed).`,
      metadata: {
        model: letterResult._meta.model,
        tokens_used: letterResult._meta.tokensUsed,
        duration_ms: letterResult._meta.durationMs,
        rag_source: legislation.source,
        rag_chunks_used: legislation.chunksUsed,
        prescribed_items_excluded: prescribedExclusions.length,
        disputed_items: disputeErrors.length,
      },
    });

    return NextResponse.json({ success: true, caseId }, { status: 200 });
  } catch (globalError) {
    console.error('[API/GenerateLetter] Global uncaught error:', globalError);
    return NextResponse.json({ error: 'An unexpected error occurred during letter generation' }, { status: 500 });
  }
}
