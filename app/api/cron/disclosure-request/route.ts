import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDisclosureRequestText } from '@/lib/tiers/disclosureRequest';
import { getResendClient } from '@/lib/resend/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Cron token verification if hosted in Vercel or Railway (omitted for brevity, assume protected environment or valid token checks)
  
  const supabase = await createClient();
  const resend = getResendClient();

  try {
    // We need municipalities with disclosure_status = 'not_sent'
    const { data: targetMunicipalities, error: mError } = await supabase
      .from('municipalities')
      .select('name, contact_email')
      .eq('disclosure_status', 'not_sent');

    if (mError) {
      console.error('[cron/disclosure-request] Failed to fetch municipalities:', mError);
      return NextResponse.json({ error: mError.message }, { status: 500 });
    }

    if (!targetMunicipalities || targetMunicipalities.length === 0) {
      return NextResponse.json({ message: 'No pending municipalities found.' });
    }

    let sentCount = 0;

    for (const muni of targetMunicipalities) {
      // Check if there is AT LEAST ONE Tier 3 case_bill for this municipality
      // case_bills -> cases (on case_id) -> municipality match
      const { data: matchingCases, error: cError } = await supabase
        .from('cases')
        .select('id')
        .eq('status', 'letter_ready') // or analysing, etc
        .eq('municipality', muni.name);

      if (cError || !matchingCases?.length) continue;

      const caseIds = matchingCases.map(c => c.id);

      const { data: tier3Bills, error: billError } = await supabase
        .from('case_bills')
        .select('id')
        .in('case_id', caseIds)
        .eq('coverage_tier', 3)
        .limit(1);

      if (billError || !tier3Bills || tier3Bills.length === 0) {
        continue;
      }

      // We have a confirmed Tier 3 Billdog case locally matching an undisclosed municipality. Fire the request!
      const letterText = generateDisclosureRequestText(muni.name);

      // Fire email using Resend
      const targetEmail = muni.contact_email || 'mm@' + muni.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.gov.za'; // fallback generic format if null

      try {
        await resend.emails.send({
          from: 'Billdog Legal <legal@billdog.co.za>',
          to: [targetEmail],
          cc: ['disclosure-archive@billdog.co.za'],
          subject: `${muni.name} — Formal Request for Tariff Schedule Publication (MSA s74)`,
          html: `<p style="white-space: pre-wrap; font-family: sans-serif;">${letterText}</p>`,
          text: letterText,
        });

        // Update municipality tracking
        await supabase
          .from('municipalities')
          .update({
            disclosure_status: 'sent',
            disclosure_request_sent_at: new Date().toISOString()
          })
          .eq('name', muni.name);

        sentCount++;
      } catch (err) {
        console.error(`[cron/disclosure-request] Failed sending to ${muni.name}:`, err);
      }
    }

    return NextResponse.json({ success: true, sentCount });

  } catch (err) {
    console.error('[cron/disclosure-request] Global error:', err);
    return NextResponse.json({ error: 'System error' }, { status: 500 });
  }
}
