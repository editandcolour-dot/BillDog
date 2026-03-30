# Project Memory

> Keep this file under 3KB at all times. Summarise and compress when needed.

## What Has Been Built
- **Phase 1-3:** Auth, Database RLS, Onboarding, Prescription validation.
- **Phase 4:** File upload and basic persistence pipeline.
- **Phase 5 & 6:** Built end-to-end Claude-powered PDF analysis and dispute letter generation. Refaced `pdf-parse` for Edge/Next.js compatibility. Implemented strict JSON schema analysis rules blocking legitimate municipal fees (e.g. Electricity HU charges). Built RAG fallback mechanism for SA legislation.
- **Phase 7:** Integrated Resend email sending and completely functioning Inbound Webhooks (`api/webhooks/resend-inbound`) using `svix` to automate case status updates. 
- **Phase 9:** Dashboard layout with responsive server-components and a detailed Case tracking timeline mapping events directly off `case_events`.
- **Infrastructure:** Live deployment pipeline to Railway via `nixpacks.toml` configured to Next.js dynamic node server on injected `$PORT`.

## Key Architectural Decisions
- Removed standalone PayFast integration from the onboarding step to avoid blocking the core upload loop. Tokenization moved to Pre-send.
- Moved Supabase data mutations to Server Actions (`app/actions/auth.ts`) instead of client-side requests to guarantee cookie reliability and session integrity natively via Edge.
- Letter generation gracefully degrades to `user.email` and case record data if the Supabase `profiles` table is unpopulated.

## Current Project State
- E2E dispute pipeline from User Upload all the way to Municipal Email response is securely online on `billdog.co.za`. 
- **Phase 10 (PayFast Pre-Authorization & Tokenisation) is built and undergoing local/sandbox testing.**

## Tech Stack Overview
- Added backend/action architecture.
- Full deployment of @supabase/ssr across server rendering contexts.
- Local E2E testing relies on `reportlab` generated PDFs to simulate Cape Town municipal bills.
