// app/api/cron/escalation/route.ts
import { NextResponse } from 'next/server';
import { runEscalationEngine } from '@/lib/escalation/escalationEngine';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('[cron/escalation] Unauthorized request attempt');
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  try {
    await runEscalationEngine();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[cron/escalation] Internal failure in Run Escalation Engine', err);
    return NextResponse.json({ success: false, error: 'Engine trigger failed' }, { status: 500 });
  }
}
