# STATE.md — Live Session State

> **Last Updated:** 2026-04-18 15:46
> **🚨 If this file's date does not match today's date, discard all values and treat every field as empty.**

## Currently In Progress
- (clear — task complete, awaiting user MD5 verification)

## Blocked
- PayFast tokenisation: awaiting user verification of MD5 hash against external tool. If hash matches, escalate to Byron (PayFast support).

## Just Completed
- Fixed PayFast signature generation: 3 critical bugs resolved (URL-encoding values, canonical field order, passphrase raw).
- Removed `email_confirmation` field that was not in PayFast's canonical example.
- Updated `generateSignature()` interface from `Record<string, string>` to `[string, string][]` ordered pairs.
- Updated `charge.ts` to match new `generateSignature` interface.
- Created dry-run verification script (`test_payfast_dryrun.js`) — produces hash string and MD5 for external validation.

## Next Up
- Verify MD5 externally → if match, deploy and test live → if still 400, escalate to Byron.
- If MD5 doesn't match externally, investigate encoding edge cases.

## Agent Notes
- The `PAYFAST_FIELD_ORDER` array in `tokenise.ts` is now the single source of truth for field ordering. Any future PayFast fields MUST be added to this array in the correct position.
- `charge.ts` uses the same `generateSignature` but with API header pairs (merchant-id, version, timestamp) — different context from tokenisation.
