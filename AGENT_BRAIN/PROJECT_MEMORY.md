# Project Memory

> Keep this file under 3KB at all times. Summarise and compress when needed.

## What Has Been Built
- **Phase 1-3:** Auth, Database RLS, Onboarding, Prescription validation.
- **Phase 4:** File upload and basic persistence pipeline.
- **Phase 5 & 6:** End-to-end Claude PDF analysis and dispute letter generation. Edge-compatible `pdf-parse`. Strict JSON schema blocking legitimate fees. RAG fallback for SA legislation.
- **Phase 7, 9, 10 & 11:** Production-ready case lifecycle. Resend email parsing & automated resolution triggers. Full PayFast integration (tokenisation & success-fee charging on resolution). Timeline dashboard.
- **Legal / POPIA:** Privacy Policy, Terms of Service, and POPIA Statement pages routed under `(public)` and deployed. Cookie consent banner. User data export + delete APIs.
- **Escalation / Compliance:** Stage 5 Public Protector workflow with Supabase Vault / pgsodium AES-256-GCM encryption for SA IDs. Automated 30-day purge cron.
- **Public Pages:** How It Works, Pricing, FAQ, About, Real Cases, Contact (with working form → Resend).
- **Settings Page:** Profile editing (name, phone, address), card management placeholder, notification preferences. Profile API (`api/user/profile`).
- **Infrastructure:** Railway deployment via `nixpacks.toml` → Next.js dynamic node server on injected `$PORT`.
- **Phase 8 (Built):** Multi-Bill Upload functionality with dynamic cross-analysis for pattern tracking and sequential `case_bills` tracking. 
- **Phase 13 (Built):** Dynamic Tariff Resolver architecture deployed using Supabase `tariff_cache` and Service Role gap-queue. Hardcoded parsing maps migrated to an authoritative verified network-resolver.
## Key Architectural Decisions
- Removed standalone PayFast integration from onboarding to avoid blocking core upload loop. Tokenization moved to pre-send step on letter preview.
- Supabase data mutations go through Server Actions (`app/actions/auth.ts`) for cookie/session reliability.
- Letter generation gracefully degrades to `user.email` and case record data if `profiles` table is unpopulated.

## Current Project State
- E2E dispute pipeline (Upload → Analyse → Letter → Send → Track → Resolve → Charge) is live on `billdog.co.za`.
- PayFast integration is **LIVE in production** on billdog.co.za (confirmed by user 2026-06-15). Mode is env-driven: production whenever `PAYFAST_SANDBOX !== 'true'` (Railway prod has it unset/false). No "sandbox acceptance" gate exists in code — that earlier note was stale.
- **Tariff Engine Seeded:** 20mm/240L base ground-truth natively pushed to `tariff_cache`.
- **Phase 12 (Built):** Complete SEO Infrastructure. 8 static municipality landing pages + 9-page Blog Pillar Content Cluster. Dynamic `sitemap.ts`. Dedicated `api/cron/social-monitor` (triggered by Railway cron) scanning Reddit/News to generate AI-drafted responses for lead generation. Weekly SEO pulse report cron. Admin routes secured in middleware.
- **Security & Compliance:** Implemented comprehensive platform-wide security hardening (Next.js 15 update, Upstash Ratelimiting on critical paths, strict HTTP headers, DB ownership constraints). **CSP S-M1 CLOSED (2026-06-15):** nonce-based CSP via `proxy.ts` — `script-src` no longer allows `unsafe-inline`/`unsafe-eval`; per-request base64 nonce + `strict-dynamic`.
- **Escalation engine (FIXED 2026-06-15):** had never written a single row — two root causes: (1) it used the RLS user client inside a no-session cron, so all writes were silently denied; (2) it had no QStash schedule. Both fixed — switched to service-role admin client (DD-008) + QStash schedule created/tested (200). Enhanced: `escalated` case_events for steps ≥2; step-2 POPIA-minimal billing-dept notice (`2_notice`).
- **Autofetch (FIXED 2026-06-15):** the QStash schedule existed all along; the QStash signing keys were stale, so deliveries failed. Keys refreshed — worker now returns 200.
