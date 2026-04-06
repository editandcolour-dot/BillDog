# DIRECTIVE: Semantic Source Search

**When to use:**
When you know the *context* or the *idea* of what you are looking for (e.g., "where do we handle the PDF parsing for water bills?"), but grep exact matching isn't yielding results.

**How to use:**
Run `python execution/semantic_search.py "Where do we do X?"`

**Rules:**
1. Do not use this tool for simple regex replacements. Use grep for exact syntax.
2. If the tool is failing, it's likely the index is stale. Request permission to run `python execution/index_codebase.py`.
