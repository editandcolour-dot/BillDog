// app/api/cron/escalation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runEscalationEngine } from '@/lib/escalation/escalationEngine';
import { verifyQStashSignature } from '@/lib/qstash/verify';

export async function POST(request: NextRequest) {
  // Verify QStash signature
  const isValid = await verifyQStashSignature(request);
  if (!isValid) {
    console.warn('[cron/escalation] Invalid QStash signature');
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 });
  }

  try {
    await runEscalationEngine();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[cron/escalation] Internal failure in Run Escalation Engine', err);
    return NextResponse.json({ success: false, error: 'Engine trigger failed' }, { status: 500 });
  }
}
