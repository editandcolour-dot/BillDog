import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'AUTH_ERROR' }, { status: 401 });
    }

    // 2. Extract file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 3. Server-side validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const { type, name } = file;
    const isHeic = name.toLowerCase().endsWith('.heic');
    if (!ALLOWED_MIME_TYPES.includes(type) && !isHeic) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, PNG, or HEIC allowed.' }, { status: 400 });
    }

    // 4. Fetch user profile for municipality/account data
    const { data: profile } = await supabase
      .from('profiles')
      .select('municipality, account_number')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.municipality || !profile.account_number) {
      return NextResponse.json({ error: 'Missing profile details. Please complete onboarding.' }, { status: 403 });
    }

    // 5. Generate unique paths
    const caseId = uuidv4();
    // Sanitize filename to prevent directory traversal or weird characters
    const sanitizedName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const storagePath = `${user.id}/${caseId}/${timestamp}_${sanitizedName}`;

    // 6. Upload to Supabase Storage (buffer to bypass Next.js FormData limitations)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('bills')
      .upload(storagePath, buffer, {
        contentType: type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload Route] Storage error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload bill to secure storage.' }, { status: 500 });
    }

    // 7. Create Case record
    const { error: dbError } = await supabase
      .from('cases')
      .insert({
        id: caseId,
        user_id: user.id,
        status: 'uploading',
        bill_url: storagePath,
        municipality: profile.municipality,
        account_number: profile.account_number,
      });

    if (dbError) {
      console.error('[Upload Route] Database error:', dbError);
      // We could ideally delete the storage object here to cleanup, but for now just fail
      return NextResponse.json({ error: 'Failed to create case record.' }, { status: 500 });
    }

    return NextResponse.json({ caseId, billUrl: storagePath }, { status: 200 });
  } catch (error) {
    console.error('[Upload Route] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during upload.' }, { status: 500 });
  }
}
