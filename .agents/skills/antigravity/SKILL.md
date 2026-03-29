---
name: antigravity-operations
description: Operating patterns for agents within Google Antigravity's multi-agent orchestration environment. ALL agents operating within AG on this project MUST read this before acting.
---

# Antigravity Operations — Billdog

> **Consumed by:** Every agent operating within the Antigravity environment
> **Project:** Billdog — SA municipal billing dispute platform
> **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS 3.x, Supabase, Railway
> **Architecture Brain:** `AGENT_BRAIN/ARCHITECTURE.md`

---

## 1. Antigravity Architecture

Antigravity (AG) is a multi-agent orchestration environment. Agents are spawned, given context, execute tasks, and return results. Understanding the execution model prevents wasted tokens and conflicting writes.

**Agent lifecycle:**
```
SPAWN → CONTEXT INJECTION → TASK EXECUTION → RESULT RETURN → SESSION END
```

**Key properties:**
- Each agent invocation is a **one-shot execution**. There is no persistent memory between invocations unless written to disk.
- The filesystem is the **only shared state** between agents. `AGENT_BRAIN/` is the canonical persistence layer.
- Agents do not communicate directly. They communicate through **files** — architecture docs, directives, state files, and `.tmp/` intermediates.
- Each agent session starts with a fresh context window. Previous context is only available if explicitly loaded from disk.

**Implication:** If you discover something (a bug pattern, an edge case, an API constraint), write it down in the appropriate directive or architecture section. If you don't write it, the next agent won't know it.

---

## 2. Directive System

Directives are the Layer 1 instruction set. They live in `directives/` and define **what to do**, not how to think.

### Reading Directives
- Always read the **full** directive before acting. Do not skim.
- Check for `## Edge Cases & Error Handling` — these contain lessons learned from previous sessions.
- Check for `## Tools` — these tell you which execution scripts to use.

### Following Directives
- Execute steps **in order** unless the directive explicitly allows parallelism.
- If a directive says "wait for user approval" — wait. Do not assume approval.
- If a directive references another directive — read that one too.

### Updating Directives
- When you discover a new edge case, API constraint, or failure mode — **append it** to the relevant directive's Edge Cases section.
- Never delete existing directive content without user approval.
- Never create new directives without user approval — propose first.
- Format updates cleanly. Future agents will read this.

---

## 3. Tool-Calling Patterns

In AG, "tools" are deterministic Python scripts in `execution/`. The agent is the orchestration layer — it decides what to run, with what inputs, and how to interpret outputs.

### Execution Pattern
```
1. Read the directive for the task domain
2. Identify the correct script in execution/
3. Construct the CLI arguments
4. Run the script via terminal
5. Read stdout/stderr for results
6. Handle errors per the self-annealing protocol
```

### Rules
- **Always check if a script exists** before writing a new one. Run `ls execution/` first.
- **Never do manually what a script can do.** If you're about to parse a file, check for a parser script. If you're about to scan the project, use `scan_architecture.py`.
- **Pass arguments via CLI flags**, not stdin. Scripts use `argparse`.
- **Check exit codes.** Exit 0 = success. Exit 1 = failure. Read `.tmp/execution.log` for details.
- **Never modify execution scripts** without running them again to verify the change works.

---

## 4. Agent Handoff

When one agent completes work and another picks up, context loss is the primary risk. AG agents communicate through files, not memory.

### Handoff Protocol
1. **Update `AGENT_BRAIN/STATE.md`** with what's in progress, what's blocked, and what's next.
2. **Update `AGENT_BRAIN/ARCHITECTURE.md`** via the scanner if any structural changes were made.
3. **Write any discovered constraints** to Section 12 of ARCHITECTURE.md.
4. **Log any architectural decisions** to Section 11 of ARCHITECTURE.md.
5. **Update Feature Registry** (Section 9) if feature status changed.

### What to Include in Handoff State
```
CURRENTLY IN PROGRESS: [task name and file(s) being worked on]
BLOCKED: [what's waiting on external input]
JUST COMPLETED: [one-line summary of last completed task]
NEXT UP: [what the next agent should pick up]
AGENT NOTES: [anything non-obvious — gotchas, failed approaches, open questions]
```

### Anti-Pattern: Silent Handoff
Never end a session without updating state files. A silent handoff forces the next agent to reverse-engineer what happened — wasting tokens and risking divergent assumptions.

---

## 5. Context Window Management

AG agents operate within finite context windows. Efficient context usage is critical for complex tasks.

### Principles
- **Load architecture first.** `AGENT_BRAIN/ARCHITECTURE.md` is the most important context. Always load it before anything else.
- **Load only relevant directives.** Don't load `directives/payments.md` if you're working on UI.
- **Use the scanner JSON** (`.tmp/architecture_scan.json`) for quick lookups instead of re-reading the full architecture doc.
- **Summarise before handoff.** Don't dump raw logs — distil into actionable summaries.
- **Avoid redundant file reads.** If you've read a file, extract what you need and work from memory within the session.

### Token Efficiency
- Shorter prompts → faster responses → more iterations within budget.
- Use the Planning Brief format (from `directives/planning.md`) — it's designed to be token-efficient.
- When reporting results, use structured formats (tables, bullet points) not prose.

---

## 6. Multi-Agent Domain Ownership

In a multi-agent build, conflicts happen when two agents modify the same file. Domain ownership prevents this.

### Domain Map (from ARCHITECTURE.md)

| Domain | Files Owned | Governing Directive |
|---|---|---|
| UI / Frontend | `app/`, `components/` | `directives/ui.md` |
| API Routes | `app/api/` | `directives/api.md` |
| Database | `supabase/`, `lib/supabase/` | `directives/database.md` |
| AI / Claude | `lib/claude/` | `directives/ai.md` |
| Email | `lib/resend/` | `directives/email.md` |
| Payments | `lib/payfast/`, `app/api/webhooks/` | `directives/payments.md` |
| Architecture | `AGENT_BRAIN/`, `execution/scan_architecture.py` | `directives/architecture_sync.md` |

### Conflict Prevention
- If your task crosses domain boundaries (e.g., UI + API), work on one domain at a time and commit/save between.
- Never modify files outside your assigned domain without checking the architecture doc and flagging to the user.
- If two agents need to modify the same file — **stop and escalate**. Merge conflicts in AG are expensive.

---

## 7. Session Persistence

AG sessions are ephemeral. Disk is permanent. The architecture brain survives session resets by design.

### What Persists (on disk)
- `AGENT_BRAIN/ARCHITECTURE.md` — project truth
- `AGENT_BRAIN/STATE.md` — live session state
- `AGENT_BRAIN/PROJECT_MEMORY.md` — compressed project history
- `AGENT_BRAIN/FAULT_LOG.md` — error history
- `directives/` — all SOPs
- `execution/` — all scripts
- All source code

### What Does NOT Persist
- Agent memory / conversation history
- In-progress thoughts or plans not written to disk
- Uncommitted code changes (if the session crashes)

### Rule
If it's not on disk, it doesn't exist for the next agent. **Write early, write often.**

---

## 8. Scanner Integration

The architecture scanner (`execution/scan_architecture.py`) is the mechanism that keeps `ARCHITECTURE.md` current.

### When to Trigger
| Event | Action |
|---|---|
| Session start | `python execution/scan_architecture.py --output AGENT_BRAIN/ARCHITECTURE.md` |
| New file created | Run scanner |
| File deleted | Run scanner |
| New directive added | Run scanner |
| New execution script added | Run scanner |
| Feature status change | Run scanner (after manual Section 9 update) |
| Session end | Run scanner |

### Scanner Modes
```bash
# Full update — regenerates auto-scanned section, preserves Sections 11 & 12
python execution/scan_architecture.py --output AGENT_BRAIN/ARCHITECTURE.md

# JSON only — quick lookup, no file modification
python execution/scan_architecture.py --json-only

# Custom root — scan from a different directory
python execution/scan_architecture.py --root /path/to/project --output AGENT_BRAIN/ARCHITECTURE.md
```

### Post-Scan Verification
After running the scanner, always:
1. Check that Sections 11 (Design Decisions) and 12 (Constraints) were preserved
2. Verify the directive and script counts match expectations
3. Flag any unexpected file removals to the user

---

## 9. `.tmp/` Usage

All intermediate files go in `.tmp/`. No exceptions.

### Allowed in `.tmp/`
- Scanner output: `architecture_scan.json`
- Execution logs: `execution.log`
- Scraped data, parsed PDFs, API responses
- Temporary exports, build artifacts
- Debug files, test fixtures

### Never in `.tmp/`
- Source code
- Configuration files
- Directives or architecture docs
- Anything that needs to survive a `rm -rf .tmp/`

### Rule
`.tmp/` can be deleted at any time without data loss. If deleting `.tmp/` breaks your workflow, you've put something permanent in a temporary location — move it.

---

## 10. Error Escalation

Not all errors are equal. The agent must decide: self-anneal or escalate.

### Self-Anneal (Handle Yourself)
- Script syntax errors — fix and re-run
- Missing `.tmp/` directory — recreate it
- API timeout — retry with backoff
- Wrong CLI arguments — read the script's `--help` and retry
- File encoding issues — try UTF-8, then fallback

### Escalate to User
- Error touches 3+ files → it's a refactor, not a fix
- Error requires a tech stack change → violates AGENTS.md Rule 4
- Error requires schema modification → violates AGENTS.md Rule 5
- Error suggests architectural misalignment → the architecture doc may be wrong
- Error persists after 2 self-anneal attempts → you're in a loop, ask for help

### Escalation Format
```
ERROR TYPE:        [classification]
SELF-ANNEAL ATTEMPTS: [what you tried]
WHY ESCALATING:    [why you can't fix this alone]
PROPOSED FIX:      [your best guess at resolution]
IMPACT:            [what breaks if we don't fix this]
```

---

## 11. Skill Consumption Pattern

Skills are pre-built knowledge bundles in `.agents/skills/`. Always check for relevant skills before acting in a domain.

### Pattern
```
1. Check available skills: ls .agents/skills/
2. Read the SKILL.md for relevant domain
3. Follow the skill's instructions exactly
4. If the skill is insufficient, propose an update — don't work around it
```

### Current Skills
| Skill | When to Read |
|---|---|
| `coding-standards` | Before writing ANY code |
| `antigravity` | Before operating in AG environment (this file) |
| `brand-scraper` | Before any brand extraction task |
| `fault-logger` | When any error occurs |
| `memory-writer` | After every completed task |
| `security-preflight` | At session start, before external access |
| `skill-creator` | When building new skills |

---

## 12. AG-Specific Pitfalls

Common failure modes in multi-agent Antigravity builds:

| Pitfall | How to Avoid |
|---|---|
| **Context amnesia** | Always read `AGENT_BRAIN/` at session start. Never assume you know the project state. |
| **Parallel file conflicts** | Check domain ownership. Never modify files another agent owns. |
| **Scope explosion** | Follow `directives/planning.md`. Produce a brief. Wait for approval. |
| **Silent failures** | Every error must be logged to `FAULT_LOG.md` via the fault-logger skill. |
| **Phantom architecture** | Always run the scanner. The doc must match reality. |
| **Token waste on re-reads** | Read once, extract what you need, work from extracted data. |
| **Orphaned intermediates** | Clean `.tmp/` of files you created when done. Don't leave garbage for the next agent. |
| **Assumption cascades** | If you're unsure about anything — a type, a path, a convention — check the architecture doc. Don't guess and propagate. |
| **Over-engineering** | Build what the Feature Registry says. Nothing more. Propose additions, don't build them. |

---

## 13. Context Injection

When spawning sub-tasks or preparing prompts, inject the right context:

### Minimum Context (Always Inject)
1. `AGENT_BRAIN/ARCHITECTURE.md` — Sections relevant to the task domain
2. `AGENTS.md` — Operating rules
3. Relevant directive from `directives/`
4. Relevant skill from `.agents/skills/`

### Optional Context (Inject When Relevant)
- `AGENT_BRAIN/STATE.md` — if continuing another agent's work
- `AGENT_BRAIN/FAULT_LOG.md` — if fixing a known error
- `.tmp/architecture_scan.json` — for quick structural lookups
- Source files directly relevant to the task

### Anti-Pattern: Context Flooding
Do not inject the entire `ARCHITECTURE.md` for a trivial task. Extract the relevant sections. Context flooding wastes tokens and dilutes attention on what matters.

---

## 14. Parallel vs Sequential Execution

### Parallelise When
- Tasks are in **different domains** (e.g., UI component + API route — different files, no shared state)
- Tasks are **independent** (completing one doesn't affect the other)
- Tasks share **no files** (no merge conflict risk)

### Chain Sequentially When
- Task B depends on Task A's output (e.g., parse PDF → analyse text)
- Tasks modify the **same file** (e.g., both update `types/index.ts`)
- Tasks follow a **strict order** (e.g., schema migration → seed → API route → UI)
- User flow steps must be built in order (Section 5 of ARCHITECTURE.md)

### Rule of Thumb
If you're unsure, **chain sequentially**. Parallel bugs are harder to diagnose than sequential slowness.

---

## 15. Antigravity vs Manual Coding

**The core AG principle:** Never do manually what a deterministic script can do.

| Task | Manual (❌) | Script (✅) |
|---|---|---|
| Scan project structure | Read files one by one | `python execution/scan_architecture.py` |
| Extract brand data | Copy-paste from website | `python execution/scrape_brand_firecrawl.py` |
| Validate env vars | Check `.env` manually | Build a validation script |
| Generate boilerplate | Write from scratch | Use templates in `execution/` |
| Run migrations | Execute SQL manually | `supabase migration up` |

### When to Create a New Script
If you find yourself doing the same manual task more than once:
1. Propose a new script to the user
2. Build it in `execution/` following the boilerplate pattern
3. Add a directive in `directives/` for when/how to use it
4. Update the architecture doc via the scanner

The system gets stronger with every script. Manual work is a one-time cost that teaches nothing to the next agent.
