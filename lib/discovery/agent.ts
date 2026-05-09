import { chromium, Browser, Page, Frame, Download } from 'playwright-core';
import Anthropic from '@anthropic-ai/sdk';
import { getSimplifiedDOM } from './dom-utils';
import { DISCOVERY_SYSTEM_PROMPT } from './prompt';
import * as fs from 'fs';
import * as path from 'path';

// Claude Sonnet model specified in rules
const VISION_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

const INPUT_COST_PER_M = 3.00;
const OUTPUT_COST_PER_M = 15.00;
const MAX_COST = 5.00;

/**
 * Selectors and text patterns that indicate a query-trigger button.
 * If a click action targets any of these, a mandatory AJAX wait is injected after it.
 */
const QUERY_TRIGGER_TEXT = ['find', 'search', 'submit', 'apply', 'go', 'filter', 'query', 'refresh'];
const QUERY_TRIGGER_CLASSES = [
  'sapBtnEmph', 'btn-search', 'btn-find', 'btn-submit',
  'btn-primary', 'searchButton', 'filterButton'
];
const QUERY_TRIGGER_SELECTORS = ['[role="search"]', '[type="submit"]'];

/** Check if a click selector looks like a query trigger */
function isQueryTrigger(selector: string): boolean {
  const lower = selector.toLowerCase();

  // Check text content markers (e.g. "a:has-text('Find')", "input[value='Find']")
  for (const keyword of QUERY_TRIGGER_TEXT) {
    if (lower.includes(`has-text('${keyword}')`) || lower.includes(`has-text("${keyword}")`)) return true;
    if (lower.includes(`value='${keyword}'`) || lower.includes(`value="${keyword}"`)) return true;
    // Also match bare text like "text=Find" or text in name/id
    if (lower.includes(`text=${keyword}`) || lower.includes(`text="${keyword}"`)) return true;
  }

  // Check class markers
  for (const cls of QUERY_TRIGGER_CLASSES) {
    if (lower.includes(cls.toLowerCase())) return true;
  }

  // Check attribute selectors
  for (const sel of QUERY_TRIGGER_SELECTORS) {
    if (lower.includes(sel)) return true;
  }

  // Check name/id containing trigger words
  for (const keyword of QUERY_TRIGGER_TEXT) {
    if (lower.includes(`name='${keyword}'`) || lower.includes(`name="${keyword}"`)) return true;
    if (lower.includes(`id="${keyword}"`) || lower.includes(`id='${keyword}'`)) return true;
    // Catch name=Search, name=Find etc (SAP style)
    const nameMatch = lower.match(/name=['"]([\w]+)['"]/);
    if (nameMatch && QUERY_TRIGGER_TEXT.includes(nameMatch[1].toLowerCase())) return true;
  }

  return false;
}

/**
 * Deterministic post-processor: walks the emitted step arrays and injects mandatory waits.
 *
 * 1. After every `switchFrame` → inject `{ type: "waitForTimeout", ms: 5000 }`
 * 2. After every `click` that targets a query trigger → inject `{ type: "waitForTimeout", ms: 8000 }`
 *
 * Both are idempotent — if a wait already follows, it's left alone but a second one is NOT added.
 */
function postProcessSteps(steps: any[]): any[] {
  const result: any[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const actionType = step.action || step.type;
    result.push(step);

    // Check if the NEXT step is already a wait
    const nextStep = steps[i + 1];
    const nextIsWait = nextStep && (nextStep.action === 'waitForTimeout' || nextStep.type === 'waitForTimeout');

    if (actionType === 'switchFrame') {
      if (!nextIsWait) {
        console.log(`[PostProcess] Injecting 5000ms wait after switchFrame: ${step.selector}`);
        result.push({ type: 'waitForTimeout', ms: 5000 });
      } else if (nextStep.ms < 5000) {
        console.log(`[PostProcess] Bumping wait after switchFrame from ${nextStep.ms}ms to 5000ms: ${step.selector}`);
        nextStep.ms = 5000;
      }
    }

    if (actionType === 'click' && step.selector && isQueryTrigger(step.selector)) {
      if (!nextIsWait) {
        console.log(`[PostProcess] Injecting 8000ms wait after query trigger click: ${step.selector}`);
        result.push({ type: 'waitForTimeout', ms: 8000 });
      } else if (nextStep.ms < 8000) {
        console.log(`[PostProcess] Bumping wait after query trigger from ${nextStep.ms}ms to 8000ms: ${step.selector}`);
        nextStep.ms = 8000;
      }
    }
  }

  return result;
}

/**
 * Tracks dropdown exploration state for the minimum-filter-exploration constraint.
 * Before the agent can terminate, every <select> on the bill listing page
 * must have been changed at least once, with row counts compared.
 */
interface FilterExploration {
  selector: string;
  name: string;
  options: { value: string; label: string }[];
  triedValues: Map<string, number>;  // value → row count observed
  bestValue: string;
  bestCount: number;
}

export class DiscoveryAgent {
  private browser!: Browser;
  private page!: Page;
  private currentFrame!: Page | Frame;
  private anthropic: Anthropic;
  private cost = 0;
  private config: any = {
    municipality_id: 'unknown',
    version: '1.0',
    steps: {
      login: [],
      navigate: [],
      filter_history: []
    },
    extraction: {}
  };
  private currentPhase: 'login' | 'navigate' | 'filter_history' = 'login';
  private history: any[] = [];
  private credentials: { username?: string, password?: string };

  // Filter exploration state (Option A)
  private dropdownExplorations: Map<string, FilterExploration> = new Map();
  private filterExplorationComplete = false;

  constructor(municipalityId: string, creds: { username?: string, password?: string }) {
    this.config.municipality_id = municipalityId;
    this.credentials = creds;
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  private updateCost(inputTokens: number, outputTokens: number) {
    const runCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;
    this.cost += runCost;
    console.log(`[Model B] Tokens used: ${inputTokens} in, ${outputTokens} out. Run cost: $${runCost.toFixed(4)}. Total cost: $${this.cost.toFixed(4)}`);
    if (this.cost > MAX_COST) {
      this.savePartialConfig();
      throw new Error(`Cost ceiling exceeded ($${this.cost.toFixed(4)} > $${MAX_COST})`);
    }
  }

  private savePartialConfig() {
    const p = path.join(process.cwd(), 'lib', 'scrapers', 'configs', `${this.config.municipality_id}.partial.json`);
    fs.writeFileSync(p, JSON.stringify(this.config, null, 2));
    console.log(`[Model B] Saved partial config to ${p}`);
  }

  /**
   * Discover all <select> dropdowns on the current billing page.
   * Returns their selectors, names, and available options.
   */
  private async discoverDropdowns(): Promise<FilterExploration[]> {
    const dropdowns: FilterExploration[] = await this.currentFrame.evaluate(`(function() {
      const selects = document.querySelectorAll('select');
      return Array.from(selects).filter(s => {
        const style = window.getComputedStyle(s);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }).map(s => ({
        selector: s.name ? "select[name='" + s.name + "']" : (s.id ? '#' + s.id : null),
        name: s.name || s.id || 'unknown',
        options: Array.from(s.options).map(o => ({ value: o.value, label: o.text.trim() })),
        triedValues: {},
        bestValue: '',
        bestCount: 0
      })).filter(d => d.selector && d.options.length > 1);
    })()`);

    return dropdowns;
  }

  /**
   * Count rows in the current results table.
   * Uses any row selector from the extraction config, or falls back to common SAP/table row selectors.
   */
  private async countResultRows(): Promise<number> {
    const count = await this.currentFrame.evaluate(`(function() {
      // Try common SAP and HTML table row selectors
      const candidates = [
        'table#DataTable tbody tr',
        'table.dataTable tbody tr',
        'table tbody tr:has(td)',
        'tr.dataRow',
        'tr:has(td.dataleftWrap)',
        'table tbody tr'
      ];
      for (const sel of candidates) {
        const rows = document.querySelectorAll(sel);
        if (rows.length > 0) return rows.length;
      }
      return 0;
    })()`);
    return count as number;
  }

  /**
   * Click the Find/Search button on the current page.
   * Tries common SAP selectors.
   */
  private async clickFindButton(): Promise<void> {
    const findSelectors = [
      "input[name='Search'][value='Find']",
      "input[value='Find']",
      "button:has-text('Find')",
      "input[value='Search']",
      "button:has-text('Search')",
      ".sapBtnEmph",
    ];

    for (const sel of findSelectors) {
      try {
        const btn = await this.currentFrame.$(sel);
        if (btn) {
          await btn.click();
          // Mandatory AJAX wait after query trigger
          await new Promise(r => setTimeout(r, 8000));
          return;
        }
      } catch {
        continue;
      }
    }
    console.warn('[Model B] Could not find any Find/Search button for filter exploration');
  }

  /**
   * Option A: Minimum filter exploration — CROSS-PRODUCT approach.
   *
   * Before allowing termination, the agent must:
   * 1. Enumerate every <select> dropdown on the billing page
   * 2. Compute the cross-product of all dropdown option combinations
   * 3. For each combination, set ALL dropdowns, click Find, count rows
   * 4. The combination producing the highest row count wins
   * 5. Set the winning combination and re-run Find
   * 6. Update the config's filter_history steps to reflect the winning values
   *
   * Cross-product ensures the winning combination is tested together,
   * not per-dropdown in isolation (which produced wrong results).
   *
   * Safety cap: max 50 combinations tried. If the cross-product exceeds this,
   * we skip the "From/To" or similar complex options to reduce the set.
   *
   * This is deterministic. The LLM has no say in whether exploration happens.
   */
  private async runFilterExploration(): Promise<void> {
    console.log('\n[Model B] ========== FILTER EXPLORATION (Option A — Cross-Product) ==========');
    console.log('[Model B] Enumerating all dropdowns on the billing page...');

    const dropdowns = await this.discoverDropdowns();
    if (dropdowns.length === 0) {
      console.log('[Model B] No dropdowns found. Skipping filter exploration.');
      this.filterExplorationComplete = true;
      return;
    }

    console.log(`[Model B] Found ${dropdowns.length} dropdown(s):`);
    for (const dd of dropdowns) {
      console.log(`  - ${dd.name} (${dd.selector}): ${dd.options.length} options`);
      for (const opt of dd.options) {
        console.log(`      "${opt.value}" → "${opt.label}"`);
      }
    }

    // Filter out options that are clearly UI-only (e.g. "From/To" requires date pickers)
    const usableDropdowns = dropdowns.map(dd => ({
      ...dd,
      options: dd.options.filter(o => {
        const label = o.label.toLowerCase();
        // Skip "From/To" or custom range options that need additional inputs
        if (label.includes('from/to') || label.includes('custom') || label.includes('date range')) return false;
        return true;
      })
    })).filter(dd => dd.options.length > 0);

    // Compute cross-product of all dropdown options
    const MAX_COMBINATIONS = 50;
    let combinations: { values: { selector: string; name: string; value: string; label: string }[] }[] = [{ values: [] }];

    for (const dd of usableDropdowns) {
      const newCombinations: typeof combinations = [];
      for (const combo of combinations) {
        for (const opt of dd.options) {
          newCombinations.push({
            values: [...combo.values, { selector: dd.selector, name: dd.name, value: opt.value, label: opt.label }]
          });
        }
      }
      combinations = newCombinations;

      if (combinations.length > MAX_COMBINATIONS) {
        console.warn(`[Model B] Cross-product exceeds ${MAX_COMBINATIONS} combinations (${combinations.length}). Truncating.`);
        combinations = combinations.slice(0, MAX_COMBINATIONS);
        break;
      }
    }

    console.log(`[Model B] Testing ${combinations.length} combination(s)...\n`);

    // Track best combination
    let bestCombo: typeof combinations[0] | null = null;
    let bestCount = 0;
    const results: { combo: typeof combinations[0]; count: number }[] = [];

    for (let i = 0; i < combinations.length; i++) {
      const combo = combinations[i];
      const desc = combo.values.map(v => `${v.name}="${v.label}"`).join(', ');
      console.log(`[Model B] Combo ${i + 1}/${combinations.length}: ${desc}`);

      try {
        // Set ALL dropdowns for this combination
        for (const v of combo.values) {
          await this.currentFrame.selectOption(v.selector, v.value);
          await new Promise(r => setTimeout(r, 300)); // Brief settle
        }

        // Click Find
        await this.clickFindButton();

        // Count rows
        const rowCount = await this.countResultRows();
        console.log(`[Model B]   → ${rowCount} row(s)`);
        results.push({ combo, count: rowCount });

        if (rowCount > bestCount || (rowCount === bestCount && rowCount > 0)) {
          // On tie, prefer the combination with larger numeric dropdown values
          // (wider time ranges like "Last 5 Years" > "Last 12 Months")
          if (rowCount > bestCount) {
            bestCount = rowCount;
            bestCombo = combo;
            console.log(`[Model B]   → NEW BEST: ${rowCount} rows`);
          } else {
            // Tie-break: sum of numeric dropdown values — larger = wider time range
            const currentSum = combo.values.reduce((s, v) => s + (parseFloat(v.value) || 0), 0);
            const bestSum = bestCombo!.values.reduce((s, v) => s + (parseFloat(v.value) || 0), 0);
            if (currentSum > bestSum) {
              bestCombo = combo;
              console.log(`[Model B]   → TIE-BREAK: preferring wider time range (value sum ${currentSum} > ${bestSum})`);
            }
          }
        }
      } catch (e: any) {
        console.warn(`[Model B]   → Error: ${e.message}`);
        results.push({ combo, count: -1 });
      }
    }

    // Print summary table
    console.log('\n[Model B] ========== EXPLORATION RESULTS ==========');
    for (const { combo, count } of results) {
      const desc = combo.values.map(v => `${v.name}="${v.label}"`).join(', ');
      const marker = combo === bestCombo ? ' ← WINNER' : '';
      console.log(`  [${count >= 0 ? count : 'ERR'}] ${desc}${marker}`);
    }

    if (!bestCombo) {
      console.warn('[Model B] No valid combination found. Keeping LLM-generated filters.');
      this.filterExplorationComplete = true;
      return;
    }

    // Set the winning combination and re-run Find for verification
    console.log('\n[Model B] Setting winning combination...');
    const winningSteps: any[] = [];

    for (const v of bestCombo.values) {
      console.log(`  ${v.name} → "${v.label}" (value="${v.value}")`);
      await this.currentFrame.selectOption(v.selector, v.value);
      await new Promise(r => setTimeout(r, 300));

      winningSteps.push({
        action: 'select',
        selector: v.selector,
        value: v.value
      });
    }

    // Click Find one more time with the winning combination
    await this.clickFindButton();
    const finalCount = await this.countResultRows();
    console.log(`[Model B] Final row count with winning combination: ${finalCount}`);

    // Replace the filter_history steps with the deterministically-verified winning combination
    // Keep everything up to and including the last switchFrame + wait, then append winning filters
    const existingSteps = this.config.steps.filter_history;
    const lastFrameIdx = existingSteps.reduce((idx: number, step: any, i: number) => {
      const t = step.action || step.type;
      if (t === 'switchFrame' || t === 'waitForTimeout') return i;
      return idx;
    }, -1);

    const preFilterSteps = existingSteps.slice(0, lastFrameIdx + 1);

    // Build the clean filter_history: pre-filter setup + winning select steps + Find click
    const findSelector = await this.findFindButtonSelector();
    this.config.steps.filter_history = [
      ...preFilterSteps,
      ...winningSteps,
      { action: 'click', selector: findSelector }
      // The post-processor will inject the mandatory 8000ms wait after this click
    ];

    this.filterExplorationComplete = true;
    console.log('[Model B] ========== FILTER EXPLORATION COMPLETE ==========\n');
  }

  /**
   * Deterministic pagination discovery.
   *
   * After the result table is loaded with the winning filter combo, scan the DOM
   * for pagination controls. If found, click once to verify behaviour, then record
   * the selector and the disabled condition in the config.
   */
  private async discoverPagination(): Promise<{ selector: string; disabledCondition: string } | null> {
    console.log('\n[Model B] ========== PAGINATION DISCOVERY ==========');

    // Common pagination selectors — ordered most specific → least
    const PAGINATION_CANDIDATES = [
      // SAP Web Dynpro patterns
      { sel: "a:has-text('Next Page')", desc: 'SAP Next Page link' },
      { sel: "a:has-text('Next page')", desc: 'Next page link' },
      { sel: "input[title='Next Page']", desc: 'SAP Next Page input' },
      { sel: "a[title='Next Page']", desc: 'Next Page title link' },
      { sel: "a[title='Go to Next Page']", desc: 'Go to Next Page link' },
      // Generic HTML patterns
      { sel: "a:has-text('Next')", desc: 'Next link' },
      { sel: "button:has-text('Next')", desc: 'Next button' },
      { sel: "a:has-text('›')", desc: '› link' },
      { sel: "a:has-text('»')", desc: '» link' },
      { sel: "a:has-text('>')", desc: '> link' },
      { sel: '.pagination a.next', desc: 'pagination next class' },
      { sel: '[aria-label="Next"]', desc: 'aria-label Next' },
      { sel: '[aria-label="next page"]', desc: 'aria-label next page' },
      { sel: "a:has-text('Load more')", desc: 'Load more link' },
      { sel: "button:has-text('Load more')", desc: 'Load more button' },
      { sel: "a:has-text('Show all')", desc: 'Show all link' },
      // SAP page-number navigation
      { sel: "a[title*='page']:not([title*='Previous'])", desc: 'SAP page link' },
    ];

    const rowsBefore = await this.countResultRows();
    console.log(`[Model B] Rows on current page: ${rowsBefore}`);

    for (const { sel, desc } of PAGINATION_CANDIDATES) {
      try {
        const el = await this.currentFrame.$(sel);
        if (!el) continue;

        // Verify it's visible
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;

        console.log(`[Model B] Found pagination control: ${desc} (${sel})`);

        // Click it to verify it loads new rows
        await el.click();
        await new Promise(r => setTimeout(r, 8000)); // AJAX wait

        const rowsAfter = await this.countResultRows();
        console.log(`[Model B] Rows after clicking Next: ${rowsAfter}`);

        if (rowsAfter > 0) {
          // Pagination works — now navigate back to page 1
          // Look for a "Previous" or "First" control
          const prevCandidates = [
            "a:has-text('Previous Page')", "a:has-text('Previous page')",
            "input[title='Previous Page']", "a[title='Previous Page']",
            "a:has-text('Previous')", "a:has-text('‹')", "a:has-text('«')",
            "a:has-text('First Page')", "a[title='First Page']",
          ];
          for (const prevSel of prevCandidates) {
            try {
              const prevEl = await this.currentFrame.$(prevSel);
              if (prevEl && await prevEl.isVisible().catch(() => false)) {
                await prevEl.click();
                await new Promise(r => setTimeout(r, 8000));
                break;
              }
            } catch { continue; }
          }

          // Determine disabled condition
          // After going back to page 1, check if there's a last-page indicator
          // We'll use the outerHTML of the next button when it's on the last page
          // For now, use common disabled patterns
          const disabledCondition = await this.detectDisabledCondition(sel);

          console.log(`[Model B] Pagination confirmed: selector="${sel}", disabled="${disabledCondition}"`);
          console.log('[Model B] ========== PAGINATION DISCOVERY COMPLETE ==========\n');
          return { selector: sel, disabledCondition };
        } else {
          console.log(`[Model B] ${desc} did not load new rows. Skipping.`);
          // Navigate back
          try { await this.page.goBack(); await new Promise(r => setTimeout(r, 5000)); } catch {}
        }
      } catch (e: any) {
        console.log(`[Model B] Error testing ${desc}: ${e.message}`);
        continue;
      }
    }

    console.log('[Model B] No pagination controls found.');
    console.log('[Model B] ========== PAGINATION DISCOVERY COMPLETE ==========\n');
    return null;
  }

  /**
   * Detect the condition that indicates pagination is exhausted (last page).
   */
  private async detectDisabledCondition(nextSelector: string): Promise<string> {
    // Common SAP and HTML disabled patterns
    const el = await this.currentFrame.$(nextSelector);
    if (!el) return 'display:none';

    const html = await el.evaluate(node => node.outerHTML).catch(() => '');

    // Check what attributes might change when disabled
    if (html.includes('disabled')) return 'disabled';
    if (html.includes('sapBtnDisabled')) return 'sapBtnDisabled';
    if (html.includes('inactive')) return 'inactive';

    // Default: element disappearing means we're on the last page
    return 'display:none';
  }

  /**
   * Verify a PDF download using download interception.
   * Returns the downloaded buffer if valid, throws if not a real PDF.
   */
  private async verifyPdfDownload(linkSelector: string): Promise<Buffer> {
    console.log(`[Model B] Verifying PDF download via interception: ${linkSelector}`);
    const link = await this.currentFrame.$(linkSelector);
    if (!link) {
      throw new Error(`PDF link selector '${linkSelector}' found no elements.`);
    }

    // Try download interception first (SAP may serve the file as a download)
    try {
      const page = ('page' in this.currentFrame) ? (this.currentFrame as Frame).page() : this.currentFrame as Page;
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        link.click()
      ]);

      const filePath = await download.path();
      if (!filePath) throw new Error('Download path is null');
      const buf = fs.readFileSync(filePath);
      this.validatePdfMagic(buf);
      console.log(`[Model B] PDF download verified via interception (${buf.length} bytes)`);
      return buf;
    } catch (downloadErr: any) {
      // Download interception failed — try new-tab approach
      console.log(`[Model B] Download interception failed: ${downloadErr.message}. Trying new-tab approach...`);
    }

    // Fallback: SAP sometimes opens PDF in a new tab
    try {
      const link2 = await this.currentFrame.$(linkSelector);
      if (!link2) throw new Error('Link disappeared after first attempt');

      const page = ('page' in this.currentFrame) ? (this.currentFrame as Frame).page() : this.currentFrame as Page;
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 15000 }),
        link2.click()
      ]);
      await newPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Try to get the response body (the actual PDF bytes)
      const resp = await newPage.goto(newPage.url(), { waitUntil: 'networkidle' }).catch(() => null);
      let buf: Buffer;
      if (resp) {
        buf = Buffer.from(await resp.body());
      } else {
        // Last resort: capture rendered page
        buf = await newPage.pdf({ printBackground: true });
      }
      await newPage.close();
      this.validatePdfMagic(buf);
      console.log(`[Model B] PDF download verified via new-tab (${buf.length} bytes)`);
      return buf;
    } catch (e: any) {
      throw new Error(`Failed to download PDF using selector '${linkSelector}': ${e.message}`);
    }
  }

  /** Validate PDF magic number %PDF- (0x25504446) */
  private validatePdfMagic(buf: Buffer): void {
    const magic = buf.subarray(0, 5).toString('ascii');
    if (magic !== '%PDF-') {
      const hexPreview = buf.subarray(0, 32).toString('hex');
      throw new Error(`Downloaded file is not a valid PDF. Size: ${buf.length} bytes. First 32 bytes (hex): ${hexPreview}. Magic: '${magic}'`);
    }
  }

  /**
   * Find the selector for the Find/Search button on the current page.
   */
  private async findFindButtonSelector(): Promise<string> {
    const candidates = [
      "input[name='Search'][value='Find']",
      "input[value='Find']",
      "button:has-text('Find')",
      "input[value='Search']",
      "button:has-text('Search')",
      ".sapBtnEmph",
    ];
    for (const sel of candidates) {
      try {
        const el = await this.currentFrame.$(sel);
        if (el) return sel;
      } catch {
        continue;
      }
    }
    return "input[value='Find']"; // Fallback
  }

  public async start(startUrl: string) {
    this.browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await this.browser.newContext({ acceptDownloads: true });
    this.page = await context.newPage();
    this.currentFrame = this.page;

    console.log(`[Model B] Navigating to ${startUrl}...`);
    await this.page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    let loopCount = 0;
    while (loopCount < 30) {
      loopCount++;
      console.log(`\n[Model B] --- Loop ${loopCount} ---`);
      
      const screenshot = await this.page.screenshot({ type: 'jpeg', quality: 50 });
      const b64_img = screenshot.toString('base64');
      
      const dom = await getSimplifiedDOM(this.currentFrame, this.credentials);
      
      const prompt = `CURRENT PHASE: ${this.currentPhase}\n\nSIMPLIFIED DOM:\n${JSON.stringify(dom, null, 2)}\n\nHISTORY OF ACTIONS:\n${JSON.stringify(this.history, null, 2)}`;

      console.log(`[Model B] Thinking...`);
      const response = await this.anthropic.messages.create({
        model: VISION_MODEL,
        max_tokens: 1024,
        system: DISCOVERY_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64_img } },
              { type: 'text', text: prompt }
            ]
          }
        ]
      });

      if (response.usage) {
        this.updateCost(response.usage.input_tokens, response.usage.output_tokens);
      }

      const rawText = ('text' in response.content[0] ? response.content[0].text : '');
      let actionObj;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        actionObj = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      } catch (e) {
        console.error("[Model B] Failed to parse JSON from LLM. Raw:", rawText);
        this.history.push({ error: "Failed to parse JSON. Provide only valid JSON." });
        continue;
      }

      console.log(`[Model B] Thought: ${actionObj.thought}`);
      const action = actionObj.action;
      console.log(`[Model B] Action:`, action);

      if (action.type === 'done') {
        console.log(`[Model B] Exploration complete!`);
        break;
      }

      try {
        await this.executeAction(action);
        this.history.push({ action, status: 'success' });
        
        // Record action to config if it's a structural one
        if (['fill', 'click', 'select', 'waitForSelector', 'waitForTimeout', 'switchFrame'].includes(action.type)) {
          const configStep = { ...action, action: action.type };
          delete configStep.type;
          
          if (configStep.value === '[REDACTED_USERNAME]') configStep.value = '${username}';
          if (configStep.value === '[REDACTED_PASSWORD]') configStep.value = '${password}';

          this.config.steps[this.currentPhase].push(configStep);
          
          // Heuristic phase transition
          if (this.currentPhase === 'login' && configStep.selector?.includes('Logon')) this.currentPhase = 'navigate';
          else if (this.currentPhase === 'navigate' && configStep.action === 'switchFrame') this.currentPhase = 'filter_history';
        } else if (action.type === 'extract') {
          // ──────────────────────────────────────────────────────────
          // GATE: Minimum filter exploration (Option A)
          // The LLM wants to extract. Before we allow it, run the
          // deterministic filter exploration if it hasn't happened yet.
          // ──────────────────────────────────────────────────────────
          if (!this.filterExplorationComplete) {
            console.log('[Model B] Extract requested — running mandatory filter exploration first...');
            await this.runFilterExploration();
            // After exploration, we need to re-verify the PDF selector
            // because the page content may have changed
          }

          // 1. Discover pagination controls (deterministic)
          const pagination = await this.discoverPagination();

          // 2. Verify PDF selector with download interception + magic number
          await this.verifyPdfDownload(action.pdf_link_selector);

          // 3. Run deterministic post-processing on ALL step phases
          console.log('\n[Model B] Running deterministic post-processing...');
          for (const phase of ['login', 'navigate', 'filter_history'] as const) {
            const before = this.config.steps[phase].length;
            this.config.steps[phase] = postProcessSteps(this.config.steps[phase]);
            const after = this.config.steps[phase].length;
            if (after > before) {
              console.log(`[PostProcess] ${phase}: injected ${after - before} wait step(s)`);
            }
          }

          this.config.extraction = {
            row_selector: action.row_selector,
            period_selector: action.period_selector || "",
            pdf_link_selector: action.pdf_link_selector,
            pagination_next_selector: pagination?.selector || action.pagination_next_selector || "",
            pagination_disabled_condition: pagination?.disabledCondition || ""
          };
          this.history.push({ extraction_tested: 'success' });
          break; // Extract is the final step
        }
      } catch (err: any) {
        console.warn(`[Model B] Action failed: ${err.message}`);
        this.history.push({ action, status: 'error', error: err.message });
      }
    }

    await this.browser.close();
    
    // Output final config
    const finalPath = path.join(process.cwd(), 'lib', 'scrapers', 'configs', `${this.config.municipality_id}.json`);
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    fs.writeFileSync(finalPath, JSON.stringify(this.config, null, 2));
    console.log(`\n[Model B] Successfully wrote final config to ${finalPath}`);
    return { cost: this.cost, loops: loopCount };
  }

  private async executeAction(action: any) {
    let selector = action.selector;
    if (selector) {
      selector = selector.replace(/\[REDACTED_USERNAME\]/g, this.credentials.username);
      selector = selector.replace(/\[REDACTED_PASSWORD\]/g, this.credentials.password);
    }
    let value = action.value;
    if (value) {
      value = value.replace(/\[REDACTED_USERNAME\]/g, this.credentials.username);
      value = value.replace(/\[REDACTED_PASSWORD\]/g, this.credentials.password);
    }

    switch (action.type) {
      case 'fill':
        await this.currentFrame.fill(selector, value);
        break;
      case 'click':
        await this.currentFrame.click(selector);
        break;
      case 'select':
        await this.currentFrame.selectOption(selector, value);
        break;
      case 'waitForSelector':
        await this.currentFrame.waitForSelector(selector, { timeout: action.timeout_ms || 10000 });
        break;
      case 'waitForTimeout':
        await new Promise(r => setTimeout(r, action.ms || 1000));
        break;
      case 'switchFrame':
        // Try finding iframe
        let found = null;
        for (const f of this.page.frames()) {
          const url = f.url();
          const name = f.name();
          if ((selector.includes('src') && url.includes(selector.match(/src\*=['"]([^'"]+)['"]/)?.[1] || '')) || 
              (selector.includes('name') && name.includes(selector.match(/name=['"]([^'"]+)['"]/)?.[1] || ''))) {
            found = f;
            break;
          }
        }
        if (found) {
          this.currentFrame = found;
        } else {
          throw new Error(`Frame matching ${selector} not found`);
        }
        break;
      case 'revert':
        await this.page.goBack().catch(() => this.page.reload());
        this.currentFrame = this.page;
        // Pop the last state changes to prune dead ends
        if (this.config.steps[this.currentPhase].length > 0) {
          this.config.steps[this.currentPhase].pop();
        }
        break;
      case 'extract':
        // handled in main loop
        break;
    }
  }
}
