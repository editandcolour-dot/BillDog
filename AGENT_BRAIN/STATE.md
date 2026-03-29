# STATE.md — Live Session State

> **Last Updated:** 2026-03-29 07:05
> **⚠️ If this file's date does not match today's date, discard all values and treat every field as empty.**

## Currently In Progress
- Phase 7 (Send Dispute Letter — integrating Resend for email delivery)

## Blocked

## Just Completed
- Phase 5 & 6: Claude bill analysis, PDF parsing, false-positive detection guards, and dispute letter generation with RAG legislation.
- Security sweep: Removed redundant test scripts.
- Architecture hardening: Added global `middleware.ts` enforcement for user profile completeness before accessing any protected `/app` routes.

## Next Up
- Create Planning Brief for Phase 7 (Resend email integration).
- Implement `api/send-letter/route.ts` and UI integration for the letter sending feature.

## Agent Notes
- **CRITICAL**: Do not forget to turn "Confirm email" back on in Supabase > Authentication > Providers > Email before launching to production!
- Onboarding checks are now globally enforced in `middleware.ts`. Users cannot upload or generate letters without a full name, municipality, and account number.
