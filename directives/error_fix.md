# DIRECTIVE: error_fix.md
## Goal
Ensure all error diagnosis and fix implementation is architecturally aligned before a single line of code is written or changed.

---

## MANDATORY PRE-FIX PROTOCOL

Before touching any code to fix an error, the agent MUST complete ALL of the following steps in order. No exceptions.

### STEP 1 — Read the Architecture Brain
```bash
# Open and read the full document before proceeding
AGENT_BRAIN/ARCHITECTURE.md
```
You must be able to answer:
- What is the tech stack? (Section 2)
- What is the repo structure? (Section 3)
- What is the DB schema? (Section 4)
- What are the hard constraints? (Section 12)

If you cannot answer these without guessing, stop and re-read the document.

### STEP 2 — Classify the Error
Before writing any fix, classify the error:

| Type | Description | Example |
|---|---|---|
| `ui` | Frontend rendering, styling, layout | Component not rendering on mobile |
| `api` | API route logic, request/response | 500 on /api/analyse |
| `db` | Database query, schema, RLS | Supabase query returning null |
| `auth` | Authentication, session, middleware | User redirected incorrectly |
| `ai` | Claude API call, prompt, parsing | Analysis returning malformed JSON |
| `email` | Resend, letter delivery | Dispute email not sending |
| `payment` | PayFast, webhook, charge | ITN webhook failing |
| `infra` | Railway, env vars, build | Deployment failing |

### STEP 3 — Locate the Canonical File
Based on the error type and ARCHITECTURE.md Section 3, identify:
- The **exact file(s)** responsible for this error
- The **directive** that governs this domain (e.g. `directives/api.md` for API errors)

Do NOT fix errors in files that are not listed in ARCHITECTURE.md without flagging this to the user first — an unlisted file may indicate scope creep or a structural problem.

### STEP 4 — State Architectural Alignment
Before writing the fix, explicitly state:

```
ERROR TYPE:        [classification from Step 2]
AFFECTED FILE(S):  [exact paths from ARCHITECTURE.md Section 3]
GOVERNING DIRECTIVE: [relevant directive file]
ARCHITECTURE SECTIONS CONSULTED: [list section numbers]
CONSTRAINTS CHECKED: [list relevant constraints from Section 12]
FIX SUMMARY:       [one sentence — what will change and why]
WHAT WILL NOT CHANGE: [confirm scope — list files that will NOT be touched]
```

If you cannot complete this statement without guessing, stop and ask the user.

### STEP 5 — Implement the Fix
Only now may you write code. The fix must:
- Stay within the identified file(s)
- Not introduce any technology not in the tech stack (Section 2)
- Not modify the database schema without a migration file
- Not add features not in the Feature Registry (Section 9)
- Not break the design system (Section 7)

### STEP 6 — Post-Fix Verification
After implementing:
1. Confirm the fix does not touch files outside the stated scope
2. If any new file was created, update ARCHITECTURE.md Section 3 and Section 9
3. If a design decision was made, append to Section 11
4. Run the scanner if any structural change was made:
```bash
python execution/scan_architecture.py --output AGENT_BRAIN/ARCHITECTURE.md
```

---

## FORBIDDEN FIX PATTERNS

These patterns are banned regardless of how tempting they are:

| Pattern | Why It's Banned |
|---|---|
| Installing a new npm package to fix a problem | Violates tech stack loyalty (AGENTS.md Rule 4) |
| Rewriting a component from scratch to fix a bug | Scope creep — fix the bug, don't rebuild |
| Changing the DB schema without a migration | Violates Section 12, Constraint 5 |
| Adding an env variable not in Section 8 | Must update architecture first |
| Fixing a bug by moving logic to a new file not in architecture | Creates undocumented structure |
| Fixing a frontend bug by adding inline styles that deviate from design system | Violates Section 7 |
| Hardcoding a different Claude model to fix an AI error | Violates Section 12, AI rules |

---

## ESCALATION

If a fix cannot be implemented without:
- Changing the tech stack
- Modifying the DB schema significantly
- Creating files not in the architecture
- Touching more than 3 files

**Stop. Do not fix. Escalate to the user with a full impact assessment.**

The fix has become a refactor and must go through the planning directive instead.
