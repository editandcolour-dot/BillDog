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
 * Interface that all municipality-specific scrapers must implement.
 *
 * Phase 1: only `verifyCredentials()` is implemented.
 * Phase 2: `fetchBillHistory()` and `fetchLatestBill()` are added.
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
   * Phase 2 — not implemented in Phase 1.
   */
  fetchBillHistory(
    username: string,
    password: string,
    monthsBack: number
  ): Promise<ScraperResult<BillDownload[]>>;

  /**
   * Download the most recent bill only.
   * Phase 2 — not implemented in Phase 1.
   */
  fetchLatestBill(
    username: string,
    password: string
  ): Promise<ScraperResult<BillDownload>>;
}
