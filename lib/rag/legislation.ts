/**
 * Legislation RAG module for Billdog dispute letters.
 *
 * Queries Supabase pgvector for relevant legislation chunks.
 * Falls back to hardcoded Section 102 text if RAG is unavailable.
 * RAG failure must NEVER block letter generation.
 */

const FALLBACK_LEGISLATION = `
MUNICIPAL SYSTEMS ACT NO. 32 OF 2000
Section 95: Municipalities must provide accurate billing and accessible dispute mechanisms.
Section 102(1): Consumers have the right to dispute inaccurate bills in writing. The municipality must investigate and respond.
Section 102(2): The municipality may not disconnect or discontinue the provision of a municipal service while a dispute is under investigation.

PRESCRIPTION ACT NO. 68 OF 1969
Section 11: Electricity, water and gas charges prescribe after 3 years. Rates, sewerage and refuse after 30 years.

CASE LAW:
Gallagher Estates v City of Johannesburg (2016): The municipality bears the onus of proving the accuracy of meter readings. The consumer need only raise a bona fide dispute.

Mkontwana v Nelson Mandela Metropolitan Municipality (2005): Municipalities have a constitutional obligation to maintain accurate billing records.
`;

export interface LegislationContext {
  text: string;
  source: 'rag' | 'fallback';
  chunksUsed: number;
}

/**
 * Fetches relevant legislation context for the disputed service types.
 * Falls back gracefully to hardcoded legislation if RAG is unavailable.
 */
export async function getLegislationContext(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  serviceTypes: string[]
): Promise<LegislationContext> {
  // RAG via Voyage AI + pgvector — requires VOYAGE_AI_API_KEY
  const voyageKey = process.env.VOYAGE_AI_API_KEY;

  if (voyageKey) {
    try {
      // TODO: Implement full RAG pipeline when legislation table is populated
      // 1. Embed query using Voyage AI
      // 2. Query supabase pgvector legislation table
      // 3. Return top 3 most relevant chunks
      console.log('[RAG] Voyage AI key found but legislation table not yet populated. Using fallback.');
    } catch (ragError) {
      console.error('[RAG] Query failed, falling back to hardcoded legislation:', ragError);
    }
  }

  // Fallback — always works, always legally accurate
  return {
    text: FALLBACK_LEGISLATION.trim(),
    source: 'fallback',
    chunksUsed: 0,
  };
}
