import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkPrescription } from '@/lib/validators/prescription';
import type { ServiceType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'AUTH_ERROR' }, { status: 401 });
    }

    const body = await request.json();
    const { analysis, tempPaths } = body;

    if (!analysis || !tempPaths) {
      return NextResponse.json({ error: 'Missing analysis or tempPaths payload' }, { status: 400 });
    }

    // 2. Prescription checks on extracted errors
    const prescription_warnings = (analysis.errors || []).map((err: { service_type: ServiceType; }) => {
      const serviceType = err.service_type;
      return checkPrescription(analysis.bill_period, serviceType);
    });

    const caseId = uuidv4();
    const finalStatus = analysis.errors.length > 0 ? 'letter_ready' : 'closed';

    // 3. Insert new Case
    const { error: dbError } = await supabase.from('cases').insert({
      id: caseId,
      user_id: user.id,
      status: finalStatus,
      bill_url: 'discarded_vision_capture', // Mark as deleted immediately per MVP
      bill_text: analysis.bill_text || 'Discarded (Vision)',
      errors_found: analysis.errors,
      recoverable: analysis.total_recoverable,
      total_billed: analysis.total_billed,
      bill_period: analysis.bill_period,
      prescription_warnings: prescription_warnings,
      municipality: analysis.municipality_detected || 'Unknown',
      account_number: analysis.account_number || 'Unknown',
    });

    if (dbError) {
      console.error('[Create Vision Case] DB error:', dbError);
      return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });
    }

    // 4. Log Success Event
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'uploaded',
      note: 'User verified bill data via Vision Extraction MVP. Images successfully deleted.',
    });

    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'analysed',
      note: `Bill analysed natively with Vision. ${analysis.errors.length} issues found.`,
      metadata: {
        model: 'claude-sonnet-4-vision',
        confidence: analysis.confidence,
        account_confidence: analysis.account_confidence,
        total_confidence: analysis.total_confidence,
        errors_found: analysis.errors.length,
        total_recoverable: analysis.total_recoverable,
      },
    });

    // 5. Cleanup Temp Storage asynchronously
    if (tempPaths.length > 0) {
      supabase.storage.from('bills').remove(tempPaths).then(({ error }) => {
        if (error) {
          console.error(`[Cleanup Temp Paths] Failed to delete temp paths: ${tempPaths.join(', ')}`, error);
        } else {
          console.log(`[Cleanup Temp Paths] Deleted ${tempPaths.length} temp images.`);
        }
      });
    }

    return NextResponse.json({ success: true, caseId }, { status: 200 });

  } catch (err) {
    console.error('[Create Vision Case] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
