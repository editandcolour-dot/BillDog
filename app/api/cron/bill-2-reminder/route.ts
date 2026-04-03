import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBill2Reminder } from '@/lib/resend/bill2-reminder';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Find cases where letter sent 30 days ago, not resolved/closed/escalated, and no escalation sent yet
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: cases, error } = await supabase
      .from('cases')
      .select('id, municipality, user_id, status')
      .lt('letter_sent_at', thirtyDaysAgo.toISOString())
      .in('status', ['sent', 'acknowledged'])
      .is('escalation_sent_at', null);

    if (error) {
      console.error('[API/Cron/Bill2Reminder] DB lookup failed:', error);
      return NextResponse.json({ error: 'Database lookup failed' }, { status: 500 });
    }

    let sentCount = 0;

    for (const c of cases) {
      try {
        const { data: profile } = await supabase.from('profiles').select('email').eq('id', c.user_id).single();
        if (profile?.email) {
          await sendBill2Reminder(profile.email, c.id, c.municipality);
          
          await supabase.from('case_events').insert({
            case_id: c.id,
            event_type: 'escalated',
            note: '30-day window passed. Requested Bill 2 upload from user.',
          });
          
          sentCount++;
        }
      } catch (err) {
         console.error(`[API/Cron/Bill2Reminder] Failed to send to case ${c.id}:`, err);
      }
    }

    return NextResponse.json({ success: true, processed: cases.length, emailsSent: sentCount }, { status: 200 });

  } catch (error) {
    console.error('[API/Cron/Bill2Reminder] Unexpected failure:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
