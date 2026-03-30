import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseBillFile } from '@/lib/pdf/parse';
import { analyseBill } from '@/lib/claude/analyse-bill';
import { checkPrescription } from '@/lib/validators/prescription';
import type { ServiceType } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow Vercel/NextJS to run up to 60s for LLM

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
    } catch (err) {
      console.error('[API/Analyse] JSON Parse Error:', err);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const caseId = body.caseId;

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    // 3. Fetch Case and Ownership Verification
    const { data: caseRecord, error: dbError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (dbError || !caseRecord || caseRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }

    const RETRYABLE_STATUSES = ['uploading', 'analysing', 'closed'];
    if (!RETRYABLE_STATUSES.includes(caseRecord.status)) {
      return NextResponse.json({ error: 'Case is already processed' }, { status: 400 });
    }

    // 4. Update status to analysing immediately to lock it
    await supabase.from('cases').update({ status: 'analysing', updated_at: new Date().toISOString() }).eq('id', caseId);

    // 5. Download the raw file from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('bills')
      .download(caseRecord.bill_url);

    if (downloadError || !fileBlob) {
      console.error('[API/Analyse] Storage download failed:', downloadError);
      await supabase.from('cases').update({ status: 'closed' }).eq('id', caseId);
      return NextResponse.json({ error: 'Failed to access uploaded bill file' }, { status: 500 });
    }

    // 6. Determine MIME type (Supabase Blob.type may be empty, derive from filename)
    let mimeType = fileBlob.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      const ext = caseRecord.bill_url.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        heic: 'image/heic',
      };
      mimeType = (ext && mimeMap[ext]) || 'application/pdf';
      console.log('[API/Analyse] Derived MIME from extension:', ext, '->', mimeType);
    }

    // 7. Extract Text
    let extractedText = '';
    try {
      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      extractedText = await parseBillFile(buffer, mimeType);
    } catch (parseError) {
      console.error('[API/Analyse] Parse error:', parseError);
      await supabase.from('cases').update({ status: 'closed' }).eq('id', caseId);
      await supabase.from('case_events').insert({
        case_id: caseId,
        event_type: 'analysis_failed',
        note: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return NextResponse.json(
        { error: parseError instanceof Error ? parseError.message : 'File parsing failed' },
        { status: 500 }
      );
    }

    // 7. Claude Analysis
    let analysis;
    try {
      analysis = await analyseBill(extractedText);
    } catch (analysisError) {
      console.error('[API/Analyse] Claude Analysis error:', analysisError);
      
      const errMsg = analysisError instanceof Error ? analysisError.message : String(analysisError);
      const isTimeout = analysisError instanceof Error && analysisError.name === 'CLAUDE_TIMEOUT';
      
      // Leave status as 'analysing' on timeout so user can retry, otherwise 'closed'
      if (!isTimeout) {
        await supabase.from('cases').update({ status: 'closed' }).eq('id', caseId);
      }

      await supabase.from('case_events').insert({
        case_id: caseId,
        event_type: 'analysis_failed',
        note: errMsg,
      });

      return NextResponse.json(
        { error: isTimeout ? 'Analysis timed out. Please retry.' : 'We couldn\'t process the bill format. Please ensure it is a valid SA municipal bill.' },
        { status: isTimeout ? 503 : 500 }
      );
    }

    // 8. Run Prescription Validator on every error line
    const prescription_warnings = analysis.errors.map(err => {
      // Map Claude 'service_type' to standard ServiceType
      const serviceType = err.service_type as ServiceType;
      return checkPrescription(analysis.bill_period, serviceType);
    });

    // 9. Update Database with final results
    const finalStatus = analysis.errors.length > 0 ? 'letter_ready' : 'closed';
    
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        bill_text: extractedText,
        errors_found: analysis.errors,
        recoverable: analysis.total_recoverable,
        total_billed: analysis.total_billed,
        bill_period: analysis.bill_period,
        prescription_warnings: prescription_warnings,
        status: finalStatus,
      })
      .eq('id', caseId);

    if (updateError) {
      console.error('[API/Analyse] Final state save failed:', updateError);
      return NextResponse.json({ error: 'Failed to save analysis results' }, { status: 500 });
    }

    // 10. Log Success Event
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'analysed',
      note: `Bill analysed with ${analysis.confidence} confidence. ${analysis.errors.length} issues found. R${analysis.total_recoverable.toFixed(2)} recoverable.`,
      metadata: {
        model: analysis._meta?.model,
        tokens_used: analysis._meta?.tokensUsed,
        duration_ms: analysis._meta?.durationMs,
        confidence: analysis.confidence,
        errors_found: analysis.errors.length,
        total_recoverable: analysis.total_recoverable,
      },
    });

    return NextResponse.json({ success: true, caseId }, { status: 200 });

  } catch (globalError) {
    console.error('[API/Analyse] Global uncaught error:', globalError);
    return NextResponse.json({ error: 'An unexpected internal error occurred' }, { status: 500 });
  }
}
