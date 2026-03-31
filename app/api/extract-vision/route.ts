import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyseImages } from '@/lib/claude/analyse-vision';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'AUTH_ERROR' }, { status: 401 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0 || files.length > 2) {
      return NextResponse.json({ error: 'Please submit 1 or 2 images maximum.' }, { status: 400 });
    }

    const tempPaths: string[] = [];
    const base64Images: { data: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }[] = [];

    // 3. Store temp files and get base64
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WEBP allowed.' }, { status: 400 });
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB sanity check post-compression
        return NextResponse.json({ error: 'File too large even after compression.' }, { status: 400 });
      }

      const tempId = uuidv4();
      const path = `${user.id}/temp/${tempId}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const buffer = Buffer.from(await file.arrayBuffer());
      
      const { error: uploadError } = await supabase.storage
        .from('bills')
        .upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('[Vision Extract] Temp upload error:', uploadError);
        return NextResponse.json({ error: 'Failed to temporarily store image.' }, { status: 500 });
      }

      tempPaths.push(path);
      base64Images.push({
        data: buffer.toString('base64'),
        mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
      });
    }

    // 4. Claude Vision Extraction
    let analysis;
    try {
      analysis = await analyseImages(base64Images);
    } catch (analysisError) {
      console.error('[Vision Extract] Claude Error:', analysisError);
      
      // Cleanup temp files on analysis failure
      await supabase.storage.from('bills').remove(tempPaths);

      return NextResponse.json({ 
        error: 'We could not properly read the bill. Please ensure good lighting and try again.' 
      }, { status: 500 });
    }

    // 5. Return extraction details for user preview
    return NextResponse.json({
      success: true,
      analysis,
      tempPaths
    }, { status: 200 });

  } catch (err) {
    console.error('[Vision Extract] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
