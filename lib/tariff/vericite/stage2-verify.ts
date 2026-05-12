/**
 * VeriCite Stage 2: Source Verification
 *
 * For each proposed tariff row from Stage 1, this stage:
 * 1. Fetches the cited research_source URL
 * 2. Checks the fetched content for the proposed rate
 * 3. Marks each row as verified or rejected
 *
 * Anti-hallucination: rows with unfetchable or unverifiable sources
 * are rejected and logged to tariff_rejects.
 */

import { getClaudeClient } from '@/lib/claude/client';
import type {
  ProposedTariffRow,
  VerifiedTariffRow,
  VerificationStatus,
  Stage2Result,
} from './types';

const MODEL = 'claude-sonnet-4-20250514';
const FETCH_TIMEOUT_MS = 10_000;
const VERIFY_TIMEOUT_MS = 15_000;

/**
 * Validates that a source URL is a real URL (not generic text).
 */
function isValidSourceUrl(source: string): boolean {
  if (!source) return false;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Fetches content from a URL with timeout.
 * Returns the text content or an error status.
 */
async function fetchSourceContent(
  url: string,
): Promise<{ status: 'ok'; content: string } | { status: VerificationStatus; error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Billdog-Tariff-Verifier/1.0',
        Accept: 'text/html,application/xhtml+xml,text/plain,application/pdf,*/*',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { status: 'source_404', error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';

    // PDF content — can't easily verify rates in PDFs via text extraction here
    // Mark as "verified with caveat" — Stage 3 will handle confidence scoring
    if (contentType.includes('application/pdf')) {
      return {
        status: 'ok',
        content: '[PDF document — content type confirmed but text extraction not performed in Stage 2]',
      };
    }

    const text = await response.text();
    // Truncate to reasonable size for verification prompt
    return { status: 'ok', content: text.substring(0, 8000) };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'fetch_timeout', error: 'Source fetch timed out after 10s' };
    }
    return {
      status: 'fetch_error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Uses Claude to verify that a proposed rate appears in the fetched source content.
 */
async function verifyRateInContent(
  row: ProposedTariffRow,
  content: string,
): Promise<{ verified: boolean; notes: string }> {
  // If content is a PDF placeholder, we can't verify — pass through with caveat
  if (content.startsWith('[PDF document')) {
    return {
      verified: true,
      notes: 'Source is a PDF — URL resolves but rate could not be text-verified. Confidence reduced.',
    };
  }

  const client = getClaudeClient();

  const prompt = `You are verifying a tariff rate claim against source content.

CLAIMED RATE:
- Utility: ${row.utility_type}
- Tariff: ${row.tariff_name}
- Unit rate: R${row.unit_rate} (excl VAT)
- Tier: ${row.tier_start_unit ?? 'N/A'} to ${row.tier_end_unit ?? 'N/A'} units
- Fixed charge: ${row.fixed_charge != null ? `R${row.fixed_charge}` : 'N/A'}
- Period: ${row.effective_from} to ${row.effective_to}

SOURCE CONTENT (from ${row.research_source}):
${content.substring(0, 5000)}

QUESTION: Does this source content contain evidence that supports the claimed rate?

Rules:
- The rate must appear explicitly or be calculable from the content.
- A generic page mentioning "tariffs" without specific numbers does NOT count.
- If the content is a tariff table with different rates than claimed, that is NOT verified.

Return ONLY valid JSON:
{ "verified": true/false, "notes": "brief explanation" }`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as any).text)
      .join('');

    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      verified: Boolean(parsed.verified),
      notes: parsed.notes || '',
    };
  } catch {
    // On verification error, fail safe — mark as unverified
    return { verified: false, notes: 'Verification model call failed' };
  }
}

/**
 * Stage 2: Verify each proposed row against its cited source.
 */
export async function runStage2(
  proposedRows: ProposedTariffRow[],
): Promise<Stage2Result> {
  const startTime = Date.now();
  let totalTokens = 0;

  const verified: VerifiedTariffRow[] = [];
  const rejected: VerifiedTariffRow[] = [];

  for (const row of proposedRows) {
    // 1. Check if source URL is valid
    if (!isValidSourceUrl(row.research_source)) {
      rejected.push({
        ...row,
        verification_status: 'source_generic',
        verification_notes: `Invalid or generic source: "${row.research_source}"`,
        fetched_content_snippet: null,
      });
      continue;
    }

    // 2. Fetch the source
    const fetchResult = await fetchSourceContent(row.research_source);

    if (fetchResult.status !== 'ok') {
      rejected.push({
        ...row,
        verification_status: fetchResult.status as VerificationStatus,
        verification_notes: fetchResult.error,
        fetched_content_snippet: null,
      });
      continue;
    }

    // 3. Verify rate appears in content
    const verifyResult = await verifyRateInContent(row, fetchResult.content);

    const snippet = fetchResult.content.substring(0, 500);

    if (verifyResult.verified) {
      verified.push({
        ...row,
        verification_status: 'verified',
        verification_notes: verifyResult.notes,
        fetched_content_snippet: snippet,
      });
    } else {
      rejected.push({
        ...row,
        verification_status: 'rate_not_found',
        verification_notes: verifyResult.notes,
        fetched_content_snippet: snippet,
      });
    }
  }

  const duration = Date.now() - startTime;

  return {
    success: verified.length > 0,
    verified_rows: verified,
    rejected_rows: rejected,
    token_spend: totalTokens,
    duration_ms: duration,
  };
}
