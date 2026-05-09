import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';
const ADMIN_EMAIL = 'editandcolour@gmail.com'; // as per prompt spec

export async function evaluateFailureRateAndAlert(): Promise<{ total: number; failed: number; sentAlert: boolean }> {
  const supabaseAdmin = createAdminClient();

  // Look back 24 hours
  const startOfWindow = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // We are evaluating fetch-latest (monthly) jobs
  const { data: jobs, error } = await supabaseAdmin
    .from('scrape_jobs')
    .select('status, error_message')
    .eq('job_type', 'monthly')
    .gte('created_at', startOfWindow);

  if (error) {
    throw new Error(`Failed to query jobs: ${error.message}`);
  }

  const total = jobs?.length || 0;
  const failed = jobs?.filter(j => j.status === 'failed').length || 0;
  
  // If 100% of jobs failed, trigger internal alert
  const failureRate = total > 0 ? (failed / total) : 0;
  let sentAlert = false;

  if (total > 0 && failureRate === 1) {
    console.log('[autofetch/alert] 100% failure rate detected. Sending admin alert.');
    
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #EF4444;">🚨 Billdog Autofetch Alert</h2>
        <p>The monthly auto-fetch run had a <strong>100% failure rate</strong>.</p>
        <p><strong>Total Jobs Attempted:</strong> ${total}</p>
        <p><strong>Failed:</strong> ${failed}</p>
        <p>This likely indicates a municipal portal change. You should run Model B rediscovery immediately.</p>
        <br/>
        <p>Sample errors:</p>
        <ul>
          ${jobs!.filter(j => j.status === 'failed').slice(0, 5).map(j => `<li>${j.error_message || 'Unknown error'}</li>`).join('')}
        </ul>
      </div>
    `;

    try {
      await resend.emails.send({
        from: `Billdog System <${FROM_EMAIL}>`,
        to: ADMIN_EMAIL,
        subject: `[ALERT] Municipal Auto-fetch 100% Failure Rate`,
        html,
      });
      sentAlert = true;
    } catch (err) {
      console.error('[autofetch/alert] Failed to send admin alert email:', err);
    }
  } else {
    console.log(`[autofetch/alert] Failure rate is ${(failureRate * 100).toFixed(2)}% (${failed}/${total}). No alert sent.`);
  }

  return { total, failed, sentAlert };
}
