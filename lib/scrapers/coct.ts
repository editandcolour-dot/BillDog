/**
 * CoCT (City of Cape Town) Municipal Portal Scraper
 *
 * Portal: https://eservices.capetown.gov.za/irj/portal
 * Platform: SAP NetWeaver Portal (EPCF client framework, Web Dynpro post-login)
 *
 * Phase 1: verifyCredentials() only — login + verify + close browser.
 * Phase 2: fetchBillHistory() and fetchLatestBill() added.
 *
 * SECURITY:
 * - Never log username, password, j_salt, or session tokens.
 * - Plaintext credentials exist only in-process memory during Playwright execution.
 * - Safe to log: municipality name, error codes, timing, success/failure.
 *
 * Source of truth: implementation_plan v3 §3c.
 */

import type { MunicipalScraper, ScraperResult, BillDownload, ScraperErrorCode } from './types';

// CoCT municipality ID — must match the `municipalities` table row UUID.
// Set via environment or looked up at runtime. Hardcoded for Phase 1.
const COCT_MUNICIPALITY_ID = 'city-of-cape-town';

const PORTAL_URL = 'https://eservices.capetown.gov.za/irj/portal';
const LOGIN_TIMEOUT_MS = 60_000;      // 60s — SAP portal + cross-continental latency
const NAVIGATION_TIMEOUT_MS = 45_000;  // 45s — initial page load can be slow

export class CoctScraper implements MunicipalScraper {
  readonly municipalityId = COCT_MUNICIPALITY_ID;
  readonly municipalityName = 'City of Cape Town';

  /**
   * Verify credentials by attempting a portal login.
   * On success: confirms login, then closes browser. No bill download.
   * On failure: returns typed error code for auto-revocation logic.
   */
  async verifyCredentials(
    username: string,
    password: string
  ): Promise<ScraperResult<void>> {
    let browser;

    try {
      // Dynamic import — playwright-core is a heavy dependency
      const { chromium } = await import('playwright-core');

      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',  // Railway container memory optimisation
          '--disable-gpu',
        ],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();

      // Navigate to portal login page
      await page.goto(PORTAL_URL, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      });

      // Wait for login form fields to be visible
      await page.waitForSelector('#logonuidfield', { timeout: LOGIN_TIMEOUT_MS });

      // Fill credentials — never log these values
      await page.fill('#logonuidfield', username);
      await page.fill('#logonpassfield', password);

      // Submit the login form
      await page.click('[name="uidPasswordLogon"]');

      // Wait for either: dashboard (success) or error message (failure)
      // Post-login indicators verified against live portal 2026-05-08:
      //   #buttonlogoff — "Log off" span, only present after auth
      //   #tabIndex1    — "Municipal accounts" tab, dashboard nav
      const outcome = await Promise.race([
        page.waitForSelector('#buttonlogoff, #tabIndex1', { timeout: LOGIN_TIMEOUT_MS })
          .then(() => 'dashboard' as const)
          .catch(() => null),
        page.waitForSelector('.urMsgBarErr, .logonError, #logonErrorField', { timeout: LOGIN_TIMEOUT_MS })
          .then(() => 'error' as const)
          .catch(() => null),
        new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), LOGIN_TIMEOUT_MS)),
      ]);

      if (outcome === 'dashboard') {
        console.log(`[CoctScraper] Login verified for municipality: ${this.municipalityName}`);
        return { success: true };
      }

      // Attempt to extract error details for classification
      if (outcome === 'error') {
        const errorCode = await this.classifyLoginError(page);
        console.log(`[CoctScraper] Login failed with code: ${errorCode}`);
        return {
          success: false,
          error: `Portal login failed: ${errorCode}`,
          errorCode,
        };
      }

      // Timeout — portal might be down or slow
      console.log('[CoctScraper] Login timed out — portal may be down');
      return {
        success: false,
        error: 'Portal login timed out. The portal may be temporarily unavailable.',
        errorCode: 'PORTAL_DOWN',
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[CoctScraper] Verification error: ${message}`);

      // Classify network/launch errors
      if (message.includes('net::ERR_') || message.includes('ECONNREFUSED')) {
        return { success: false, error: 'Portal is unreachable', errorCode: 'PORTAL_DOWN' };
      }

      return { success: false, error: 'Verification failed due to unexpected error', errorCode: 'UNKNOWN' };
    } finally {
      if (browser) {
        await browser.close().catch(() => {/* ignore close errors */});
      }
    }
  }

  /**
   * Classify login error by inspecting error message text on the page.
   * Never logs the actual error text (may contain credential echoes).
   */
  private async classifyLoginError(page: import('playwright-core').Page): Promise<ScraperErrorCode> {
    try {
      const errorText = await page.textContent('.urMsgBarErr, .logonError, #logonErrorField') || '';
      const lower = errorText.toLowerCase();

      if (lower.includes('invalid') || lower.includes('incorrect') || lower.includes('wrong')) {
        return 'INVALID_CREDENTIALS';
      }
      if (lower.includes('locked') || lower.includes('disabled')) {
        return 'ACCOUNT_LOCKED';
      }
      if (lower.includes('change') && lower.includes('password')) {
        return 'PASSWORD_CHANGE_REQUIRED';
      }
      if (lower.includes('verification') || lower.includes('otp') || lower.includes('two-factor')) {
        return 'MFA_REQUIRED';
      }

      return 'INVALID_CREDENTIALS'; // Default for unrecognised login errors
    } catch {
      return 'UNKNOWN';
    }
  }

  /**
   * Phase 2 — Not implemented in Phase 1.
   * @throws Error with explicit phase marker.
   */
  async fetchBillHistory(
    _username: string,
    _password: string,
    _monthsBack: number
  ): Promise<ScraperResult<BillDownload[]>> {
    throw new Error('[CoctScraper] fetchBillHistory() is not implemented in Phase 1. Ships in Phase 2.');
  }

  /**
   * Phase 2 — Not implemented in Phase 1.
   * @throws Error with explicit phase marker.
   */
  async fetchLatestBill(
    _username: string,
    _password: string
  ): Promise<ScraperResult<BillDownload>> {
    throw new Error('[CoctScraper] fetchLatestBill() is not implemented in Phase 1. Ships in Phase 2.');
  }
}
