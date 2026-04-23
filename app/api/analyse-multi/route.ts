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
import { parseCoctBill } from '@/lib/parsers/coct-bill-parser';

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

    const RETRYABLE = ['uploading', 'analysing', 'closed'];
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
          const pb = parseCoctBill(billText) || { rates: [], hucCharges: [], invoiceNumber: 'N/A', billingDate: analysis.bill_period || 'N/A' } as any;
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
          total_billed: analysis.total_billed,
          errors_found: analysis.errors,
          recoverable: analysis.total_recoverable,
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

    // 9. Aggregate & update case
    const totalRecoverable = analysed.reduce(
      (sum, b) => sum + (b.analysis.total_recoverable || 0), 0,
    );
    const totalBilled = analysed.reduce(
      (sum, b) => sum + (b.analysis.total_billed || 0), 0,
    );
    const periods = analysed
      .map(b => b.bill_period)
      .filter(Boolean)
      .sort();

    // ── CRITICAL: Build errors_found from per-bill deterministic errors ──
    // The cross-analysis Claude call generates `recurring_errors` which may
    // differ from (or drop) the actual per-bill findings. The DB must store
    // the real per-bill errors. The UI reads errors_found for display.
    const allPerBillErrors = analysed.flatMap(b => 
      (b.analysis.errors || []).map(e => ({
        ...e,
        bill_period: b.bill_period,
      }))
    );

    // NOTE: We do NOT overwrite crossAnalysis.recurring_errors — it uses the RecurringError type
    // from Claude which has different fields (months_affected, total_overcharged).
    // The UI falls back to errors_found (which contains the real per-bill errors) when
    // cross_analysis.recurring_errors is empty or missing. The important thing is that
    // errors_found on the cases table contains the deterministic per-bill errors.

    console.log(`[analyse-multi] PIPELINE TRACE: totalRecoverable=${totalRecoverable}, allPerBillErrors=${allPerBillErrors.length}`);

    const finalStatus = allPerBillErrors.length > 0 ? 'letter_ready' : 'closed';
    console.log(`[analyse-multi] FINAL STATUS: ${finalStatus} (${allPerBillErrors.length} errors, R${totalRecoverable.toFixed(2)} recoverable)`);

    await supabase.from('cases').update({
      status: finalStatus,
      errors_found: allPerBillErrors,
      recoverable: totalRecoverable,
      total_billed: totalBilled,
      total_recoverable_all: totalRecoverable,
      cross_analysis: crossAnalysis,
      date_range_start: periods[0] || null,
      date_range_end: periods[periods.length - 1] || null,
      bill_period: periods.length > 1
        ? `${periods[0]} to ${periods[periods.length - 1]}`
        : periods[0] || null,
      updated_at: new Date().toISOString(),
    }).eq('id', caseId);

    console.log(`[analyse-multi] DB WRITE: status=${finalStatus}, errors_found.length=${allPerBillErrors.length}, recoverable=${totalRecoverable}`);

    const groundTruthCount = analysed.filter(b => b.analysis._meta?.groundTruth).length;

    // 10. Log event
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'multi_analysis_complete',
      note: `${analysed.length} bills analysed (${failedCount} failed). ${groundTruthCount} used Ground Truth. R${totalRecoverable.toFixed(2)} recoverable.`,
      metadata: {
        bills_analysed: analysed.length,
        bills_failed: failedCount,
        total_recoverable: totalRecoverable,
        has_cross_analysis: !!crossAnalysis,
        ground_truth_count: groundTruthCount,
      },
    });

    return NextResponse.json({
      success: true,
      caseId,
      billsAnalysed: analysed.length,
      billsFailed: failedCount,
      totalRecoverable,
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
