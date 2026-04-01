# Project Memory

> Keep this file under 3KB at all times. Summarise and compress when needed.

## What Has Been Built
- **Phase 1-3:** Auth, Database RLS, Onboarding, Prescription validation.
- **Phase 4:** File upload and basic persistence pipeline.
- **Phase 5 & 6:** End-to-end Claude PDF analysis and dispute letter generation. Edge-compatible `pdf-parse`. Strict JSON schema blocking legitimate fees. RAG fallback for SA legislation.
- **Phase 7:** Resend email sending and Inbound Webhooks (`api/webhooks/resend-inbound`) using `svix` to automate case status updates.
- **Phase 9:** Dashboard layout with responsive server-components and Case tracking timeline off `case_events`.
- **Phase 10:** PayFast card-on-file tokenisation (pre-send gate on letter page), ITN webhook handler (`api/webhooks/payfast`), success-fee charging on resolution confirmation. Pushed to main (commit 1267abf, 2026-03-30).
- **Legal / POPIA:** Privacy Policy, Terms of Service, and POPIA Statement pages routed under `(public)` and deployed. Cookie consent banner. User data export + delete APIs.
- **Escalation / Compliance:** Stage 5 Public Protector workflow with Supabase Vault / pgsodium AES-256-GCM encryption for SA IDs. Automated 30-day purge cron.
- **Public Pages:** How It Works, Pricing, FAQ, About, Real Cases, Contact (with working form → Resend).
- **Settings Page:** Profile editing (name, phone, address), card management placeholder, notification preferences. Profile API (`api/user/profile`).
- **Infrastructure:** Railway deployment via `nixpacks.toml` → Next.js dynamic node server on injected `$PORT`.

## Key Architectural Decisions
- Removed standalone PayFast integration from onboarding to avoid blocking core upload loop. Tokenization moved to pre-send step on letter preview.
- Supabase data mutations go through Server Actions (`app/actions/auth.ts`) for cookie/session reliability.
- Letter generation gracefully degrades to `user.email` and case record data if `profiles` table is unpopulated.

## Current Project State
- E2E dispute pipeline (Upload → Analyse → Letter → Send → Track → Resolve → Charge) is live on `billdog.co.za`.
- Production smoke test completed — all user flows verified working.
- PayFast integration built and pushed — **awaiting PayFast sandbox acceptance** (blocked on their side).
- Municipality seed data not yet loaded into Supabase.
