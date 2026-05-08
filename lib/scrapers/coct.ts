/**
 * CoCT (City of Cape Town) Municipal Portal Scraper
 *
 * Portal: https://eservices.capetown.gov.za/irj/portal
 * Platform: SAP NetWeaver Portal (EPCF client framework, Web Dynpro post-login)
 *
 * Phase 1: verifyCredentials() — login + verify + close browser.
 * Phase 2: fetchLatestBill() and fetchBillHistory() — bill download via
 *          "Get copies of paid invoices" sidebar flow inside isolatedWorkArea iframe.
 *
 * SECURITY:
 * - Never log username, password, j_salt, or session tokens.
 * - Plaintext credentials exist only in-process memory during Playwright execution.
 * - Safe to log: municipality name, error codes, timing, success/failure, bill period.
 *
 * Source of truth: implementation_plan v3 §3c.
 */

import type { MunicipalScraper, ScraperResult, BillDownload, ScraperErrorCode } from './types';
import type { Browser, Page, Frame } from 'playwright-core';

// CoCT municipality ID — must match the `municipalities` table row UUID.
// Set via environment or looked up at runtime. Hardcoded for Phase 1.
const COCT_MUNICIPALITY_ID = 'city-of-cape-town';

const PORTAL_URL = 'https://eservices.capetown.gov.za/irj/portal';
const LOGIN_TIMEOUT_MS = 60_000;      // 60s — SAP portal + cross-continental latency
const NAVIGATION_TIMEOUT_MS = 45_000;  // 45s — initial page load can be slow
const DOWNLOAD_TIMEOUT_MS = 30_000;    // 30s — PDF download wait
const BILL_TABLE_TIMEOUT_MS = 30_000;  // 30s — wait for bill table to render after search

/** Minimum delay between sequential PDF downloads (ms) to avoid SAP session issues. */
const INTER_DOWNLOAD_DELAY_MS = 2_000;

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
    let browser: Browser | undefined;

    try {
      const { page, browser: b } = await this.loginToPortal(username, password);
      browser = b;

      console.log(`[CoctScraper] Login verified for municipality: ${this.municipalityName}`);
      return { success: true };

    } catch (err) {
      // loginToPortal throws with typed ScraperError — extract and return
      if (err instanceof ScraperError) {
        console.log(`[CoctScraper] Login failed with code: ${err.errorCode}`);
        return {
          success: false,
          error: err.message,
          errorCode: err.errorCode,
        };
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[CoctScraper] Verification error: ${message}`);

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
   * Download the most recent bill from "Get copies of paid invoices".
   *
   * Flow:
   * 1. Login → navigate to paid invoices page → set search filters
   * 2. Click "Find" → wait for table → download first PDF
   * 3. Extract period from table row text
   * 4. Return buffer + metadata
   */
  async fetchLatestBill(
    username: string,
    password: string
  ): Promise<ScraperResult<BillDownload>> {
    let browser: Browser | undefined;

    try {
      const { page, browser: b } = await this.loginToPortal(username, password);
      browser = b;

      console.log(`[CoctScraper] fetchLatestBill: logged in, navigating to paid invoices`);

      const frame = await this.navigateToPaidInvoices(page);
      await this.setSearchFilters(frame, '3', '30'); // Paid, Last 30 days
      await this.clickFind(frame);

      // Wait for table results
      const pdfLinks = await this.waitForPdfLinks(frame);

      if (pdfLinks.length === 0) {
        console.log('[CoctScraper] fetchLatestBill: no bills found in last 30 days');
        return { success: true, data: undefined };
      }

      // Download the first (most recent) bill
      const bill = await this.downloadBill(page, frame, pdfLinks[0], 0);

      console.log(`[CoctScraper] fetchLatestBill: downloaded bill for period "${bill.period}"`);
      return { success: true, data: bill };

    } catch (err) {
      return this.handleScrapeError(err, 'fetchLatestBill');
    } finally {
      if (browser) {
        await browser.close().catch(() => {/* ignore close errors */});
      }
    }
  }

  /**
   * Download bill history going back N months.
   * Uses "Last 5 Years" or "Unlimited" search scope depending on monthsBack.
   * Downloads sequentially to avoid memory spikes and SAP session issues.
   *
   * Returns whatever bills are available (may be < monthsBack).
   */
  async fetchBillHistory(
    username: string,
    password: string,
    monthsBack: number
  ): Promise<ScraperResult<BillDownload[]>> {
    let browser: Browser | undefined;

    try {
      const { page, browser: b } = await this.loginToPortal(username, password);
      browser = b;

      console.log(`[CoctScraper] fetchBillHistory: logged in, requesting ${monthsBack} months`);

      const frame = await this.navigateToPaidInvoices(page);

      // Pick search period based on monthsBack: ≤60 months = 5 years, >60 = unlimited
      const periodValue = monthsBack <= 60 ? '1825' : '10000';
      await this.setSearchFilters(frame, '3', periodValue);
      await this.clickFind(frame);

      const pdfLinks = await this.waitForPdfLinks(frame);

      if (pdfLinks.length === 0) {
        console.log('[CoctScraper] fetchBillHistory: no bills found');
        return { success: true, data: [] };
      }

      // Cap at requested monthsBack (1 bill per month)
      const targetCount = Math.min(pdfLinks.length, monthsBack);
      console.log(`[CoctScraper] fetchBillHistory: found ${pdfLinks.length} bills, downloading ${targetCount}`);

      const bills: BillDownload[] = [];

      for (let i = 0; i < targetCount; i++) {
        try {
          const bill = await this.downloadBill(page, frame, pdfLinks[i], i);
          bills.push(bill);
          console.log(`[CoctScraper] fetchBillHistory: downloaded ${i + 1}/${targetCount} — period "${bill.period}"`);

          // Delay between downloads to avoid SAP session saturation
          if (i < targetCount - 1) {
            await this.delay(INTER_DOWNLOAD_DELAY_MS);
          }
        } catch (downloadErr) {
          // Individual bill download failure — log and continue
          const msg = downloadErr instanceof Error ? downloadErr.message : 'Unknown download error';
          console.warn(`[CoctScraper] fetchBillHistory: skipping bill ${i + 1}/${targetCount}: ${msg}`);
        }
      }

      console.log(`[CoctScraper] fetchBillHistory: completed with ${bills.length}/${targetCount} bills`);
      return { success: true, data: bills };

    } catch (err) {
      return this.handleScrapeError(err, 'fetchBillHistory');
    } finally {
      if (browser) {
        await browser.close().catch(() => {/* ignore close errors */});
      }
    }
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Login to the CoCT portal and return { page, browser }.
   * Reused by verifyCredentials, fetchLatestBill, and fetchBillHistory.
   *
   * @throws ScraperError with typed errorCode on failure.
   */
  private async loginToPortal(
    username: string,
    password: string
  ): Promise<{ page: Page; browser: Browser }> {
    const { chromium } = await import('playwright-core');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // Railway container memory optimisation
        '--disable-gpu',
      ],
    });

    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        acceptDownloads: true,
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
        return { page, browser };
      }

      if (outcome === 'error') {
        const errorCode = await this.classifyLoginError(page);
        throw new ScraperError(`Portal login failed: ${errorCode}`, errorCode);
      }

      throw new ScraperError(
        'Portal login timed out. The portal may be temporarily unavailable.',
        'PORTAL_DOWN'
      );
    } catch (err) {
      // If error is already a ScraperError, re-throw as-is
      if (err instanceof ScraperError) {
        // Close browser on login failure — caller won't get a browser to close
        await browser.close().catch(() => {});
        throw err;
      }

      // Network/launch errors
      const message = err instanceof Error ? err.message : 'Unknown error';
      await browser.close().catch(() => {});

      if (message.includes('net::ERR_') || message.includes('ECONNREFUSED')) {
        throw new ScraperError('Portal is unreachable', 'PORTAL_DOWN');
      }

      throw new ScraperError(`Login failed: ${message}`, 'UNKNOWN');
    }
  }

  /**
   * Navigate from the authenticated dashboard to "Get copies of paid invoices"
   * and return the iframe Frame context where the bill table lives.
   *
   * Strategy:
   * 1. Click "Municipal accounts" tab to expand the section
   * 2. Click "Get copies of paid invoices" sidebar link
   * 3. Locate the isolatedWorkArea iframe (try by name, then by URL content match)
   */
  private async navigateToPaidInvoices(page: Page): Promise<Frame> {
    // Click "Municipal accounts" tab if visible
    try {
      const muniTab = await page.waitForSelector(
        '#tabIndex1, a:has-text("Municipal accounts")',
        { timeout: 15_000 }
      );
      if (muniTab) {
        await muniTab.click();
        await this.delay(2_000); // Wait for SAP navigation pane to load
      }
    } catch {
      // Tab may already be active or not required — continue
      console.log('[CoctScraper] Municipal accounts tab click skipped (may already be active)');
    }

    // Click "Get copies of paid invoices" sidebar link
    // SAP sidebar uses various element types — try text match
    try {
      await page.waitForSelector(
        'a:has-text("Get copies of paid invoices"), span:has-text("Get copies of paid invoices")',
        { timeout: 15_000 }
      );
      await page.click(
        'a:has-text("Get copies of paid invoices"), span:has-text("Get copies of paid invoices")'
      );
      await this.delay(3_000); // Wait for iframe content to load
    } catch {
      // Try alternative: L2N5 node ID (observed in portal)
      try {
        await page.click('#L2N5');
        await this.delay(3_000);
      } catch {
        throw new ScraperError(
          'Could not navigate to paid invoices page',
          'SESSION_TIMEOUT'
        );
      }
    }

    // Locate the iframe where the bill content lives
    return await this.getWorkAreaFrame(page);
  }

  /**
   * Locate the isolatedWorkArea iframe.
   * Strategy: Try by name first, then fall back to URL content match.
   */
  private async getWorkAreaFrame(page: Page): Promise<Frame> {
    // Strategy 1: frame by name
    const namedFrame = page.frame('isolatedWorkArea');
    if (namedFrame) {
      console.log('[CoctScraper] Found iframe by name: isolatedWorkArea');
      return namedFrame;
    }

    // Strategy 2: find frame by URL content match (SAP Web Dynpro URLs)
    await this.delay(2_000); // Give frames time to load
    const frames = page.frames();
    for (const f of frames) {
      const url = f.url();
      if (url.includes('webdynpro') || url.includes('WDApplication') || url.includes('ISU')) {
        console.log('[CoctScraper] Found iframe by URL pattern match');
        return f;
      }
    }

    // Strategy 3: find the largest non-about:blank iframe
    for (const f of frames) {
      if (f !== page.mainFrame() && f.url() !== 'about:blank') {
        console.log('[CoctScraper] Using first non-blank child frame as fallback');
        return f;
      }
    }

    // If no iframe found, the content may be in the main frame
    console.log('[CoctScraper] No iframe found — using main frame');
    return page.mainFrame();
  }

  /**
   * Set the search filters on the paid invoices page.
   * @param billTypeValue - Dropdown value for bill type (3 = Processed/Paid)
   * @param periodValue - Dropdown value for period (30, 1825, 10000)
   */
  private async setSearchFilters(
    frame: Frame,
    billTypeValue: string,
    periodValue: string
  ): Promise<void> {
    try {
      // Wait for the dropdowns to be available
      await frame.waitForSelector('#billType, [id*="billType"], select[name*="billType"]', {
        timeout: BILL_TABLE_TIMEOUT_MS,
      });

      // Set bill type to "Processed/Paid"
      await frame.selectOption(
        '#billType, [id*="billType"], select[name*="billType"]',
        billTypeValue
      );

      // Set period dropdown
      await frame.selectOption(
        '#searchDateId, [id*="searchDate"], select[name*="searchDate"]',
        periodValue
      );

      console.log(`[CoctScraper] Search filters set: billType=${billTypeValue}, period=${periodValue}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      throw new ScraperError(`Failed to set search filters: ${msg}`, 'SESSION_TIMEOUT');
    }
  }

  /**
   * Click the "Find" button to execute the search.
   */
  private async clickFind(frame: Frame): Promise<void> {
    try {
      // SAP "Find" button typically has class sapBtnEmph or contains text "Find"
      await frame.click(
        '.sapBtnEmph, button:has-text("Find"), input[type="submit"][value*="Find"]'
      );
      console.log('[CoctScraper] Find button clicked');
    } catch {
      throw new ScraperError('Could not click Find button', 'SESSION_TIMEOUT');
    }
  }

  /**
   * Wait for PDF download links to appear in the bill table.
   * Returns array of locator handles for each PDF link.
   */
  private async waitForPdfLinks(
    frame: Frame
  ): Promise<import('playwright-core').ElementHandle<Element>[]> {
    try {
      // Wait for either the table to render or a "no results" message
      await Promise.race([
        frame.waitForSelector('a[href*="showBillPDF"], a[href*="PDF"], img[src*="pdf"]', {
          timeout: BILL_TABLE_TIMEOUT_MS,
        }),
        frame.waitForSelector(
          'span:has-text("No data"), span:has-text("No results"), td:has-text("No data")',
          { timeout: BILL_TABLE_TIMEOUT_MS }
        ),
      ]);

      // Collect all PDF links
      const links = await frame.$$('a[href*="showBillPDF"], a[href*="PDF"]');
      return links;
    } catch {
      // Timeout waiting for table — could mean no results or slow load
      console.log('[CoctScraper] Bill table load timed out — assuming no results');
      return [];
    }
  }

  /**
   * Download a single bill PDF by clicking its link and intercepting the download event.
   * Extracts the bill period from the adjacent table row text.
   */
  private async downloadBill(
    page: Page,
    frame: Frame,
    pdfLink: import('playwright-core').ElementHandle<Element>,
    index: number
  ): Promise<BillDownload> {
    // Try to extract period from the table row containing this link
    const period = await this.extractPeriodFromRow(frame, pdfLink, index);

    // Click the PDF link and intercept the download
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT_MS }),
      pdfLink.click(),
    ]);

    // Read the downloaded file into a buffer
    const readableStream = await download.createReadStream();

    if (!readableStream) {
      throw new Error('Download stream is null — PDF download may have failed');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of readableStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    if (pdfBuffer.length < 100) {
      throw new Error(`Downloaded file too small (${pdfBuffer.length} bytes) — likely not a valid PDF`);
    }

    const filename = download.suggestedFilename() || `bill_${index}.pdf`;

    return {
      period,
      pdfBuffer,
      filename,
    };
  }

  /**
   * Extract the bill period from the table row adjacent to a PDF link.
   * Looks for date patterns like "Jun 1, 2026" or "2026-06" in the row text.
   * Falls back to a generic label if no date pattern found.
   */
  private async extractPeriodFromRow(
    frame: Frame,
    pdfLink: import('playwright-core').ElementHandle<Element>,
    index: number
  ): Promise<string> {
    try {
      // Navigate up to the closest <tr> and get its text
      const rowText = await pdfLink.evaluate((el) => {
        const row = el.closest('tr');
        return row ? row.textContent || '' : '';
      });

      // Try common date patterns
      const patterns = [
        // "Jun 1, 2026" or "January 15, 2026"
        /([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})/,
        // "2026-06-01" or "2026/06/01"
        /(\d{4}[-/]\d{2}[-/]\d{2})/,
        // "01/06/2026" or "01-06-2026"
        /(\d{2}[-/]\d{2}[-/]\d{4})/,
        // "June 2026" or "Jun 2026"
        /([A-Z][a-z]{2,8}\s+\d{4})/,
      ];

      for (const pattern of patterns) {
        const match = rowText.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }

      // Fallback: use index-based label
      return `bill_${index + 1}`;
    } catch {
      return `bill_${index + 1}`;
    }
  }

  /**
   * Classify login error by inspecting error message text on the page.
   * Never logs the actual error text (may contain credential echoes).
   */
  private async classifyLoginError(page: Page): Promise<ScraperErrorCode> {
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
   * Handle errors from scrape operations — maps to typed ScraperResult.
   */
  private handleScrapeError<T>(err: unknown, method: string): ScraperResult<T> {
    if (err instanceof ScraperError) {
      console.log(`[CoctScraper] ${method} failed: ${err.errorCode}`);
      return {
        success: false,
        error: err.message,
        errorCode: err.errorCode,
      };
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[CoctScraper] ${method} unexpected error: ${message}`);

    if (message.includes('net::ERR_') || message.includes('ECONNREFUSED')) {
      return { success: false, error: 'Portal is unreachable', errorCode: 'PORTAL_DOWN' };
    }
    if (message.includes('timeout') || message.includes('Timeout')) {
      return { success: false, error: 'Portal session timed out', errorCode: 'SESSION_TIMEOUT' };
    }

    return { success: false, error: `Scrape failed: ${message}`, errorCode: 'UNKNOWN' };
  }

  /** Simple async delay. */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Typed error class for scraper operations.
 * Carries a ScraperErrorCode for structured error handling.
 */
class ScraperError extends Error {
  constructor(
    message: string,
    public readonly errorCode: ScraperErrorCode
  ) {
    super(message);
    this.name = 'ScraperError';
  }
}
