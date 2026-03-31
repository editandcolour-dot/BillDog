# Fault Log

> **No fix may be attempted until Source and Evidence fields are completed.**

---

## Template for every entry:

```
## FAULT: [timestamp]
**Error Code:** 
**Source:** [ ] App Code  [ ] API Endpoint  [ ] Device/Android  [ ] Network  [ ] Auth/Token
**Evidence:** [what was checked to confirm the source — not a guess]
**Context:** [what was happening when it occurred]
**Fix Applied:** [exact fix]
**Fix Confirmed:** [yes / no]
**Recurrence Risk:** [high / medium / low]
```

---

## FAULT: 2026-03-31 06:08
**Error Code:** Client-side "Failed to initialize payment gateway"
**Source:** [x] App Code  [ ] API Endpoint  [ ] Device/Android  [ ] Network  [ ] Auth/Token
**Evidence:** `NEXT_PUBLIC_APP_URL` absent from `.env.local` — confirmed by grep. `tokenise.ts` uses it for return_url/cancel_url. Additionally, `handleProceed` in letter page swallowed server error responses by not checking `res.ok`.
**Context:** User clicking "Add Payment Method" on letter preview page.
**Fix Applied:** (1) Added `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local`. (2) Updated `handleProceed` to check `res.ok` and surface actual server error.
**Fix Confirmed:** Yes — tsc --noEmit passes with 0 errors.
**Recurrence Risk:** Medium — production Railway must also have `NEXT_PUBLIC_APP_URL` set to `https://billdog.co.za`.
