import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidSaIdNumber } from '@/lib/popia/luhn';

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id: caseId } = await ctx.params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id_number } = body ?? {};
  if (typeof id_number !== 'string' || !isValidSaIdNumber(id_number)) {
    return NextResponse.json({ error: 'Invalid SA ID number' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('store_account_holder_id', {
    target_case_id: caseId,
    id_number,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ secret_id: data });
}
