import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { getRateLimiter, rateLimitExceededResponse } from '@/lib/rate-limit';

const uploadLimiter = getRateLimiter(5, '1 h');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_BILLS = 36;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
];

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

    // 2. Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const existingCaseId = formData.get('caseId') as string | null;

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // 3. If adding to existing case, check total won't exceed 36
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

    // 4. Validate each file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `"${file.name}" exceeds the 10MB limit.` },
          { status: 400 },
        );
      }
      if (file.size === 0) {
        return NextResponse.json(
          { error: `"${file.name}" is empty.` },
          { status: 400 },
        );
      }
      const isHeic = file.name.toLowerCase().endsWith('.heic');
      if (!ALLOWED_MIME_TYPES.includes(file.type) && !isHeic) {
        return NextResponse.json(
          { error: `"${file.name}": only PDF, JPG, PNG, or HEIC allowed.` },
          { status: 400 },
        );
      }
    }

    // 5. Profile check
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

    // 6. Create case if new
    const caseId = existingCaseId || uuidv4();

    if (!existingCaseId) {
      const { error: caseError } = await supabase.from('cases').insert({
        id: caseId,
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

    // 7. Upload each file sequentially + create case_bills rows
    const uploaded: { id: string; filename: string }[] = [];
    const failed: { filename: string; error: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const billId = uuidv4();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${caseId}/${billId}_${sanitizedName}`;

      try {
        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await supabase.storage
          .from('bills')
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error(`[upload-multi] Storage error for ${file.name}:`, uploadError);
          failed.push({ filename: file.name, error: 'Storage upload failed' });
          continue;
        }

        const { error: rowError } = await supabase.from('case_bills').insert({
          id: billId,
          case_id: caseId,
          bill_url: storagePath,
          original_filename: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          sort_order: existingCount + i,
          parse_status: 'pending',
          analysis_status: 'pending',
        });

        if (rowError) {
          console.error(`[upload-multi] DB insert error for ${file.name}:`, rowError);
          failed.push({ filename: file.name, error: 'Database insert failed' });
          continue;
        }

        uploaded.push({ id: billId, filename: file.name });
      } catch (err) {
        console.error(`[upload-multi] Unexpected error for ${file.name}:`, err);
        failed.push({
          filename: file.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // 8. If nothing uploaded at all, clean up
    if (uploaded.length === 0) {
      if (!existingCaseId) {
        await supabase.from('cases').delete().eq('id', caseId);
      }
      return NextResponse.json({
        error: 'All uploads failed.',
        failed,
      }, { status: 500 });
    }

    return NextResponse.json({
      caseId,
      uploaded: uploaded.length,
      failed: failed.length,
      total: existingCount + uploaded.length,
      bills: uploaded,
      failures: failed.length > 0 ? failed : undefined,
    });
  } catch (error) {
    console.error('[upload-multi] Global error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during upload.' },
      { status: 500 },
    );
  }
}
