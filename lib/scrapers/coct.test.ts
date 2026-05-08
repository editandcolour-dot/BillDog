/**
 * Unit tests for CoCT scraper — Phase 2 bill download methods.
 *
 * Tests verify:
 * - verifyCredentials() delegates to loginToPortal() correctly
 * - fetchLatestBill() handles empty results and network errors
 * - fetchBillHistory() handles empty results and scrape errors
 * - Error classification → typed ScraperErrorCode
 * - No credential leaking in any error path
 *
 * These tests do NOT hit the real CoCT portal. They mock at the Playwright
 * module level using vi.mock() for consistent dynamic import interception.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mock Playwright at module level — intercepts dynamic import()
// ============================================================================

// Shared mutable references so each test can configure behaviour
let mockPage: ReturnType<typeof createMockPage>;
let mockBrowser: ReturnType<typeof createMockBrowser>;
let mockFrame: ReturnType<typeof createMockFrame>;

function createMockFrame() {
  return {
    waitForSelector: vi.fn().mockResolvedValue({}),
    selectOption: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    $$: vi.fn().mockResolvedValue([]),
    url: vi.fn().mockReturnValue('about:blank'),
  };
}

function createMockPage() {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue({ click: vi.fn() }),
    fill: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    textContent: vi.fn().mockResolvedValue(''),
    frame: vi.fn().mockReturnValue(null),
    frames: vi.fn().mockReturnValue([]),
    mainFrame: vi.fn(),
    waitForEvent: vi.fn().mockResolvedValue(null),
    $$: vi.fn().mockResolvedValue([]),
  };
}

function createMockBrowser() {
  return {
    newContext: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

// Module-level mock — this intercepts `await import('playwright-core')` inside coct.ts
vi.mock('playwright-core', () => ({
  chromium: {
    launch: vi.fn(() => {
      mockBrowser.newContext.mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(mockPage),
      });
      return Promise.resolve(mockBrowser);
    }),
  },
}));

// Import AFTER mock registration
import { CoctScraper } from '@/lib/scrapers/coct';

describe('CoctScraper', () => {
  let scraper: CoctScraper;

  beforeEach(() => {
    scraper = new CoctScraper();
    mockPage = createMockPage();
    mockBrowser = createMockBrowser();
    mockFrame = createMockFrame();

    // Default: mainFrame returns the mock frame
    mockPage.mainFrame.mockReturnValue(mockFrame);
  });

  describe('constructor', () => {
    it('sets municipalityId and municipalityName', () => {
      expect(scraper.municipalityId).toBe('city-of-cape-town');
      expect(scraper.municipalityName).toBe('City of Cape Town');
    });
  });

  // ==========================================================================
  // verifyCredentials
  // ==========================================================================
  describe('verifyCredentials', () => {
    it('returns success when login reaches dashboard', async () => {
      // #logonuidfield → found, #buttonlogoff → found (dashboard), error → never resolves
      mockPage.waitForSelector.mockImplementation((selector: string) => {
        if (selector === '#logonuidfield') return Promise.resolve({});
        if (selector.includes('#buttonlogoff')) return Promise.resolve({});
        if (selector.includes('.urMsgBarErr')) return new Promise(() => {});
        return Promise.resolve({});
      });

      const result = await scraper.verifyCredentials('testuser', 'testpass');

      expect(result.success).toBe(true);
      expect(result.errorCode).toBeUndefined();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('returns INVALID_CREDENTIALS when login shows error', async () => {
      mockPage.waitForSelector.mockImplementation((selector: string) => {
        if (selector === '#logonuidfield') return Promise.resolve({});
        if (selector.includes('#buttonlogoff')) return new Promise(() => {});
        if (selector.includes('.urMsgBarErr')) return Promise.resolve({});
        return Promise.resolve({});
      });
      mockPage.textContent.mockResolvedValue('Invalid username or password');

      const result = await scraper.verifyCredentials('testuser', 'wrongpass');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('returns PORTAL_DOWN on network error', async () => {
      mockPage.goto.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'));

      const result = await scraper.verifyCredentials('testuser', 'testpass');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PORTAL_DOWN');
    });

    it('returns ACCOUNT_LOCKED when error text mentions locked', async () => {
      mockPage.waitForSelector.mockImplementation((selector: string) => {
        if (selector === '#logonuidfield') return Promise.resolve({});
        if (selector.includes('#buttonlogoff')) return new Promise(() => {});
        if (selector.includes('.urMsgBarErr')) return Promise.resolve({});
        return Promise.resolve({});
      });
      mockPage.textContent.mockResolvedValue('Your account has been locked');

      const result = await scraper.verifyCredentials('testuser', 'testpass');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ACCOUNT_LOCKED');
    });
  });

  // ==========================================================================
  // fetchLatestBill
  // ==========================================================================
  describe('fetchLatestBill', () => {
    function setupSuccessfulLogin() {
      mockPage.waitForSelector.mockImplementation((selector: string) => {
        if (selector === '#logonuidfield') return Promise.resolve({});
        if (selector.includes('#buttonlogoff')) return Promise.resolve({});
        if (selector.includes('.urMsgBarErr')) return new Promise(() => {});
        // Municipal accounts tab
        if (selector.includes('tabIndex1') || selector.includes('Municipal accounts')) {
          return Promise.resolve({ click: vi.fn() });
        }
        // Paid invoices link
        if (selector.includes('paid invoices')) {
          return Promise.resolve({ click: vi.fn() });
        }
        return Promise.resolve({});
      });
      // Iframe found by name
      mockPage.frame.mockReturnValue(mockFrame);
    }

    it('returns undefined data when no bills found', async () => {
      setupSuccessfulLogin();

      // Frame: bill table renders with no PDF links
      mockFrame.waitForSelector.mockImplementation((selector: string) => {
        if (selector.includes('billType') || selector.includes('searchDate')) {
          return Promise.resolve({});
        }
        if (selector.includes('showBillPDF') || selector.includes('PDF')) {
          return Promise.reject(new Error('timeout')); // No PDF links
        }
        if (selector.includes('No data') || selector.includes('No results')) {
          return Promise.resolve({}); // "No data" message appears
        }
        return Promise.resolve({});
      });
      mockFrame.$$!.mockResolvedValue([]); // No PDF links

      const result = await scraper.fetchLatestBill('testuser', 'testpass');

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(mockBrowser.close).toHaveBeenCalled();
    }, 15_000);

    it('returns PORTAL_DOWN on network failure', async () => {
      mockPage.goto.mockRejectedValue(new Error('net::ERR_NAME_NOT_RESOLVED'));

      const result = await scraper.fetchLatestBill('testuser', 'testpass');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PORTAL_DOWN');
    });

    it('returns SESSION_TIMEOUT if navigation to paid invoices fails', async () => {
      // Login succeeds
      mockPage.waitForSelector.mockImplementation((selector: string) => {
        if (selector === '#logonuidfield') return Promise.resolve({});
        if (selector.includes('#buttonlogoff')) return Promise.resolve({});
        if (selector.includes('.urMsgBarErr')) return new Promise(() => {});
        // Tab click resolves
        if (selector.includes('tabIndex1') || selector.includes('Municipal accounts')) {
          return Promise.resolve({ click: vi.fn() });
        }
        // Paid invoices link NOT found
        if (selector.includes('paid invoices')) {
          return Promise.reject(new Error('timeout'));
        }
        return Promise.resolve({});
      });
      // L2N5 fallback also fails
      mockPage.click.mockImplementation((selector: string) => {
        if (selector === '#L2N5') return Promise.reject(new Error('not found'));
        return Promise.resolve();
      });

      const result = await scraper.fetchLatestBill('testuser', 'testpass');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('SESSION_TIMEOUT');
    }, 15_000);
  });

  // ==========================================================================
  // fetchBillHistory
  // ==========================================================================
  describe('fetchBillHistory', () => {
    function setupSuccessfulLogin() {
      mockPage.waitForSelector.mockImplementation((selector: string) => {
        if (selector === '#logonuidfield') return Promise.resolve({});
        if (selector.includes('#buttonlogoff')) return Promise.resolve({});
        if (selector.includes('.urMsgBarErr')) return new Promise(() => {});
        if (selector.includes('tabIndex1') || selector.includes('Municipal accounts')) {
          return Promise.resolve({ click: vi.fn() });
        }
        if (selector.includes('paid invoices')) {
          return Promise.resolve({ click: vi.fn() });
        }
        return Promise.resolve({});
      });
      mockPage.frame.mockReturnValue(mockFrame);
    }

    it('returns empty array when no bills found', async () => {
      setupSuccessfulLogin();

      mockFrame.waitForSelector.mockImplementation((selector: string) => {
        if (selector.includes('billType') || selector.includes('searchDate')) {
          return Promise.resolve({});
        }
        if (selector.includes('showBillPDF') || selector.includes('PDF')) {
          return Promise.reject(new Error('timeout'));
        }
        if (selector.includes('No data') || selector.includes('No results')) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });
      mockFrame.$$!.mockResolvedValue([]);

      const result = await scraper.fetchBillHistory('testuser', 'testpass', 36);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    }, 15_000);

    it('returns PORTAL_DOWN on network failure', async () => {
      mockPage.goto.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'));

      const result = await scraper.fetchBillHistory('testuser', 'testpass', 36);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PORTAL_DOWN');
    });
  });

  // ==========================================================================
  // Error classification
  // ==========================================================================
  describe('error classification', () => {
    it('classifies PASSWORD_CHANGE_REQUIRED correctly', async () => {
      mockPage.waitForSelector.mockImplementation((selector: string) => {
        if (selector === '#logonuidfield') return Promise.resolve({});
        if (selector.includes('#buttonlogoff')) return new Promise(() => {});
        if (selector.includes('.urMsgBarErr')) return Promise.resolve({});
        return Promise.resolve({});
      });
      mockPage.textContent.mockResolvedValue('You must change your password before continuing');

      const result = await scraper.verifyCredentials('testuser', 'testpass');
      expect(result.errorCode).toBe('PASSWORD_CHANGE_REQUIRED');
    });

    it('classifies MFA_REQUIRED correctly', async () => {
      mockPage.waitForSelector.mockImplementation((selector: string) => {
        if (selector === '#logonuidfield') return Promise.resolve({});
        if (selector.includes('#buttonlogoff')) return new Promise(() => {});
        if (selector.includes('.urMsgBarErr')) return Promise.resolve({});
        return Promise.resolve({});
      });
      mockPage.textContent.mockResolvedValue('Two-factor verification required');

      const result = await scraper.verifyCredentials('testuser', 'testpass');
      expect(result.errorCode).toBe('MFA_REQUIRED');
    });
  });

  // ==========================================================================
  // Credential safety
  // ==========================================================================
  describe('credential safety', () => {
    it('never includes credentials in error messages', async () => {
      mockPage.goto.mockRejectedValue(new Error('Some portal error'));

      const consoleSpy = vi.spyOn(console, 'error');

      const result = await scraper.verifyCredentials('mysecretuser', 'mysecretpass');

      // Verify no console output contains the credentials
      for (const call of consoleSpy.mock.calls) {
        const output = call.join(' ');
        expect(output).not.toContain('mysecretuser');
        expect(output).not.toContain('mysecretpass');
      }

      // Verify the error message doesn't contain credentials
      expect(result.error).not.toContain('mysecretuser');
      expect(result.error).not.toContain('mysecretpass');
    });

    it('never includes credentials in fetchLatestBill error messages', async () => {
      mockPage.goto.mockRejectedValue(new Error('Portal timeout'));

      const consoleSpy = vi.spyOn(console, 'error');
      const consoleLogSpy = vi.spyOn(console, 'log');

      const result = await scraper.fetchLatestBill('secretname', 'secretword');

      for (const spy of [consoleSpy, consoleLogSpy]) {
        for (const call of spy.mock.calls) {
          const output = call.join(' ');
          expect(output).not.toContain('secretname');
          expect(output).not.toContain('secretword');
        }
      }

      if (result.error) {
        expect(result.error).not.toContain('secretname');
        expect(result.error).not.toContain('secretword');
      }
    });
  });
});
