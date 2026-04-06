# PROJECT MEMORY INDEX

> This file catalogs the structural relationships of the codebase to serve as the episodic memory for the Hive.

## Core Services
- **RAG & Embeddings**: RAG functionality is built on Supabase pgvector and Voyage AI. Relevant code resides in `lib/claude/` for API connections and `supabase/migrations/` for pgvector.
- **Letter Generation**: `api/generate-letter/route.ts` is the primary entrypoint for drafting disputes.
- **Payments**: Handled exclusively via PayFast tokens stored securely (`api/payfast/tokenise`).

## Execution Tools
- `index_codebase.py`: Updates local semantic search SQLite DB.
- `semantic_search.py`: Allows Claude to do semantic RAG over the codebase to find file paths contextually.

> Trigger `python execution/index_codebase.py` after major architectural shifts.
