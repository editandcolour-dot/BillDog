---
name: fault-logger
description: Use when any error, fault, or unexpected behaviour occurs — including 404s, auth failures, crashes, API errors, device errors, or any build failure.
---

## DO NOT USE WHEN
- Everything is working correctly — this is not a general log
- Logging a completed fix after the fact without having followed the evidence-first workflow — retroactive entries are not valid
- You are uncertain whether something is actually an error — investigate first, then invoke if confirmed

## Workflow

1. **STOP.** Do not attempt a fix yet.

2. Identify the error code (HTTP status, exception type, exit code, etc.).

3. Cross-reference `AGENT_BRAIN/TECH_STACK.md` to determine which layer the error could originate from:
   - App Code
   - API Endpoint
   - Device/Android
   - Network
   - Auth/Token

4. Check logs for actual evidence. Do not infer or guess:
   - Metro bundler output
   - Android logcat
   - FastAPI/server logs
   - Network response body
   - Stack traces

5. Classify the source with evidence confirmed — mark exactly one checkbox in the Source field.

6. Only then propose a fix.

7. After applying the fix, verify it resolved the issue (rerun the failing operation, check logs).

8. Log the complete entry to `AGENT_BRAIN/FAULT_LOG.md` using the template:

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

9. If source cannot be determined from available evidence: **stop and ask the user before proceeding.**
