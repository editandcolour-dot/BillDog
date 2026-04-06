import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClaudeClient } from '@/lib/claude/client';
import { getResendClient } from '@/lib/resend/client';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Gather some basic local metrics to feed Claude context
    const { data: casesData } = await supabase
      .from('cases')
      .select('municipality, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const municipalityCounts = casesData?.reduce((acc: Record<string, number>, curr) => {
      acc[curr.municipality] = (acc[curr.municipality] || 0) + 1;
      return acc;
    }, {}) || {};

    const stringifiedStats = Object.keys(municipalityCounts).length > 0 
      ? JSON.stringify(municipalityCounts, null, 2)
      : 'No new cases this week.';

    // 2. Invoke Claude to generate the SEO report
    const claude = getClaudeClient();
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are an expert SEO Analyst for Billdog (a South African municipal billing dispute platform). 
Generate a Weekly SEO & Social pulse report for the founder, Jason.
The report must include:
1. Top performing municipality pages (correlate with this week's active cases if provided)
2. New keyword opportunities in the South African municipal space
3. Social mentions or trends this week (estimate based on typical SA utility crises like Joburg City Power, eThekwini water)
4. Suggested content for next week
5. Competitor activity (if any)`,
      messages: [
        { 
          role: 'user', 
          content: `Here are the platform's case generation stats by municipality over the last 7 days to help guide your analysis:\n${stringifiedStats}\n\nPlease generate the Monday SEO report.` 
        }
      ],
    });

    const reportText = response.content[0].type === 'text' ? response.content[0].text : 'Failed to generate report text.';

    // 3. Send via Resend
    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'reports@billdog.co.za';

    await resend.emails.send({
      from: `Billdog SEO <${fromEmail}>`,
      to: ['jason.ripplemedia@gmail.com'],
      subject: `Billdog Weekly SEO Pulse — ${new Date().toLocaleDateString()}`,
      text: reportText,
    });

    return NextResponse.json({ success: true, message: 'SEO Report sent' }, { status: 200 });

  } catch (error) {
    console.error('[API/Cron/SEO] Unexpected failure:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
