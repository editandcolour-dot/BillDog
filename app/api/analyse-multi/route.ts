import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseBillFile } from '@/lib/pdf/parse';
import { analyseBill } from '@/lib/claude/analyse-bill';
import { checkPrescription } from '@/lib/validators/prescription';

import type { AnalysisResult, CaseBill } from '@/types/analysis';
import type { ServiceType } from '@/types';
import { getRateLimiter, rateLimitExceededResponse } from '@/lib/rate-limit';
import { classifyMunicipality } from '@/lib/tiers/tierClassifier';
import { generateTransparencyReport } from '@/lib/tiers/tier3Report';
import { getCurrentTariffYear } from '@/lib/tariff/tariffLookup';
import { getParser } from '@/lib/parsers/registry';
import { round2, roundErrors, aggregateCaseFromBills } from '@/lib/analysis/case-aggregation';

const analyseLimiter = getRateLimiter(100, '1 h');

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5min — up to 36 bills

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { success } = await analyseLimiter.limit(`analyse_multi_${user.id}`);
    if (!success) return rateLimitExceededResponse();

    // 2. Parse body
    const body = await request.json();
    const caseId = body.caseId as string;
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    // 3. Verify case ownership
    const { data: caseRecord, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single();

    if (caseError || !caseRecord) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }

    const RETRYABLE = ['uploading', 'analysing', 'closed', 'letter_ready'];
    if (!RETRYABLE.includes(caseRecord.status)) {
      return NextResponse.json({ error: 'Case is already processed' }, { status: 400 });
    }

    // 4. Lock status
    await supabase.from('cases')
      .update({ status: 'analysing', updated_at: new Date().toISOString() })
      .eq('id', caseId);

    // 5. Fetch all bills for this case
    const { data: bills, error: billsError } = await supabase
      .from('case_bills')
      .select('*')
      .eq('case_id', caseId)
      .order('sort_order', { ascending: true });

    if (billsError || !bills?.length) {
      // Fallback: legacy single-bill case
      if (caseRecord.bill_url) {
        return NextResponse.json({
          error: 'This is a single-bill case. Use /api/analyse instead.',
        }, { status: 400 });
      }
      await supabase.from('cases').update({ status: 'closed' }).eq('id', caseId);
      return NextResponse.json({ error: 'No bills found for this case' }, { status: 404 });
    }

    // 6. Process each bill: parse → analyse
    const analysed: { bill_id: string; bill_period: string; analysis: AnalysisResult }[] = [];
    let failedCount = 0;

    for (const bill of bills as CaseBill[]) {
      try {
        // 6a. Update parse status
        await supabase.from('case_bills')
          .update({ parse_status: 'parsing', updated_at: new Date().toISOString() })
          .eq('id', bill.id);

        // 6b. Download from storage
        const { data: fileData, error: dlError } = await supabase.storage
          .from('bills')
          .download(bill.bill_url);

        if (dlError || !fileData) {
          throw new Error(`Failed to download ${bill.original_filename}: ${dlError?.message}`);
        }

        // 6c. Determine MIME
        let mimeType = bill.mime_type || 'application/pdf';
        if (!mimeType || mimeType === 'application/octet-stream') {
          const ext = bill.bill_url.split('.').pop()?.toLowerCase();
          const mimeMap: Record<string, string> = {
            pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            png: 'image/png', heic: 'image/heic',
          };
          mimeType = (ext && mimeMap[ext]) || 'application/pdf';
        }

        // 6d. Parse text
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const billText = await parseBillFile(buffer, mimeType);

        await supabase.from('case_bills')
          .update({
            bill_text: billText,
            parse_status: 'parsed',
            analysis_status: 'analysing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bill.id);

        // 6e. Claude analysis (passing municipality)
        const analysis = await analyseBill(billText, caseRecord.municipality);
        console.log(`[analyse-multi] BILL ${bill.original_filename}: errors=${analysis.errors.length}, recoverable=${analysis.total_recoverable}, groundTruth=${analysis._meta?.groundTruth}`);
        const tier = classifyMunicipality(caseRecord.municipality);
        
        let transparencyReport = null;
        let pendingReanalysis = false;
        
        if (tier === 3) {
          // If the deterministic parser failed, provide a mock object for Universal Checks to run
          const parser = getParser(caseRecord.municipality);
          const pb = parser?.parse(billText) || { rates: [], hucCharges: [], invoiceNumber: 'N/A', billingDate: analysis.bill_period || 'N/A' } as any;
          transparencyReport = generateTransparencyReport(caseRecord.municipality, getCurrentTariffYear(), pb);
          pendingReanalysis = true;
        }

        // 6f. Prescription check
        const prescriptionWarnings = analysis.errors.map(err => {
          const serviceType = err.service_type as ServiceType;
          return checkPrescription(analysis.bill_period, serviceType);
        });

        // 6g. Save per-bill results
        await supabase.from('case_bills').update({
          bill_period: analysis.bill_period,
          total_billed: round2(analysis.total_billed),
          errors_found: roundErrors(analysis.errors),
          recoverable: round2(analysis.total_recoverable),
          analysis_status: 'complete',
          coverage_tier: tier,
          pending_reanalysis: pendingReanalysis,
          transparency_report: transparencyReport,
          updated_at: new Date().toISOString(),
        }).eq('id', bill.id);

        console.log(`[analyse-multi] BILL ${bill.original_filename} saved to case_bills: errors_found.length=${analysis.errors.length}`);

        analysed.push({
          bill_id: bill.id,
          bill_period: analysis.bill_period,
          analysis,
        });

      } catch (err) {
        failedCount++;
        console.error(`[analyse-multi] Bill ${bill.id} (${bill.original_filename}) failed:`, err);

        await supabase.from('case_bills').update({
          analysis_status: 'failed',
          error_message: err instanceof Error ? err.message : String(err),
          updated_at: new Date().toISOString(),
        }).eq('id', bill.id);
      }
    }

    // 7. If no bills analysed at all, close the case
    if (analysed.length === 0) {
      await supabase.from('cases').update({ status: 'closed' }).eq('id', caseId);
      return NextResponse.json({
        error: 'All bills failed analysis',
        failed: failedCount,
      }, { status: 500 });
    }

    // 8. Cross-bill analysis (SKIPPED)
    // We intentionally bypass Claude cross-analysis to ensure one single
    // source of truth: our aggregated deterministic validator findings.
    const crossAnalysis = null;

    // 9. Aggregate & update case — via the shared helper (also used by the
    // autofetch analysis worker) so both paths aggregate identically. The
    // helper stores the real per-bill deterministic errors in errors_found —
    // the UI reads errors_found for display and falls back to it when
    // cross_analysis.recurring_errors is empty or missing.
    const agg = aggregateCaseFromBills(analysed.map(b => ({
      bill_period: b.bill_period,
      errors: (b.analysis.errors || []) as unknown as Array<Record<string, unknown> & { overchargeZar?: number }>,
      total_billed: b.analysis.total_billed || 0,
      total_recoverable: b.analysis.total_recoverable || 0,
    })));

    console.log(`[analyse-multi] PIPELINE TRACE: totalRecoverable=${agg.recoverable}, allPerBillErrors=${agg.errors_found.length}`);
    console.log(`[analyse-multi] FINAL STATUS: ${agg.status} (${agg.errors_found.length} errors, R${agg.recoverable.toFixed(2)} recoverable)`);

    await supabase.from('cases').update({
      status: agg.status,
      errors_found: agg.errors_found,
      recoverable: agg.recoverable,
      total_billed: agg.total_billed,
      total_recoverable_all: agg.total_recoverable_all,
      cross_analysis: crossAnalysis,
      date_range_start: agg.date_range_start,
      date_range_end: agg.date_range_end,
      bill_period: agg.bill_period,
      updated_at: new Date().toISOString(),
    }).eq('id', caseId);

    console.log(`[analyse-multi] DB WRITE: status=${agg.status}, errors_found.length=${agg.errors_found.length}, recoverable=${agg.recoverable}`);

    const groundTruthCount = analysed.filter(b => b.analysis._meta?.groundTruth).length;

    // 10. Log event
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'multi_analysis_complete',
      note: `${analysed.length} bills analysed (${failedCount} failed). ${groundTruthCount} used Ground Truth. R${agg.recoverable.toFixed(2)} recoverable.`,
      metadata: {
        bills_analysed: analysed.length,
        bills_failed: failedCount,
        total_recoverable: agg.recoverable,
        has_cross_analysis: !!crossAnalysis,
        ground_truth_count: groundTruthCount,
      },
    });

    return NextResponse.json({
      success: true,
      caseId,
      billsAnalysed: analysed.length,
      billsFailed: failedCount,
      totalRecoverable: agg.recoverable,
      hasCrossAnalysis: !!crossAnalysis,
    });

  } catch (error) {
    console.error('[analyse-multi] Global error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during analysis.' },
      { status: 500 },
    );
  }
}
