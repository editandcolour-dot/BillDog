import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractCaseId, sanitizeEmailPreview, verifyResendWebhook } from '@/lib/resend/inbound';
import { parseMunicipalityResponse } from '@/lib/claude/parse-municipality-response';
import { processSuccessFee, calculateFee } from '@/lib/payfast/charge';
import { sendResolutionSuccessEmail, sendResolutionConfirmEmail } from '@/lib/resend/notifications';

/**
 * Validates the inbound webhook signature.
 * Prevents unauthorized payloads matching our signature constraints.
 */
function getWebhookSecret(): string {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('[FATAL] RESEND_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text();
    const headers = {
      'svix-id': request.headers.get('svix-id') || '',
      'svix-timestamp': request.headers.get('svix-timestamp') || '',
      'svix-signature': request.headers.get('svix-signature') || '',
    };

    type ResendEvent = { type?: string; data?: { to?: string | string[]; from?: string; subject?: string; text?: string } };
    let event: ResendEvent;
    try {
      event = verifyResendWebhook(rawBody, headers, getWebhookSecret()) as ResendEvent;
    } catch (err: unknown) {
      console.warn('[API/ResendInbound] Webhook signature invalid', err);
      // Return 401 per security rule
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Only process email.received events
    if (event.type !== 'email.received') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const { to, from, subject, text } = event.data || {};

    // Find the primary recipient looking like case-{id}@disputes.billdog.co.za
    let caseId: string | null = null;
    const toAddresses = Array.isArray(to) ? to : [to];
    
    for (const address of toAddresses) {
      if (typeof address === 'string') {
        const extracted = extractCaseId(address);
        if (extracted) {
          caseId = extracted;
          break;
        }
      }
    }

    if (!caseId) {
      console.warn('[API/ResendInbound] Received email with no valid caseId mapped:', to);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // Process using Service Role since this is an unauthenticated webhook
    const supabase = createAdminClient();

    // Verify case exists
    const { data: caseRecord, error: fetchError } = await supabase
      .from('cases')
      .select('id, status, user_id')
      .eq('id', caseId)
      .single();

    if (fetchError || !caseRecord) {
      console.warn(`[API/ResendInbound] Case ${caseId} not found or db error`, fetchError);
      return NextResponse.json({ status: 'case_not_found' }, { status: 200 });
    }

    const updates: { status?: string; amount_recovered?: number; resolved_at?: string } = {};

    // Parse the email body
    const resolution = await parseMunicipalityResponse(text || '');

    if (resolution.amount_found && resolution.confidence === 'high' && resolution.amount && resolution.amount > 0) {
      // FEAT A1: High confidence auto-resolve
      const { data: profile } = await supabase
        .from('profiles')
        .select('payfast_token, email')
        .eq('id', caseRecord.user_id)
        .single();
      
      if (profile && profile.payfast_token) {
        updates.status = 'resolved';
        updates.amount_recovered = resolution.amount;
        updates.resolved_at = new Date().toISOString();

        await supabase.from('cases').update(updates).eq('id', caseId);
        await supabase.from('case_events').insert({
          case_id: caseId,
          event_type: 'resolved',
          note: `Municipality email parsed with high confidence. Recovered R${resolution.amount.toFixed(2)}.`,
        });

        // Trigger charge
        await processSuccessFee(caseId, resolution.amount, profile.payfast_token);
        const { fee } = calculateFee(resolution.amount);

        // Email user
        await sendResolutionSuccessEmail(profile.email, resolution.amount, fee, caseId);

        return NextResponse.json({ status: 'ok', resolved: true }, { status: 200 });
      } else {
         // High confidence but no card on file -> fallback to low confidence flow
         resolution.confidence = 'low';
      }
    }

    if (resolution.amount_found && resolution.confidence === 'low') {
      // FEAT A2: Low confidence verify
       updates.status = 'acknowledged';
       await supabase.from('cases').update(updates).eq('id', caseId);

       const { data: profile } = await supabase.from('profiles').select('email').eq('id', caseRecord.user_id).single();
       if (profile?.email) {
          await sendResolutionConfirmEmail(profile.email, caseId, resolution.amount);
       }
    } else {
      // FEAT A3: No amount found -> just acknowledge
      if (caseRecord.status === 'sent') {
        updates.status = 'acknowledged';
        await supabase.from('cases').update(updates).eq('id', caseId);
      }
    }

    // Log the response to the timeline events
    const { error: insertError } = await supabase
      .from('case_events')
      .insert({
        case_id: caseId,
        event_type: 'municipality_responded',
        note: `Received formal response from municipality.`,
        metadata: {
          from_email: from || 'Unknown Sender',
          subject: subject || 'No Subject',
          preview: sanitizeEmailPreview(text, 500),
          parsed_amount: resolution.amount,
          parsed_confidence: resolution.confidence,
          received_at: new Date().toISOString()
        }
      });

    if (insertError) {
      console.error(`[API/ResendInbound] Failed to insert case_event for ${caseId}:`, insertError);
      return NextResponse.json({ error: 'Database failure' }, { status: 500 });
    }

    // Resend demands incredibly fast responses -> 200 OK immediately
    return NextResponse.json({ status: 'ok', caseId }, { status: 200 });
    
  } catch (err: unknown) {
    console.error('[API/ResendInbound] Unhandled webhook error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
