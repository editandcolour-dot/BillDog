import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  try {
    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const resolvedParams = await params;
    const caseId = resolvedParams.id;

    // 2. Parse body
    let body;
    try {
      const textBody = await request.text();
      if (!textBody) return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
      body = JSON.parse(textBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { letter_content } = body;
    if (!letter_content || typeof letter_content !== 'string') {
      return NextResponse.json({ error: 'letter_content is required' }, { status: 400 });
    }

    // 3. Ownership check
    const { data: caseRecord, error: dbError } = await supabase
      .from('cases')
      .select('user_id')
      .eq('id', caseId)
      .single();

    if (dbError || !caseRecord || caseRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }

    // 4. Update letter content
    const { error: updateError } = await supabase
      .from('cases')
      .update({ letter_content })
      .eq('id', caseId);

    if (updateError) {
      console.error('[API/Letter PATCH] Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to save letter edits' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (globalError) {
    console.error('[API/Letter PATCH] Global error:', globalError);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
