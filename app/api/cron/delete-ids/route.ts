import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate cron using env secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminSupabase = createAdminClient(url, key);

    // 2. Call the secure RPC to wipe expired IDs
    const { data: deletedCount, error: rpcError } = await adminSupabase.rpc('wipe_poppi_ids');

    if (rpcError) {
      console.error('[Cron/Delete IDs] rpc error:', rpcError);
      return NextResponse.json({ error: 'Failed to wipe expired IDs' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully wiped ${deletedCount || 0} expired IDs from Vault.` 
    }, { status: 200 });

  } catch (err) {
    console.error('[Cron/Delete IDs] Unexpected Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
