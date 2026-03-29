import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Await params in Next.js 14 App Router
    const caseId = await Promise.resolve(params.id);

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    // 3. Fetch Case Record
    const { data: caseRecord, error: dbError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (dbError || !caseRecord) {
      console.error('[Cases API] Database fetch error:', dbError);
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // 4. Case Ownership Check (redundant with RLS, but safe)
    if (caseRecord.user_id !== user.id) {
      console.error(`[Cases API] Ownership violation attempt on Case ${caseId} by User ${user.id}`);
      return NextResponse.json({ error: 'Unauthorised access' }, { status: 403 });
    }

    // Return the full record
    return NextResponse.json({ case: caseRecord, userEmail: user.email }, { status: 200 });

  } catch (error) {
    console.error('[Cases API] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
