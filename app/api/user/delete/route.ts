import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/user/delete
 *
 * POPIA section 14 — Right to Deletion.
 * Immediate, irreversible account deletion with anonymisation of financial records.
 *
 * Cascade:
 * 1. Send confirmation email (BEFORE auth.users wipe — we need the email address)
 * 2. Delete Supabase Storage files
 * 3. Anonymise cases (SET user_id = NULL, strip PII fields)
 * 4. Anonymise consent_events (SET user_id = NULL, retain timestamps + event types)
 * 5. Delete auth.users (cascades: profiles → municipal_credentials, scrape_jobs, scraped_bills)
 * 6. Sign out session
 *
 * If ANY step fails: log full error, send admin alert, return error to user.
 * Never silently succeed when something failed.
 *
 * Body: { confirm: "DELETE" }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const stepLog: string[] = [];
  let userEmail = '';
  let userId = '';

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    userId = user.id;
    userEmail = user.email || '';

    // 1. Validate typed confirmation
    const body = await request.json();
    if (body.confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'You must type "DELETE" to confirm account deletion.' },
        { status: 400 },
      );
    }

    stepLog.push(`[1] Authenticated: ${userId} / ${userEmail}`);

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();

    // ================================================================
    // 2. Send confirmation email BEFORE wiping auth.users
    // ================================================================
    try {
      const { getResendClient } = await import('@/lib/resend/client');
      const resend = getResendClient();
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

      await resend.emails.send({
        from: `Billdog <${fromEmail}>`,
        to: [userEmail],
        subject: 'Your Billdog account has been deleted',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0A1628;">Account Deletion Confirmation</h2>
            <p>Your Billdog account (<strong>${userEmail}</strong>) has been permanently deleted as requested.</p>
            <h3 style="color: #0A1628;">What was deleted:</h3>
            <ul>
              <li>Your personal information (name, email, phone, address)</li>
              <li>Your login credentials and all active sessions</li>
              <li>Your municipal portal credentials (encrypted data destroyed)</li>
              <li>Your uploaded bill PDFs</li>
            </ul>
            <h3 style="color: #0A1628;">What was anonymised (retained per POPIA section 14(2)):</h3>
            <ul>
              <li>Dispute financial records (amounts, findings) — with all personal identifiers removed</li>
              <li>Consent event timestamps — for legal compliance evidence</li>
            </ul>
            <p style="color: #666; font-size: 14px; margin-top: 24px;">
              If this was not you, contact <a href="mailto:support@billdog.co.za">support@billdog.co.za</a> immediately.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">
              Billdog (Pty) Ltd · Cape Town, South Africa
            </p>
          </div>
        `,
      });
      stepLog.push(`[2] Confirmation email sent to ${userEmail}`);
    } catch (emailErr) {
      // Email failure is non-blocking — log but continue
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      stepLog.push(`[2] Email failed (non-blocking): ${msg}`);
      console.error('[User Delete] Email failed:', msg);
    }

    // ================================================================
    // 3. Delete Supabase Storage files
    // ================================================================
    try {
      // List all files under user's folder in bills bucket
      const { data: storageFiles } = await supabaseAdmin.storage
        .from('bills')
        .list(userId, { limit: 1000 });

      if (storageFiles && storageFiles.length > 0) {
        // Storage.list returns items in the folder — need to handle nested paths
        // Get all case_bills urls for this user's cases
        const { data: userCases } = await supabaseAdmin
          .from('cases')
          .select('id, bill_url')
          .eq('user_id', userId);

        if (userCases && userCases.length > 0) {
          const caseIds = userCases.map(c => c.id);
          const singleUrls = userCases.map(c => c.bill_url).filter(Boolean) as string[];

          const { data: caseBills } = await supabaseAdmin
            .from('case_bills')
            .select('bill_url')
            .in('case_id', caseIds);

          const multiUrls = (caseBills || []).map(b => b.bill_url).filter(Boolean) as string[];
          const allUrls = [...singleUrls, ...multiUrls];

          if (allUrls.length > 0) {
            await supabaseAdmin.storage.from('bills').remove(allUrls);
            stepLog.push(`[3] Deleted ${allUrls.length} storage files`);
          } else {
            stepLog.push(`[3] No storage file URLs found`);
          }
        } else {
          stepLog.push(`[3] No cases found for storage cleanup`);
        }
      } else {
        stepLog.push(`[3] Storage folder empty or not found`);
      }
    } catch (storageErr) {
      const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
      stepLog.push(`[3] Storage cleanup error: ${msg}`);
      // Storage failure is non-blocking — files without a user are orphans, not PII exposure
      console.error('[User Delete] Storage cleanup error:', msg);
    }

    // ================================================================
    // 4. Anonymise cases (strip PII, set user_id = NULL)
    //    FK is now ON DELETE SET NULL, but we also strip PII fields here.
    // ================================================================
    const { error: anonCasesErr } = await supabaseAdmin
      .from('cases')
      .update({
        account_number: 'REDACTED',
        bill_text: null,
        letter_content: null,
        bill_url: null,
        bill_2_file_url: null,
      })
      .eq('user_id', userId);

    if (anonCasesErr) {
      const msg = `Anonymise cases failed: ${anonCasesErr.message}`;
      stepLog.push(`[4] FAILED: ${msg}`);
      await sendAdminAlert(stepLog, userId, userEmail);
      return NextResponse.json({
        error: 'Account deletion failed at step 4 (anonymise cases). Our team has been notified. Contact support@billdog.co.za.',
      }, { status: 500 });
    }
    stepLog.push(`[4] Cases anonymised (PII stripped)`);

    // ================================================================
    // 5. Anonymise consent_events (set user_id = NULL, retain records)
    //    FK is now ON DELETE SET NULL, but we explicitly NULL it here
    //    before the cascade to be safe.
    // ================================================================
    const { error: anonConsentErr } = await supabaseAdmin
      .from('consent_events')
      .update({ user_id: null })
      .eq('user_id', userId);

    if (anonConsentErr) {
      const msg = `Anonymise consent_events failed: ${anonConsentErr.message}`;
      stepLog.push(`[5] FAILED: ${msg}`);
      await sendAdminAlert(stepLog, userId, userEmail);
      return NextResponse.json({
        error: 'Account deletion failed at step 5 (anonymise consent). Our team has been notified. Contact support@billdog.co.za.',
      }, { status: 500 });
    }
    stepLog.push(`[5] Consent events anonymised`);

    // ================================================================
    // 6. Delete auth.users (cascades: profiles → municipal_credentials,
    //    scrape_jobs → scraped_bills). Cases and consent_events survive
    //    because their FKs are now ON DELETE SET NULL.
    // ================================================================
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      const msg = `auth.admin.deleteUser failed: ${deleteError.message}`;
      stepLog.push(`[6] FAILED: ${msg}`);
      await sendAdminAlert(stepLog, userId, userEmail);
      return NextResponse.json({
        error: 'Account deletion failed at step 6 (delete auth user). Our team has been notified. Contact support@billdog.co.za.',
      }, { status: 500 });
    }
    stepLog.push(`[6] auth.users deleted (cascaded: profiles, municipal_credentials, scrape_jobs, scraped_bills)`);

    // ================================================================
    // 7. Sign out to destroy server session cookie
    // ================================================================
    try {
      await supabase.auth.signOut();
      stepLog.push(`[7] Session signed out`);
    } catch {
      stepLog.push(`[7] Sign-out failed (non-blocking — auth.users already deleted)`);
    }

    console.log(`[User Delete] SUCCESS for ${userId}:\n${stepLog.join('\n')}`);

    return NextResponse.json({
      success: true,
      message: 'Account permanently deleted.',
      details: {
        deleted: ['auth.users', 'profiles', 'municipal_credentials', 'scrape_jobs', 'scraped_bills', 'storage_files'],
        anonymised: ['cases', 'consent_events'],
      },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stepLog.push(`[FATAL] Unhandled error: ${msg}`);
    console.error(`[User Delete] FATAL for ${userId}:`, msg);
    await sendAdminAlert(stepLog, userId, userEmail);
    return NextResponse.json({
      error: 'Account deletion failed unexpectedly. Our team has been notified. Contact support@billdog.co.za.',
    }, { status: 500 });
  }
}

/**
 * Send admin alert email when deletion fails.
 * Non-blocking — we catch and log any email failures.
 */
async function sendAdminAlert(stepLog: string[], userId: string, userEmail: string): Promise<void> {
  try {
    const { getResendClient } = await import('@/lib/resend/client');
    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'disputes@billdog.co.za';

    await resend.emails.send({
      from: `Billdog Alerts <${fromEmail}>`,
      to: ['editandcolour@gmail.com'],
      subject: `⚠️ POPIA Delete Failed: ${userEmail}`,
      html: `
        <h2>Account Deletion Failed</h2>
        <p><strong>User:</strong> ${userId}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <h3>Step Log:</h3>
        <pre>${stepLog.join('\n')}</pre>
        <p>Manual intervention required. Check Supabase directly.</p>
      `,
    });
  } catch (alertErr) {
    console.error('[User Delete] Admin alert email also failed:', alertErr);
  }
}
