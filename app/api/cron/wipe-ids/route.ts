// app/api/cron/wipe-ids/route.ts
//
// Daily POPIA enforcement cron — calls the wipe_poppi_ids() RPC defined in
// supabase/migrations/008_encrypted_id.sql to permanently delete encrypted
// SA ID numbers from Supabase Vault for cases whose 30-day post-resolution
// retention window has elapsed.
//
// Auth: Bearer ${CRON_SECRET} (matches the pattern used by
// /api/cron/escalation). Schedule via Vercel cron, Railway scheduled task,
// or QStash schedule with an Authorization header.
//
// Recommended schedule: 0 3 * * * Africa/Johannesburg (daily at 03:00 SAST).

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('wipe_poppi_ids');

    if (error) {
      console.error('[cron/wipe-ids] RPC failed', error);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    // wipe_poppi_ids returns an integer count of deleted secrets.
    const deleted = typeof data === 'number' ? data : 0;
    console.log(`[cron/wipe-ids] deleted ${deleted} expired ID secrets`);
    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('[cron/wipe-ids] unexpected error', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
