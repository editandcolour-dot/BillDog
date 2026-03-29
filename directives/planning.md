# DIRECTIVE: planning.md
## Goal
Ensure all new features, changes, and refactors are architecturally aligned and explicitly approved before any implementation begins.

---

## MANDATORY PRE-PLANNING PROTOCOL

Before proposing or building anything new, the agent MUST complete ALL of the following steps. No exceptions.

### STEP 1 — Read the Architecture Brain
```bash
AGENT_BRAIN/ARCHITECTURE.md
```
You must be able to answer all of the following before proceeding:
- Is this feature already in the Feature Registry? (Section 9)
- Does it fit the user flow? (Section 5)
- Does it require new DB tables or columns? (Section 4)
- Does it require a new API route? (Section 3)
- Does it require a new environment variable? (Section 8)
- Does it introduce any technology not in the stack? (Section 2)

If any answer requires guessing, stop and re-read the document or ask the user.

### STEP 2 — Check the Feature Registry
Open Section 9 of ARCHITECTURE.md and find the feature:

| Status | Meaning | Action |
|---|---|---|
| `complete` | Already built | Do NOT rebuild. Investigate why it needs changing instead. |
| `in-progress` | Currently being built | Check with user before touching — may conflict with active work |
| `planned` | Approved and scoped | You may plan and build this |
| `future` | Out of scope for v1 | Do NOT build. Flag to user if they request it. |
| Not listed | Unknown | Do NOT build. Propose addition to registry first. |

### STEP 3 — Produce a Planning Brief
Before writing any code, produce a Planning Brief and wait for user approval:

```
FEATURE NAME:        [name from Feature Registry or proposed new name]
REGISTRY STATUS:     [current status from Section 9]
USER FLOW STEP(S):   [which step(s) in Section 5 this affects]

FILES TO CREATE:
  - [exact path per ARCHITECTURE.md Section 3]

FILES TO MODIFY:
  - [exact path + what changes]

DB CHANGES REQUIRED:
  - [new table / new column / migration file name, or NONE]

NEW ENV VARS REQUIRED:
  - [name only, or NONE]

NEW DEPENDENCIES:
  - [npm package or service, or NONE — requires approval if not in stack]

ARCHITECTURE SECTIONS AFFECTED:
  - [list all section numbers that need updating after this is built]

DESIGN SYSTEM COMPLIANCE:
  - [confirm colours, fonts, components comply with Section 7]

CONSTRAINTS CHECK:
  - [list any Section 12 constraints relevant to this feature]

ESTIMATED SCOPE:
  - [small: 1-2 files | medium: 3-5 files | large: 6+ files]

WHAT THIS DOES NOT TOUCH:
  - [explicitly list what is out of scope]
```

### STEP 4 — Wait for User Approval

Do NOT write any code until the user explicitly approves the Planning Brief.

If the user says "go ahead" or "approved" or equivalent — proceed.
If the user modifies the brief — update and restate before proceeding.
If the user is silent — do not assume approval. Ask again.

### STEP 5 — Implement

Only after approval, implement the feature:
- Follow the exact file list from the approved brief
- Do not add files not in the brief
- Do not install packages not in the brief
- Follow all directives for the relevant domain (api.md, ui.md, ai.md, etc.)

### STEP 6 — Post-Implementation

After building:
1. Update Feature Registry status in ARCHITECTURE.md Section 9 to `complete`
2. Add a Design Decision entry to Section 11 if any architectural choice was made
3. Update Section 3 if new files were created
4. Run the scanner:
```bash
python execution/scan_architecture.py --output AGENT_BRAIN/ARCHITECTURE.md
```
5. Report what was built, what files were touched, and what changed in the architecture

---

## PLANNING ESCALATION TRIGGERS

Escalate to the user immediately (do not plan, do not build) if the request:

| Trigger | Why |
|---|---|
| Requires a technology not in the stack | Must update architecture first |
| Touches 6+ files | Large scope — needs explicit approval |
| Requires dropping or renaming DB columns | Destructive — needs migration plan |
| Affects the payment flow | High risk — needs careful review |
| Affects auth middleware | Security risk — needs careful review |
| Creates a new top-level directory | Structural change — needs architecture update |
| Changes the user flow order (Section 5) | May break dependent features |
| Is marked `future` in the Feature Registry | Out of v1 scope |

---

## PLANNING ANTI-PATTERNS

These are banned planning behaviours:

| Anti-Pattern | Why It's Banned |
|---|---|
| "I'll just add it quickly" | No unplanned additions. Ever. |
| Building a feature not in the registry | Violates AGENTS.md Rule 3 |
| Planning without checking existing files | May duplicate what already exists |
| Proposing a new service/API without checking stack | Tech stack loyalty (AGENTS.md Rule 4) |
| Skipping the Planning Brief for "small" changes | Small changes cause large regressions |
| Planning based on memory of the architecture | Always re-read. Memory drifts. |

---

## FAST-TRACK (Small Changes Only)

For genuinely trivial changes (copy edits, colour tweaks, label changes) in a single file:

1. State the file and the exact change in one sentence
2. Confirm it touches no logic, schema, or API
3. Confirm it complies with the design system
4. Get a single-word approval ("yes") from the user
5. Make the change

If any doubt exists about whether it qualifies as trivial — use the full protocol.
