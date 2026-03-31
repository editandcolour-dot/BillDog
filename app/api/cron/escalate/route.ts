/**
 * POST /api/cron/escalate
 *
 * Nightly cron endpoint for automated dispute escalation.
 * Called by Railway cron at 10:00 UTC (12:00 SAST) daily.
 *
 * Security: Requires Authorization: Bearer ${CRON_SECRET} header.
 * One failed case never stops the batch.
 */

import { NextResponse } from 'next/server';
import { processEscalationBatch } from '@/lib/escalation/escalate-dispute';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max for batch processing

export async function POST(request: Request) {
  // ------------------------------------------------------------------
  // 1. Verify CRON_SECRET
  // ------------------------------------------------------------------
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    console.error('[cron/escalate] CRON_SECRET env var not set');
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // ------------------------------------------------------------------
  // 2. Run escalation batch
  // ------------------------------------------------------------------
  const startTime = Date.now();

  try {
    const result = await processEscalationBatch();
    const durationMs = Date.now() - startTime;

    console.log(
      `[cron/escalate] Batch complete: ${result.processed} processed, ` +
      `${result.succeeded} succeeded, ${result.failed} failed (${durationMs}ms)`,
    );

    return NextResponse.json({
      success: true,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      errors: result.errors,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/escalate] Batch failed:', msg);

    return NextResponse.json(
      {
        success: false,
        error: msg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
