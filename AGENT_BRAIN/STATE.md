<!-- RESTORE_POINT: Railway deployment bfe81472 (Jun 1, 2026, 08:26 GMT+2) is the last confirmed working production state. Git: commit c4e9324, tag `restore-point-bfe81472`. Recover with: git checkout restore-point-bfe81472 -->

# STATE.md — Live Session State

> **Last Updated:** 2026-06-02 (session: build review + audit reconciliation)
> **🚨 If this file's date does not match today's date, discard all values and treat every field as empty.**

## Currently In Progress
- None (review-only session; no code changed).

## Blocked
- None.

## Just Completed (2026-06-02)
- **Build health verified.** `tsc --noEmit` clean (exit 0). `vitest run` = 322 passed, 12 skipped, 4 failed — all 4 are the known letter-template snapshot date-drift (`toMatchSnapshot` bakes today's date). `next build` not run this session (perms), but tsc covers the prior failure mode. The `build.log` / `build-error.log` at repo root are OBSOLETE (Next 14 + ESLint "any" errors) — safe to delete.
- **2026-06-01 security audit reconciled against current code.** Commits `56dde90` (audit fixes) + `4ae9fa0` (dead-code purge) closed ~85% of the 26 findings. Verified CLOSED: S-H1 (rate limiter fails closed), S-H2/H3 (PayFast log leaks gone / DEBUG-gated), S-H4 (no raw DB errors in the 4 routes), S-M2 (error.tsx logs name/msg/digest only), S-M3 (Upstash URL env-sourced), S-M4 (migration 038_rls_gapfill applied to prod), S-L1 (case-insensitive admin compare), D1–D4 + root script clutter (all deleted/relocated to scripts/).

## Next Up — START HERE (worklist for next session)

### Batch A — quick wins (low risk, ~15 min, all continuations of the approved audit; each ≤2 files)
1. **S-C1 residual** — TWO hardcoded `editandcolour@gmail.com` the audit MISSED. Env-ify both (use `process.env.ADMIN_EMAIL`, fail/skip if unset, same pattern as the already-fixed 3 files):
   - `app/api/user/delete/route.ts:252`  →  `to: ['editandcolour@gmail.com']`
   - `app/api/autofetch/credentials/route.ts:311`  →  `to: ['editandcolour@gmail.com']`
2. **S-M5** — rate-limit the `/onboarding` profile-completeness redirect in `proxy.ts:70-78` (every authed request currently hits `profiles`; cache flag in session cookie + rate-limit).
3. **S-L3** — rate-limit key is raw IP; combine IP + user id (when authed) so shared-NAT users aren't penalised. (`lib/rate-limit.ts`)
4. **Snapshot test fix** — `lib/letters/letter-templates.test.ts` (~lines 149, 192, +1): swap `expect(letter).toMatchSnapshot()` for `expect(letter).toEqual(expect.stringContaining(...))` so the 4 tests stop drifting daily.
5. **Doc hygiene** — delete obsolete `build.log` / `build-error.log` / `build-log.txt`; update `TECH_DEBT.md` (Next 14→16 upgrade is DONE — package on next ^16.2.2, middleware→proxy.ts migrated); note in AUDIT that D1–D4 are now resolved.

### Batch B — CSP nonce (S-M1), SEPARATE session, needs a Planning Brief
- `next.config.mjs:21` still ships `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — voids CSP's XSS mitigation. Move to nonce-based CSP (Next 16 native). Touches next.config + likely layout; can break inline scripts if rushed → produce Planning Brief per `directives/planning.md` first.

### Batch C — backlog
- **S-L2** — crypto key versioning: add `key_version` column on `municipal_credentials`, document re-encryption job (`docs/credential-key-rotation.md`).
- **settings page** — `app/(app)/settings/page.tsx` still a 0.2 KB stub (registry: `planned`).
- **RAG corpus** — registry says Legislation RAG `complete`, but audit notes `lib/rag/legislation.ts` "blocked on corpus population." Confirm which is true.
- **Duplication watch** — grep for `Intl.NumberFormat('en-ZA'...)` across components/reports + letter previews; the hand-rolled `formatCurrency`/`formatRegisteredDate` in CaseCard.tsx exists to dodge SSR/CSR hydration drift — others may hit the same bug.

## Agent Notes
- The 5 files the original audit named for S-C1 were env-ified; the 2 in Batch A item 1 are NEW (audit undercounted). Search `editandcolour@gmail.com` before declaring S-C1 done.
- Build verification this session was read-only; no Planning Brief was needed. Batch A items are each ≤2 files and direct continuations of the approved 2026-06-01 audit, so they're execute-now. Batch B (CSP) is the only remaining item with real attack-surface value and needs its own brief.
- Doc drift to clean up: STATE.md (prev version) referenced `lib/resend/autofetch-revoked.ts` which is now DELETED; AGENT_BRAIN/ARCHITECTURE.md filesystem snapshot is from 2026-05-12 and predates the cleanup (still lists root test scripts). Re-run `python execution/scan_architecture.py` to refresh.
