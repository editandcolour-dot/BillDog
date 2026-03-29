import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDisputeLetter } from '@/lib/claude/generate-letter';
import { getLegislationContext } from '@/lib/rag/legislation';

export const maxDuration = 60;

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

    // 4. Fetch user profile (optional — fall back to case data if missing)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, address, account_number, municipality')
      .eq('id', user.id)
      .single();

    // No hard block — use case record data as fallback

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

    // 7. Generate letter via Claude
    const letterResult = await generateDisputeLetter({
      accountHolder: profile?.full_name || user.email || 'Account Holder',
      address: profile?.address || 'Address on file',
      accountNumber: profile?.account_number || caseRecord.account_number || '',
      municipality: profile?.municipality || caseRecord.municipality || '',
      billPeriod: caseRecord.bill_period || 'Unknown period',
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
