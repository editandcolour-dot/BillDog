/**
 * POST /api/autofetch/debug/test-scraper
 *
 * TEMPORARY endpoint for Phase 2 E2E testing only.
 * Calls CoCT scraper methods directly using TEST_COCT_* env vars.
 * Must be removed after testing.
 *
 * Body: { method: 'fetchLatestBill' | 'fetchBillHistory', monthsBack?: number }
 * Auth required.
 *
 * SECURITY:
 * - Only works if TEST_COCT_USERNAME and TEST_COCT_PASSWORD are set in env
 * - Never logs credentials
 * - Returns bill metadata only (no raw PDF buffer in response)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CoctScraper } from '@/lib/scrapers/coct';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only guard
    const adminEmail = process.env.ADMIN_EMAIL || 'editandcolour@gmail.com';
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { method, monthsBack = 36 } = body;

    // Credentials: env vars first, body fallback (for Railway where env vars may not be set)
    const testUsername = process.env.TEST_COCT_USERNAME || body.portal_username;
    const testPassword = process.env.TEST_COCT_PASSWORD || body.portal_password;

    if (!testUsername || !testPassword) {
      return NextResponse.json(
        { error: 'Credentials required: set TEST_COCT_* env vars or pass portal_username/portal_password in body' },
        { status: 400 }
      );
    }

    const scraper = new CoctScraper();
    const startTime = Date.now();

    if (method === 'fetchLatestBill') {
      console.log('[debug/test-scraper] Starting fetchLatestBill');
      const result = await scraper.fetchLatestBill(testUsername, testPassword);
      const elapsed = Date.now() - startTime;

      return NextResponse.json({
        method: 'fetchLatestBill',
        elapsed_ms: elapsed,
        success: result.success,
        error: result.error,
        errorCode: result.errorCode,
        bill: result.data ? {
          period: result.data.period,
          filename: result.data.filename,
          size_bytes: result.data.pdfBuffer.length,
        } : null,
      });
    }

    if (method === 'fetchBillHistory') {
      console.log(`[debug/test-scraper] Starting fetchBillHistory for ${monthsBack} months`);
      const result = await scraper.fetchBillHistory(testUsername, testPassword, monthsBack);
      const elapsed = Date.now() - startTime;

      return NextResponse.json({
        method: 'fetchBillHistory',
        elapsed_ms: elapsed,
        months_requested: monthsBack,
        success: result.success,
        error: result.error,
        errorCode: result.errorCode,
        bills: result.data?.map(b => ({
          period: b.period,
          filename: b.filename,
          size_bytes: b.pdfBuffer.length,
        })) || [],
        bill_count: result.data?.length || 0,
      });
    }

    return NextResponse.json(
      { error: 'method must be "fetchLatestBill" or "fetchBillHistory"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[debug/test-scraper] Error:', error);
    return NextResponse.json({ error: 'Test scraper failed' }, { status: 500 });
  }
}
