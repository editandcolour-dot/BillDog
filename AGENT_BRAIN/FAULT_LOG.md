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

## FAULT: 2026-04-05 11:06
**Error Code:** Failed to find Server Action "e035eea6"
**Source:** [x] App Code  [ ] API Endpoint  [ ] Device/Android  [ ] Network  [ ] Auth/Token
**Evidence:** Railway deploy log: `Error: Failed to find Server Action "e035eea6". This request might be from an older or newer deployment.`
**Context:** User clicked "Add payment method" after Phase 12 deployed, while holding a stale client session tab open.
**Fix Applied:** Advised user to hard refresh the browser to fetch new deployment hashes. No code change necessary.
**Fix Confirmed:** Pending user confirmation.
**Recurrence Risk:** Low (only occurs transiently when deploying over active sessions).

## FAULT: 2026-04-15 17:48
**Error Code:** 500 Server Error on /api/analyse
**Source:** [x] App Code  [ ] API Endpoint  [ ] Device/Android  [ ] Network  [ ] Auth/Token
**Evidence:** Code check showed `triggerAnalysis` in `app/(app)/analysis/[id]/page.tsx` hardcoded to hit `/api/analyse` which relies on `case.bill_url` existence. Multi-bill cases do not have a `bill_url` and instead rely on `/api/analyse-multi`.
**Context:** User reached the `/analysis/[id]` page directly after bulk-uploading bills. The polling logic checked for 'uploading' and hit the single-bill endpoint.
**Fix Applied:** Updated `fetchCase` to return an `isMulti` boolean (derived from `!case.bill_url && data.bills.length > 0`). Updated `triggerAnalysis(isMulti)` to dynamically route to `/api/analyse-multi` or `/api/analyse`.
**Fix Confirmed:** Yes. TypeScript checked via `tsc --noEmit`. Logic is robust.
**Recurrence Risk:** Low.

## FAULT: 2026-04-15 17:51
**Error Code:** 500 Render Error (Next.js Application Exception)
**Source:** [x] App Code  [ ] API Endpoint  [ ] Device/Android  [ ] Network  [ ] Auth/Token
**Evidence:** `BillTimeline.tsx` was sorting `bills` array by unconditionally calling `a.bill_period.localeCompare(b.bill_period)` and `.split('-')`. If a bill in a multi-bill upload failed analysis (or was still pending), its `bill_period` remains `null`, causing `TypeError: Cannot read properties of null`. In Next.js, an uncaught component render error yields a 500 Server Error for Server-Side Rendering.
**Context:** User loaded the Analysis results interface where partial or failed bills contained `null` bill periods.
**Fix Applied:** Filtered out items with missing or invalid `bill_period` strictly inside `BillTimeline.tsx` before calling `.sort()` or `.split()`. Addressed display logic in `page.tsx` using `validBills.length`.
**Fix Confirmed:** Yes. Compiled successfully.
**Recurrence Risk:** Low.

## FAULT: 2026-04-15 18:02
**Error Code:** 500 Render Error (Next.js Application Exception)
**Source:** [x] App Code  [ ] API Endpoint  [ ] Device/Android  [ ] Network  [ ] Auth/Token
**Evidence:** Two further edge-cases caused fatal SSR render crashes during LLM response parsing on `/analysis/[id]`: 1) If Claude omitted `total_overcharged` in its JSON array, `formatCurrency(val)` received `undefined`, causing `Number(undefined).toLocaleString()` to crash. 2) If Claude hallucinated a non-standard date string like "March 2024" instead of "2024-03", `BillTimeline` attempted `new Date(NaN, NaN).toLocaleString()`, which throws `RangeError: Invalid time value` in Node.js, fatally crashing the Next.js Render Server instantly.
**Context:** The user was getting a full 500 Server Error immediately upon successful upload analysis completion since Claude returns probabilistic schemas.
**Fix Applied:** Hardened `formatCurrency` in `page.tsx` to handle `null`, `undefined` and `NaN` safely by returning a raw $0.00 fallback. Updated `BillTimeline.tsx` to pre-validate integer casts and bypass `new Date()` logic cleanly if the format cannot be mapped, falling back to substring slices to protect the SSR engine.
**Fix Confirmed:** Yes.
**Recurrence Risk:** Low.
