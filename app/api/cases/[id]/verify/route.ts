// Vercel max duration limit override for heavy Claude comparison
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseBillFile } from '@/lib/pdf/parse';
import { compareBills } from '@/lib/claude/compare-bills';
import { processSuccessFee } from '@/lib/payfast/charge';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const caseId = resolvedParams.id;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // 1. Fetch original case
    const { data: caseRecord, error: caseError } = await supabase
      .from('cases')
      .select('errors_found, total_billed, recoverable')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single();

    if (caseError || !caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // 2. Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${caseId}/bill_2_${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bills')
      .upload(fileName, file);

    if (uploadError) {
      console.error('[API/Verify] Upload failed:', uploadError);
      return NextResponse.json({ error: 'Failed to upload document.' }, { status: 500 });
    }

    const { data: publicUrl } = supabase.storage.from('bills').getPublicUrl(uploadData.path);

    // Save Bill 2 URL
    await supabase.from('cases').update({ bill_2_file_url: publicUrl.publicUrl }).eq('id', caseId);

    // 3. Extract text from Bill 2
    const buffer = Buffer.from(await file.arrayBuffer());
    let bill2Text = '';
    
    try {
      bill2Text = await parseBillFile(buffer, file.type);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid file type.' }, { status: 400 });
    }

    // 4. Run Claude Comparison
    const bill1Context = {
      errors_found: caseRecord.errors_found,
      total_billed: caseRecord.total_billed,
      recoverable: caseRecord.recoverable
    };

    const comparison = await compareBills(bill1Context, bill2Text);

    // 5. Branch Logic
    if (comparison.resolved && comparison.amount_recovered > 0) {
      // Bill is corrected!
      await supabase.from('cases').update({
        status: 'resolved',
        amount_recovered: comparison.amount_recovered,
        resolved_at: new Date().toISOString()
      }).eq('id', caseId);

      await supabase.from('case_events').insert({
        case_id: caseId,
        event_type: 'resolved',
        note: `AI verified correction on Bill 2. R${comparison.amount_recovered.toFixed(2)} recovered.`,
        metadata: { changes: comparison.changes }
      });

      // Fetch payment token and charge
      const { data: profile } = await supabase.from('profiles').select('payfast_token').eq('id', user.id).single();
      if (profile?.payfast_token) {
        await processSuccessFee(caseId, comparison.amount_recovered, profile.payfast_token);
      }

      return NextResponse.json({ success: true, resolved: true, amount: comparison.amount_recovered });
    } else {
      // Bill is NOT corrected yet.
      await supabase.from('cases').update({
        status: 'escalating'
      }).eq('id', caseId);

      await supabase.from('case_events').insert({
        case_id: caseId,
        event_type: 'escalated',
        note: `AI compared Bill 2. No corrections found. Case set to escalating.`,
      });

      // Note: The nightly escalate cron will pick this up and send the Stage 2 letter automatically.
      return NextResponse.json({ success: true, resolved: false });
    }

  } catch (error) {
    console.error('[API/Verify] Unexpected error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
