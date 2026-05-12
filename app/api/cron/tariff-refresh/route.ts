/**
 * Tariff Refresh Cron — Monthly prune + gap detection + gap persistence.
 *
 * Phase 1 scope:
 *   1. Prune expired tariff cache rows (effective_to < NOW() - 36 months)
 *   2. Detect missing current-month tariffs for active municipalities
 *   3. Persist gaps to tariff_gaps_v1 table (queryable for research prioritisation)
 *
 * Triggered by Railway cron on the 1st of each month.
 * Authenticated via CRON_SECRET bearer token.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pruneExpiredTariffs, detectTariffGaps } from '@/lib/tariff/tariff-cache-v2';
import type { UtilityType } from '@/lib/tariff/types-v2';

export const dynamic = 'force-dynamic';

// Active municipalities in Billdog (expand as coverage grows)
const ACTIVE_MUNICIPALITIES = [
  { id: 'cct', name: 'City of Cape Town' },
  // Future: CoJ, CoT, CoE, ETH, NMBM, BCM, MMM
];

const REQUIRED_UTILITIES: UtilityType[] = ['electricity', 'water', 'sewer', 'refuse'];

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: Request) {
  // Auth check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const results: {
    pruned: number;
    gaps: { municipality: string; missing: UtilityType[] }[];
    gapsPersisted: number;
    errors: string[];
  } = {
    pruned: 0,
    gaps: [],
    gapsPersisted: 0,
    errors: [],
  };

  try {
    // 1. Prune expired rows
    console.log('[tariff-refresh] Pruning expired tariff cache rows...');
    results.pruned = await pruneExpiredTariffs();
    console.log(`[tariff-refresh] Pruned ${results.pruned} expired rows.`);

    // 2. Detect gaps for current date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const supabase = getServiceClient();

    for (const muni of ACTIVE_MUNICIPALITIES) {
      try {
        const missing = await detectTariffGaps(muni.id, today, REQUIRED_UTILITIES);

        if (missing.length > 0) {
          results.gaps.push({ municipality: muni.name, missing });
          console.warn(
            `[tariff-refresh] ⚠️  TARIFF GAP: ${muni.name} missing rates for: ${missing.join(', ')} (date: ${today})`
          );

          // 3. Persist gaps to tariff_gaps_v1 so they're queryable
          if (supabase) {
            for (const utilityType of missing) {
              const { error: gapError } = await supabase
                .from('tariff_gaps_v1')
                .upsert({
                  municipality: muni.id,
                  tariff_type: utilityType.toUpperCase(),
                  financial_year: `cron_${today}`,
                  sub_key: null,
                  bill_id: null,
                  status: 'PENDING',
                }, {
                  onConflict: 'municipality,tariff_type,financial_year',
                  ignoreDuplicates: true,
                });

              if (gapError) {
                // Table may not exist yet — suppress gracefully
                if (!gapError.message.includes('does not exist')) {
                  console.error(`[tariff-refresh] Failed to persist gap:`, gapError);
                  results.errors.push(`Gap persist failed: ${muni.name}/${utilityType}: ${gapError.message}`);
                }
              } else {
                results.gapsPersisted++;
              }
            }
          }
        } else {
          console.log(`[tariff-refresh] ✅ ${muni.name}: all utility tariffs cached for ${today}`);
        }
      } catch (err) {
        const msg = `Gap detection failed for ${muni.name}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[tariff-refresh] ${msg}`);
        results.errors.push(msg);
      }
    }

    // 4. Summary log
    const hasGaps = results.gaps.length > 0;
    if (hasGaps) {
      console.warn(
        `[tariff-refresh] ⚠️  ${results.gaps.length} municipality/ies have tariff gaps. ` +
        `${results.gapsPersisted} gaps persisted to tariff_gaps_v1. ` +
        `Manual data population required (gazette-fetcher is stubbed).`
      );
    }

    return NextResponse.json({
      success: true,
      pruned: results.pruned,
      gaps: results.gaps,
      gapsPersisted: results.gapsPersisted,
      errors: results.errors,
      message: hasGaps
        ? `Pruned ${results.pruned} rows. ${results.gaps.length} gap(s) detected, ${results.gapsPersisted} persisted — action required.`
        : `Pruned ${results.pruned} rows. All tariffs cached.`,
    });
  } catch (error) {
    console.error('[tariff-refresh] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

