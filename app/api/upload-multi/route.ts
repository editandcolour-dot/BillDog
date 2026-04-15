import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRateLimiter, rateLimitExceededResponse } from '@/lib/rate-limit';

const uploadLimiter = getRateLimiter(5, '1 h');
const MAX_BILLS = 36;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { success } = await uploadLimiter.limit(`upload_multi_${user.id}`);
    if (!success) return rateLimitExceededResponse();

    // 2. Parse JSON body instead of FormData
    const body = await request.json();
    const { caseId, existingCaseId, files } = body;

    if (!files || !files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // 3. Prevent exceeding MAX_BILLS limit
    let existingCount = 0;
    if (existingCaseId) {
      const { count } = await supabase
        .from('case_bills')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', existingCaseId);
      existingCount = count || 0;
    }

    if (existingCount + files.length > MAX_BILLS) {
      return NextResponse.json({
        error: `Maximum ${MAX_BILLS} bills per case. You have ${existingCount}, tried to add ${files.length}.`,
      }, { status: 400 });
    }

    // 4. Validate user profile is fully onboarded
    const { data: profile } = await supabase
      .from('profiles')
      .select('municipality, account_number')
      .eq('id', user.id)
      .single();

    if (!profile?.municipality || !profile?.account_number) {
      return NextResponse.json(
        { error: 'Please complete onboarding first (municipality + account number).' },
        { status: 403 },
      );
    }

    // 5. Create or retrieve Case
    const finalCaseId = existingCaseId || caseId;

    if (!existingCaseId) {
      const { error: caseError } = await supabase.from('cases').insert({
        id: finalCaseId,
        user_id: user.id,
        status: 'uploading',
        municipality: profile.municipality,
        account_number: profile.account_number,
      });

      if (caseError) {
        console.error('[upload-multi] Case creation failed:', caseError);
        return NextResponse.json({ error: 'Failed to create case.' }, { status: 500 });
      }
    }

    // 6. Bulk Insert database records natively mapping to the frontend-uploaded files
    const failed: { filename: string; error: string }[] = [];
    const uploaded: { id: string; filename: string }[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      const { error: rowError } = await supabase.from('case_bills').insert({
        id: fileData.id,
        case_id: finalCaseId,
        bill_url: fileData.bill_url,
        original_filename: fileData.original_filename,
        file_size_bytes: fileData.file_size_bytes,
        mime_type: fileData.mime_type,
        sort_order: existingCount + i,
        parse_status: 'pending',
        analysis_status: 'pending',
      });

      if (rowError) {
        console.error(`[upload-multi] DB insert error for ${fileData.original_filename}:`, rowError);
        failed.push({ filename: fileData.original_filename, error: 'Database insert failed' });
      } else {
        uploaded.push({ id: fileData.id, filename: fileData.original_filename });
      }
    }

    // 7. Cleanup if absolutely nothing injected cleanly
    if (uploaded.length === 0) {
      if (!existingCaseId) {
        await supabase.from('cases').delete().eq('id', finalCaseId);
      }
      return NextResponse.json({
        error: 'All database inserts failed.',
        failed,
      }, { status: 500 });
    }

    return NextResponse.json({
      caseId: finalCaseId,
      uploaded: uploaded.length,
      failed: failed.length,
      total: existingCount + uploaded.length,
      bills: uploaded,
      failures: failed.length > 0 ? failed : undefined,
    });
  } catch (error) {
    console.error('[upload-multi] Global error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred finalizing the upload.' },
      { status: 500 },
    );
  }
}
