import { NextRequest, NextResponse } from 'next/server';
import { verifyQStashSignature } from '@/lib/qstash/verify';
import { evaluateFailureRateAndAlert } from '@/lib/autofetch/alert';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // 1. Verify signature
  const isValid = await verifyQStashSignature(request);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 });
  }

  try {
    const result = await evaluateFailureRateAndAlert();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[autofetch/monthly-alert] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
