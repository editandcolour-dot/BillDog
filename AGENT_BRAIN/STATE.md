# STATE.md — Live Session State

> **Last Updated:** 2026-06-01 17:45
> **🚨 If this file's date does not match today's date, discard all values and treat every field as empty.**

## Currently In Progress
- None (session closed).

## Blocked
- None.

## Just Completed
- **Resend lazy-client migration.** Replaced eager `new Resend(process.env.RESEND_API_KEY)` (which crashes at module load when env is missing or stale) with lazy `getResendClient()` in all four offenders: [app/api/contact/route.ts](app/api/contact/route.ts), [lib/autofetch/alert.ts](lib/autofetch/alert.ts), [lib/resend/autofetch-report.ts](lib/resend/autofetch-report.ts), [lib/resend/autofetch-revoked.ts](lib/resend/autofetch-revoked.ts). The whole codebase is now consistent — Resend is only constructed on first send.
- **Next 16 middleware → proxy migration.** `middleware.ts` → [proxy.ts](proxy.ts) via `git mv`, exported function renamed `middleware` → `proxy`. Same matcher config, same Supabase SSR getUser + profile-completeness pattern. Note: proxy runtime is always Node (Edge not supported), which is fine for us because we already do DB calls in here.
- **Permanent-credential / stale-reconnect refactor** (earlier this session). See previous STATE entries — worker no longer auto-revokes, stale-credential email built, dashboard + account reconnect UX live, POPIA consent copy rewritten.
- **Cycle-aware autofetch polling refactor** (earlier this session). Migration 037 applied to prod, `next_check_at` seeded NULL on 1 active credential (Jason), daily QStash schedule registered: `Africa/Johannesburg 07:00` → `/api/autofetch/worker/daily`.

## Next Up
- Nothing required for production. Tomorrow's 07:00 SAST run will be the first live cycle-aware fetch.
- Pre-existing test debt (not from this session): letter-template snapshots drift daily because they bake `${today}` into the output — should be `expect.stringContaining(...)` instead of `toMatchSnapshot()`. 2 unrelated pre-existing failures in `tests/consent.test.ts` and `production-pipeline-e2e.test.ts`.

## Agent Notes
- POPIA s11(1)(b) is the lawful basis for the stale-credential email — transactional notice about an active service.
- "Stale" credential = `last_login_error IS NOT NULL` with `revoked_at IS NULL`. Status endpoint returns `status: 'failed'` for this. Reconnect = POST `/api/autofetch/credentials` with same `municipality_id` + fresh password; UPDATE branch nulls `last_login_error` on success.
- Diagnostic note (Jason's account `3be517fa-7f41-4c5a-9a9c-be8f04b7766e`): credential intact, never revoked. The "no Reconnect button" complaint exposed two real issues — (1) UX had no stale state (now fixed), (2) operational: migration + daily QStash schedule weren't wired (both now done).
- Resend `getResendClient()` from `lib/resend/client.ts` is the only blessed way to access Resend. Don't import `Resend` directly anywhere outside that file.
- Proxy runtime change is invisible to the app, but if you ever need Edge runtime (e.g. for ultra-low-latency edge auth) you'd have to keep `middleware.ts` AND ship a separate `proxy.ts` — they coexist according to Next 16 docs.
- `tsc --noEmit` clean. 321 tests pass, 5 pre-existing failures untouched, 12 skipped.

