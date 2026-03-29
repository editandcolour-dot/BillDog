# Project Memory

> Keep this file under 3KB at all times. Summarise and compress when needed.

## What Has Been Built
- **Phase 1-3:** Auth, Database RLS, Onboarding, Prescription validation.
- **Phase 4:** File upload and basic persistence pipeline.
- **Phase 5 & 6:** Built end-to-end Claude-powered PDF analysis and dispute letter generation. Refaced `pdf-parse` for Edge/Next.js compatibility. Implemented strict JSON schema analysis rules blocking legitimate municipal fees (e.g. Electricity HU charges). Built RAG fallback mechanism for SA legislation.

## Key Architectural Decisions
- Removed standalone PayFast integration from the onboarding step to avoid blocking the core upload loop.
- Moved Supabase data mutations to Server Actions (`app/actions/auth.ts`) instead of client-side requests to guarantee cookie reliability and session integrity natively via Edge.
- Letter generation gracefully degrades to `user.email` and case record data if the Supabase `profiles` table is unpopulated.

## Current Project State
- Core analysis and letter generation loop is functional and E2E tested. Ready for Phase 7 (Send Dispute Letter / Email integration).

## Tech Stack Overview
- Added backend/action architecture.
- Full deployment of @supabase/ssr across server rendering contexts.
- Local E2E testing relies on `reportlab` generated PDFs to simulate Cape Town municipal bills.
