/**
 * Municipal Scraper — Shared Types
 *
 * Defines the interface that all municipality-specific scrapers must implement.
 * Each scraper handles login, credential verification, and bill downloading
 * for a single municipality's e-services portal.
 *
 * Source of truth: ARCHITECTURE.md + implementation_plan v3 §3b.
 */

/** Error codes returned by scraper operations. Used for auto-revocation logic. */
export type ScraperErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'PORTAL_DOWN'
  | 'MFA_REQUIRED'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'ACCOUNT_LOCKED'
  | 'SESSION_TIMEOUT'
  | 'UNKNOWN';

/** Wrapper for all scraper operations — success or typed failure. */
export interface ScraperResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: ScraperErrorCode;
}

/** A single downloaded bill PDF. */
export interface BillDownload {
  period: string;       // e.g. "January 2026" or "2026-01"
  pdfBuffer: Buffer;
  filename: string;     // e.g. "ISU123456789.pdf"
}

/**
 * JSON Config Schema for v4 Generic Executor
 */
export interface ScraperAction {
  action: 'fill' | 'click' | 'waitForSelector' | 'waitForTimeout' | 'switchFrame' | 'select';
  selector?: string;
  value?: string;
  ms?: number;
  timeout_ms?: number;
  optional?: boolean;
}

export interface ScraperExtractionConfig {
  row_selector: string;
  period_selector: string;
  pdf_link_selector: string;
  pagination_next_selector?: string;
  pagination_disabled_condition?: string;
}

export interface ScraperConfig {
  municipality_id: string;
  municipality_name: string;
  version: string;
  steps: {
    login: ScraperAction[];
    navigate: ScraperAction[];
    filter_history: ScraperAction[];
    filter_latest: ScraperAction[];
  };
  extraction: ScraperExtractionConfig;
}

/**
 * Interface that all municipality-specific scrapers must implement.
 */
export interface MunicipalScraper {
  /** UUID matching the municipalities table row. */
  municipalityId: string;

  /** Human-readable name for logging (never log credentials). */
  municipalityName: string;

  /**
   * Verify that the provided credentials can log into the portal.
   * Does not download any bills — login + immediate logout.
   */
  verifyCredentials(
    username: string,
    password: string
  ): Promise<ScraperResult<void>>;

  /**
   * Download bill history going back N months.
   * Returns whatever bills are available (may be < monthsBack).
   */
  fetchBillHistory(
    username: string,
    password: string,
    monthsBack: number
  ): Promise<ScraperResult<BillDownload[]>>;

  /**
   * Download the most recent bill only.
   */
  fetchLatestBill(
    username: string,
    password: string
  ): Promise<ScraperResult<BillDownload>>;
}
