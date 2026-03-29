---
name: rag-pgvector
description: Legislation RAG system using Supabase pgvector and Voyage AI for Billdog. AI Agent and DB Agent MUST read this before building or querying the legislation RAG system.
---

# RAG — Legislation Search with pgvector

> **Consumed by:** AI Agent, DB Agent — read before building or querying the legislation RAG system
> **Project:** Billdog — SA municipal billing dispute platform
> **Purpose:** Retrieve specific legislation sections for each billing error so every dispute letter cites the correct, specific law automatically.
> **Embedding model:** `voyage-2` (1536 dimensions)
> **Storage:** Supabase `legislation` table with `vector(1536)` column

---

## 1. What RAG Does in Billdog

RAG (Retrieval-Augmented Generation) ensures dispute letters cite **specific, relevant legislation** — not generic references.

### Flow
```
Bill analysis finds errors
      │
      ▼
For each error → embed error description via Voyage AI
      │
      ▼
Query pgvector for similar legislation chunks
      │
      ▼
Inject top 3 legislation chunks into Claude letter prompt
      │
      ▼
Claude generates letter with real legal citations
```

### Without RAG
> "...in terms of the relevant legislation, the municipality has overcharged..."

### With RAG
> "...in terms of Section 102(1) of the Municipal Systems Act (No. 32 of 2000), the municipality is required to provide a mechanism for the resolution of disputes concerning any amount billed..."

---

## 2. pgvector Setup in Supabase

### Enable Extension
Via Supabase dashboard:
1. Go to **Database** → **Extensions**
2. Search for `vector`
3. Click **Enable**

Or via migration:
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_enable_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Legislation Table
```sql
CREATE TABLE legislation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,           -- "Municipal Systems Act"
  title text NOT NULL,            -- "Dispute Resolution Rights"
  section text NOT NULL,          -- "Section 102"
  content text NOT NULL,          -- Full text of the section
  embedding vector(1536),         -- Voyage AI embedding
  created_at timestamptz DEFAULT now()
);

ALTER TABLE legislation ENABLE ROW LEVEL SECURITY;

-- Public read for authenticated users
CREATE POLICY "Authenticated users can read legislation"
  ON legislation FOR SELECT
  TO authenticated
  USING (true);

-- Index for similarity search performance
CREATE INDEX ON legislation
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);
```

---

## 3. Voyage AI Embedding API

### Configuration
```env
VOYAGE_API_KEY=your-voyage-api-key-here  # server-only, no NEXT_PUBLIC_
```

### Embedding Function
```typescript
// lib/embeddings.ts

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-2';

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('[FATAL] VOYAGE_API_KEY is not set');
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: VOYAGE_MODEL,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Voyage AI error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  return result.data[0].embedding; // number[] of length 1536
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('[FATAL] VOYAGE_API_KEY is not set');

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage AI batch error: ${response.status}`);
  }

  const result = await response.json();
  return result.data.map((d: { embedding: number[] }) => d.embedding);
}
```

---

## 4. Legislation Chunks to Seed

Each chunk is one section or subsection. Maximum 500 words per chunk.

### Core Legislation

| Source | Section | Key Content | Priority |
|---|---|---|---|
| Municipal Systems Act | s95 | Customer care obligations | High |
| Municipal Systems Act | s102 | **Dispute rights — most important** | Critical |
| Municipal Systems Act | s102(2) | No disconnect during active dispute | Critical |
| Municipal Property Rates Act | s49 | Valuation objections process | Medium |
| Prescription Act | s11 | 3yr water/electricity, 30yr rates | High |
| Electricity Regulation Act | Various | NERSA dispute escalation path | Medium |
| Water Services Act | Various | Water billing dispute process | Medium |

### Case Law

| Case | Year | Key Principle |
|---|---|---|
| Gallagher Estates v City of Johannesburg | 2016 | Onus of proof lies on the municipality |
| Mkontwana v Nelson Mandela Metro | 2005 | Municipality has duty of billing accuracy |

### Chunk Format
```
SOURCE: Municipal Systems Act (No. 32 of 2000)
SECTION: 102(1)
TITLE: Right to dispute municipal accounts
TEXT: A person liable for the payment of any amount arising 
from the provision of a municipal service or from any other 
municipal obligation may dispute any account or decision of 
a municipality by serving a written objection on the 
municipal manager within a reasonable time...
```

---

## 5. Similarity Search

### PostgreSQL RPC Function
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_match_legislation.sql

CREATE OR REPLACE FUNCTION match_legislation(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  title text,
  section text,
  source text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    legislation.id,
    legislation.title,
    legislation.section,
    legislation.source,
    legislation.content,
    1 - (legislation.embedding <=> query_embedding) AS similarity
  FROM legislation
  WHERE 1 - (legislation.embedding <=> query_embedding) > match_threshold
  ORDER BY legislation.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Calling from TypeScript
```typescript
// lib/rag/search.ts
import { embedText } from '@/lib/embeddings';
import { createClient } from '@/lib/supabase/server';

interface LegislationMatch {
  id: string;
  title: string;
  section: string;
  source: string;
  content: string;
  similarity: number;
}

export async function searchLegislation(
  query: string,
  threshold: number = 0.7,
  limit: number = 3,
): Promise<LegislationMatch[]> {
  const embedding = await embedText(query);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('match_legislation', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    console.error('[rag/search] pgvector query failed', { error: error.message });
    throw error;
  }

  return data as LegislationMatch[];
}
```

---

## 6. Query Strategy for Bill Errors

For letter generation, search for legislation relevant to **each error found in the analysis**.

```typescript
// lib/rag/context.ts

const MAX_RAG_CONTEXT_CHARS = 2000;

export async function buildLegislationContext(
  errors: BillingError[],
): Promise<string> {
  // Build query from error descriptions
  const queryParts = errors.map(e =>
    `${e.issue} ${e.legal_basis}`,
  );
  const combinedQuery = queryParts.join('. ');

  try {
    const matches = await searchLegislation(combinedQuery, 0.7, 3);

    if (matches.length === 0) {
      console.warn('[rag] No legislation matches found, using fallback');
      return FALLBACK_LEGISLATION;
    }

    // Format for Claude injection
    let context = 'RELEVANT LEGISLATION:\n\n';
    let charCount = context.length;

    for (const match of matches) {
      const section = `[${match.section}, ${match.source}]\n${match.content}\n\n`;

      if (charCount + section.length > MAX_RAG_CONTEXT_CHARS) break;

      context += section;
      charCount += section.length;
    }

    return context.trim();
  } catch (error) {
    console.error('[rag] Search failed, using fallback legislation', { error });
    return FALLBACK_LEGISLATION;
  }
}
```

---

## 7. RAG vs Hardcoded References

| Use Case | Method | Why |
|---|---|---|
| Bill analysis prompt | **Hardcoded** section numbers | Analysis just needs section refs for JSON output, not full text |
| Letter generation prompt | **RAG** full section text | Letter must quote specific legislation accurately |
| Fallback (RAG fails) | **Hardcoded** Section 102 text | Letter must always cite at least Section 102 |

### Hardcoded Fallback
```typescript
const FALLBACK_LEGISLATION = `
RELEVANT LEGISLATION:

[Section 102(1), Municipal Systems Act (No. 32 of 2000)]
A person liable for the payment of any amount arising from the provision of a municipal service may dispute any account or decision of a municipality by serving a written objection on the municipal manager within a reasonable time.

[Section 102(2), Municipal Systems Act (No. 32 of 2000)]
The municipality may not disconnect or discontinue the provision of a municipal service while a dispute is being resolved, provided that the person continues to pay the undisputed portion of the account.
`.trim();
```

**Rule:** Never let RAG failure block letter generation. Always fall back to hardcoded Section 102.

---

## 8. Token Budget

| Component | Max Chars | Rationale |
|---|---|---|
| Legislation context | 2000 | ~500 tokens — leaves room for bill data and instructions |
| Number of chunks | 3 max | Top 3 by similarity — diminishing returns beyond this |
| Individual chunk | 500 words | One section/subsection — enough for accurate citation |

### Truncation
```typescript
// Always truncate gracefully
if (context.length > MAX_RAG_CONTEXT_CHARS) {
  // Find last complete section before limit
  const truncated = context.substring(0, MAX_RAG_CONTEXT_CHARS);
  const lastSection = truncated.lastIndexOf('\n\n[');

  if (lastSection > 0) {
    context = truncated.substring(0, lastSection);
  } else {
    context = truncated;
  }
}
```

---

## 9. Error Handling

### Voyage AI Failure
```typescript
try {
  const embedding = await embedText(query);
} catch (error) {
  console.warn('[voyage] Embedding failed, using fallback legislation', {
    error: error instanceof Error ? error.message : String(error),
  });
  return FALLBACK_LEGISLATION;
}
```

### pgvector Query Returns Empty
```typescript
if (matches.length === 0) {
  console.warn('[rag] No matches above threshold 0.7', { query: query.substring(0, 100) });
  return FALLBACK_LEGISLATION;
}
```

### Rules
- **Voyage AI down → fall back to hardcoded legislation.**
- **pgvector empty → fall back to hardcoded Section 102.**
- **Never block letter generation** because RAG failed.
- **Log all fallbacks** — they indicate either bad embeddings or missing legislation.

---

## 10. Seed Script

```python
# execution/seed_legislation.py
"""
Seeds the legislation table with embedded chunks.
Run once on setup. Re-run only if legislation content changes.

Usage:
  python execution/seed_legislation.py

Output:
  .tmp/legislation_seed.log — record of each chunk embedded
"""
```

### What the Seed Script Does
1. Reads legislation chunks from `execution/data/legislation_chunks.json`
2. Calls Voyage AI to embed each chunk
3. Inserts chunk + embedding into `legislation` table via Supabase service role
4. Logs each operation to `.tmp/legislation_seed.log`

### Chunk Data Format
```json
[
  {
    "source": "Municipal Systems Act (No. 32 of 2000)",
    "title": "Dispute Resolution Rights",
    "section": "Section 102(1)",
    "content": "A person liable for the payment of any amount..."
  }
]
```

### Running
```bash
python execution/seed_legislation.py
# Check logs:
cat .tmp/legislation_seed.log
```

**Rule:** Run once during project setup. Only re-run if legislation text is updated. Each run is idempotent (upserts based on source + section).
