/**
 * Tariff Research Retry Cron
 *
 * Processes tariff_gaps_v1 rows with retry_count < 3 by re-running
 * the VeriCite pipeline. Updates retry_count and last_attempted_at.
 *
 * Runs via Railway cron (scheduled, not user-triggered).
 * Protected by CRON_SECRET header check.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { researchTariff } from '@/lib/tariff/gazette-fetcher';

const MAX_RETRIES = 3;
const BATCH_LIMIT = 5; // Process up to 5 gaps per cron run to avoid timeout

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/** Municipality ID → display name (mirrors gazette-fetcher) */
const MUNICIPALITY_NAMES: Record<string, string> = {
  cct: 'City of Cape Town',
  coj: 'City of Johannesburg',
  cot: 'City of Tshwane',
  eth: 'eThekwini',
  ekr: 'Ekurhuleni',
  nmb: 'Nelson Mandela Bay',
  bcm: 'Buffalo City',
  man: 'Mangaung',
};

export async function POST(req: NextRequest) {
  // ── Auth check ───────────────────────────────────────────────────────
  const cronSecret = req.headers.get('authorization');
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const results: Array<{ gap_id: string; success: boolean; error?: string }> = [];

  try {
    // ── Fetch pending gaps ─────────────────────────────────────────────
    const { data: gaps, error: fetchError } = await supabase
      .from('tariff_gaps_v1')
      .select('*')
      .lt('retry_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch gaps: ${fetchError.message}` },
        { status: 500 },
      );
    }

    if (!gaps || gaps.length === 0) {
      return NextResponse.json({ message: 'No pending gaps to retry', processed: 0 });
    }

    console.log(`[tariff-research-retry] Processing ${gaps.length} gaps`);

    // ── Process each gap ───────────────────────────────────────────────
    for (const gap of gaps) {
      const municipalityName =
        MUNICIPALITY_NAMES[gap.municipality_id] || gap.municipality_id;

      const billingMonth = gap.billing_month
        ? new Date(gap.billing_month)
        : new Date();

      try {
        const result = await researchTariff({
          municipality_id: gap.municipality_id,
          municipality_name: municipalityName,
          billing_month: billingMonth,
          utility_type: gap.utility_type,
        });

        // Update retry tracking
        await supabase
          .from('tariff_gaps_v1')
          .update({
            retry_count: (gap.retry_count || 0) + 1,
            last_attempted_at: new Date().toISOString(),
            ...(result.success ? { status: 'RESOLVED' } : {}),
          })
          .eq('id', gap.id);

        results.push({
          gap_id: gap.id,
          success: result.success,
          error: result.error,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[tariff-research-retry] Gap ${gap.id} exception: ${msg}`);

        await supabase
          .from('tariff_gaps_v1')
          .update({
            retry_count: (gap.retry_count || 0) + 1,
            last_attempted_at: new Date().toISOString(),
          })
          .eq('id', gap.id);

        results.push({ gap_id: gap.id, success: false, error: msg });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `[tariff-research-retry] Done: ${succeeded} resolved, ${failed} failed`,
    );

    return NextResponse.json({
      processed: results.length,
      succeeded,
      failed,
      results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[tariff-research-retry] Cron exception: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
