import { chromium, Browser, Page, Frame } from 'playwright-core';
import { ScraperResult, BillDownload, MunicipalScraper, ScraperConfig, ScraperAction } from './types';
// ScraperError import removed — module was never created and class was unused
import * as fs from 'fs';
import * as path from 'path';

const LAUNCH_OPTIONS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};

// Generic utility to parse dates (carried over from previous scrapers).
// Exported for unit tests: MUST return null on unparseable input — a sentinel
// string here would collide in the worker's period dedup (every unparseable
// bill would "equal" every other one) and silently corrupt cycle routing.
export function parsePeriod(text: string): string | null {
  const t = text.trim();
  const yyyyMmRegex = /^(19|20)\d{2}[-/](0[1-9]|1[0-2])$/;
  if (yyyyMmRegex.test(t)) {
    const [year, month] = t.split(/[-/]/);
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const exactDateRegex = /^(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](19|20)\d{2}$/;
  if (exactDateRegex.test(t)) {
    const parts = t.split(/[-/.]/);
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const mmYyyyRegex = /^(0[1-9]|1[0-2])[-/.](19|20)\d{2}$/;
  if (mmYyyyRegex.test(t)) {
    const parts = t.split(/[-/.]/);
    const date = new Date(parseInt(parts[1], 10), parseInt(parts[0], 10) - 1, 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const words = t.split(/[\s-]+/);
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  let monthIdx = -1;
  let yearStr = '';
  let dayStr = '1';

  for (const w of words) {
    const wl = w.toLowerCase();
    if (monthIdx === -1) {
      const idx = months.findIndex(m => wl.startsWith(m));
      if (idx !== -1) { monthIdx = idx; continue; }
    }
    if (w.match(/^(19|20)\d{2}$/)) {
      yearStr = w; continue;
    }
    if (w.match(/^([1-9]|[12]\d|3[01])$/)) {
      dayStr = w;
    }
  }

  if (monthIdx !== -1 && yearStr) {
    const date = new Date(parseInt(yearStr, 10), monthIdx, parseInt(dayStr, 10));
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return null;
}

export class GenericScraper implements MunicipalScraper {
  public municipalityId: string;
  public municipalityName: string;
  private config: ScraperConfig;

  constructor(municipalityId: string) {
    this.municipalityId = municipalityId;
    const configPath = path.join(process.cwd(), 'lib', 'scrapers', 'configs', `${municipalityId}.json`);
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found for municipality: ${municipalityId}`);
    }
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.municipalityName = this.config.municipality_name;
  }

  private async executeAction(target: Page | Frame, action: ScraperAction, context: any) {
    try {
      const selector = action.selector ? action.selector.replace('${username}', context.username).replace('${password}', context.password).replace('[REDACTED_USERNAME]', context.username).replace('[REDACTED_PASSWORD]', context.password) : '';
      const value = action.value ? action.value.replace('${username}', context.username).replace('${password}', context.password).replace('[REDACTED_USERNAME]', context.username).replace('[REDACTED_PASSWORD]', context.password) : '';

      switch (action.action || (action as any).type) {
        case 'fill':
          await target.fill(selector, value);
          break;
        case 'click':
          await target.click(selector);
          await new Promise(r => setTimeout(r, 1500)); // Default stabilization
          break;
        case 'select':
          await target.selectOption(selector, value);
          await new Promise(r => setTimeout(r, 1500)); // Default stabilization
          break;
        case 'waitForSelector':
          await target.waitForSelector(selector, { timeout: action.timeout_ms || 15000 });
          break;
        case 'waitForTimeout':
          await new Promise(r => setTimeout(r, action.ms || 1000));
          break;
        case 'switchFrame':
          let foundFrame: Frame | null = null;
          const page = 'page' in target ? target.page() : target as Page;
          
          if (selector.includes('name=')) {
            const match = selector.match(/name=['"]([^'"]+)['"]/);
            if (match) {
              const name = match[1];
              foundFrame = page.frame({ name });
            }
          }
          if (!foundFrame) {
            for (const f of page.frames()) {
              if (selector.includes('src*=') && f.url().includes('webdynpro')) {
                foundFrame = f;
                break;
              }
            }
          }
          if (!foundFrame) throw new Error(`Could not find frame matching ${selector}`);
          return foundFrame;
      }
      return target;
    } catch (e: any) {
      if (action.optional) {
        console.log(`[GenericScraper] Optional action failed: ${action.action || (action as any).type} on ${action.selector}`);
        return target;
      }
      console.error(`[GenericScraper] Action failed: ${action.action || (action as any).type} on ${action.selector}`, e.message);
      throw e;
    }
  }

  private async executeSteps(target: Page | Frame, steps: ScraperAction[], context: any): Promise<Page | Frame> {
    let currentTarget = target;
    for (const step of steps) {
      currentTarget = await this.executeAction(currentTarget, step, context);
    }
    return currentTarget;
  }

  public async verifyCredentials(username: string, password: string): Promise<ScraperResult<void>> {
    const browser = await chromium.launch(LAUNCH_OPTIONS);
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
      console.log(`[GenericScraper] verifyCredentials for ${this.municipalityId}`);
      await page.goto('https://eservices.capetown.gov.za/irj/portal', { waitUntil: 'domcontentloaded' }); // TODO: move start URL to config
      await this.executeSteps(page, this.config.steps.login, { username, password });
      return { success: true };
    } catch (err: any) {
      console.error('[GenericScraper] verifyCredentials failed', err.message);
      return { success: false, error: err.message, errorCode: 'INVALID_CREDENTIALS' };
    } finally {
      await browser.close();
    }
  }

  /** Validate PDF magic number %PDF- */
  private validatePdfBuffer(buf: Buffer, context: string): boolean {
    const magic = buf.subarray(0, 5).toString('ascii');
    if (magic !== '%PDF-') {
      const hexPreview = buf.subarray(0, 32).toString('hex');
      console.warn(`[GenericScraper] ${context}: Not a valid PDF. Size: ${buf.length}, magic: '${magic}', hex: ${hexPreview}`);
      return false;
    }
    return true;
  }

  private async getBillsFromTable(
    target: Page | Frame,
    max: number
  ): Promise<{ bills: BillDownload[]; unparseablePeriods: number }> {
    const ext = this.config.extraction;
    const links = await target.$$(ext.pdf_link_selector);
    console.log(`[GenericScraper] Found ${links.length} links using selector ${ext.pdf_link_selector} in frame ${target.url()}`);
    const bills: BillDownload[] = [];
    let unparseablePeriods = 0;

    // Process at most 'max' links
    for (let i = 0; i < Math.min(links.length, max); i++) {
      const link = links[i];
      try {
        const rowText = await link.evaluate((node, rowSel) => {
          const row = node.closest(rowSel);
          return row ? (row as HTMLElement).innerText : node.textContent;
        }, ext.row_selector);

        const period = parsePeriod(rowText || '');
        if (!period) {
          // Fail-closed: NO sentinel period. A fabricated placeholder would
          // collide in the worker's period dedup (every unparseable bill
          // "equals" every other) and silently corrupt cycle routing. Count
          // and skip before downloading; callers surface the count.
          console.warn(`[GenericScraper] Bill ${i + 1}: row period unparseable — skipping row (row text: ${String(rowText ?? '').slice(0, 60)})`);
          unparseablePeriods++;
          continue;
        }
        const page = 'page' in target ? target.page() : target;
        let pdfBuffer: Buffer | null = null;

        // Strategy 1: Download interception (SAP serves file as attachment)
        try {
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 15000 }),
            link.click(),
          ]);
          const dlPath = await download.path();
          if (dlPath) {
            pdfBuffer = fs.readFileSync(dlPath);
            if (!this.validatePdfBuffer(pdfBuffer, `bill ${i + 1}`)) {
              pdfBuffer = null;
            } else {
              console.log(`[GenericScraper] Bill ${i + 1}: downloaded via interception (${pdfBuffer.length} bytes)`);
            }
          }
        } catch {
          // Download event didn't fire — try new-tab approach
        }

        // Strategy 2: New tab opens with PDF content
        if (!pdfBuffer) {
          try {
            const link2 = links[i]; // Re-use — Playwright handles stale refs
            const [newPage] = await Promise.all([
              page.context().waitForEvent('page', { timeout: 15000 }),
              link2.click(),
            ]);
            await newPage.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

            // Re-navigate to capture the response body (the actual PDF bytes)
            const resp = await newPage.goto(newPage.url(), { waitUntil: 'networkidle', timeout: 20000 }).catch(() => null);
            if (resp) {
              pdfBuffer = Buffer.from(await resp.body());
              if (!this.validatePdfBuffer(pdfBuffer, `bill ${i + 1}`)) {
                pdfBuffer = null;
              } else {
                console.log(`[GenericScraper] Bill ${i + 1}: downloaded via new-tab (${pdfBuffer.length} bytes)`);
              }
            }
            await newPage.close();
          } catch (e: any) {
            console.warn(`[GenericScraper] Bill ${i + 1}: new-tab approach failed: ${e.message}`);
          }
        }

        if (pdfBuffer) {
          bills.push({
            period,
            pdfBuffer,
            filename: `bill_${this.municipalityId}_${period.replace(/\s+/g, '_')}.pdf`
          });
        } else {
          console.warn(`[GenericScraper] Bill ${i + 1}: skipped — no valid PDF obtained`);
        }
      } catch (e: any) {
        console.warn('[GenericScraper] Error extracting bill:', e.message);
      }
    }
    return { bills, unparseablePeriods };
  }

  public async fetchLatestBill(username: string, password: string): Promise<ScraperResult<BillDownload>> {
    const browser = await chromium.launch(LAUNCH_OPTIONS);
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
      await page.goto('https://eservices.capetown.gov.za/irj/portal', { waitUntil: 'domcontentloaded' });
      await this.executeSteps(page, this.config.steps.login, { username, password });
      const navTarget = await this.executeSteps(page, this.config.steps.navigate, { username, password });
      // filter_latest starts with a switchFrame into isolatedWorkArea — the
      // returned target IS that frame. Extracting from navTarget instead
      // searched the outer portal shell and found 0 links every time.
      const filterTarget = await this.executeSteps(navTarget, this.config.steps.filter_latest, { username, password });

      const { bills, unparseablePeriods } = await this.getBillsFromTable(filterTarget, 1);
      if (bills.length > 0) {
        return { success: true, data: bills[0] };
      }
      if (unparseablePeriods > 0) {
        // Fail-closed: a bill row EXISTS but its period could not be parsed.
        // This must surface as a visible failure (failed job + last_login_error),
        // never as "no bill yet" (which would hunt forever past a real bill)
        // and never as a sentinel period (which would dedup-collide).
        return {
          success: false,
          error: `Latest bill row found but its period could not be parsed (${unparseablePeriods} row(s)) — needs manual review`,
          errorCode: 'UNKNOWN',
        };
      }
      // Logged in and reached the statement table, but no rows are visible --
      // the new period's bill isn't published yet. Success-with-no-data routes
      // the worker to the daily hunt (NOT_YET_PUBLISHED), not the error path.
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message, errorCode: 'UNKNOWN' };
    } finally {
      await browser.close();
    }
  }

  public async fetchBillHistory(username: string, password: string, monthsBack: number): Promise<ScraperResult<BillDownload[]>> {
    const browser = await chromium.launch(LAUNCH_OPTIONS);
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
      await page.goto('https://eservices.capetown.gov.za/irj/portal', { waitUntil: 'domcontentloaded' });
      await this.executeSteps(page, this.config.steps.login, { username, password });
      const navTarget = await this.executeSteps(page, this.config.steps.navigate, { username, password });
      const filterTarget = await this.executeSteps(navTarget, this.config.steps.filter_history, { username, password });

      const ext = this.config.extraction;
      const allBills: BillDownload[] = [];
      let unparseableTotal = 0;
      let pageNumber = 1;

      while (allBills.length < monthsBack) {
        const remaining = monthsBack - allBills.length;
        const { bills: pageBills, unparseablePeriods: pageSkips } =
          await this.getBillsFromTable(filterTarget, remaining);
        unparseableTotal += pageSkips;

        if (pageBills.length === 0) break;
        
        allBills.push(...pageBills);
        
        if (allBills.length >= monthsBack) break;

        // Check pagination
        const nextBtn = await filterTarget.$(ext.pagination_next_selector || 'missing');
        if (!nextBtn) break;

        const nextHtml = await nextBtn.evaluate(el => el.outerHTML).catch(() => '');
        if (ext.pagination_disabled_condition && nextHtml.includes(ext.pagination_disabled_condition)) {
          break;
        }

        await nextBtn.click();
        await new Promise(r => setTimeout(r, 8000));
        pageNumber++;
      }

      if (allBills.length === 0 && unparseableTotal > 0) {
        // Every visible row had an unparseable period — fail-closed, visible.
        return {
          success: false,
          error: `History rows found but all ${unparseableTotal} had unparseable periods — needs manual review`,
          errorCode: 'UNKNOWN',
        };
      }
      if (unparseableTotal > 0) {
        console.warn(`[GenericScraper] History fetch SKIPPED ${unparseableTotal} row(s) with unparseable periods (${allBills.length} fetched)`);
      }
      return { success: true, data: allBills };
    } catch (err: any) {
      return { success: false, error: err.message, errorCode: 'UNKNOWN' };
    } finally {
      await browser.close();
    }
  }
}
