# BILLDOG — AGENT OPERATING RULES

Every agent operating in this project — regardless of provider, session, or task — is bound by these rules. No exceptions.

---

## 1. Architecture-First (NON-NEGOTIABLE)

Before planning, building, or fixing ANYTHING, read `AGENT_BRAIN/ARCHITECTURE.md`.

All proposals must reference the architecture doc to prove alignment.
After any structural change, run the architecture scanner to keep the doc current:

```bash
python execution/scan_architecture.py --output AGENT_BRAIN/ARCHITECTURE.md
```

If you are about to build something not described in the architecture doc, STOP and ask the user before proceeding.

---

## 1a. Error Fixing — Mandatory Protocol

Before fixing ANY error, read and follow `directives/error_fix.md` in full.
You must classify the error, locate the canonical file, and state architectural alignment BEFORE writing a single line of fix code.
Fixes that touch more than 3 files must be escalated to the user — they have become refactors.

## 1b. Planning — Mandatory Protocol

Before planning or building ANY new feature or change, read and follow `directives/planning.md` in full.
You must produce a Planning Brief and receive explicit user approval BEFORE writing any code.
Features not in the Feature Registry (ARCHITECTURE.md Section 9) must not be built without approval.

---

## 2. No Guessing

If something is unclear, ambiguous, or missing from the architecture:
- Do NOT guess
- Do NOT assume
- Ask the user for clarification before writing any code

---

## 3. No Scope Creep

Build only what is described in AGENT_BRAIN/ARCHITECTURE.md and the active directive.
Do not add features, integrations, or abstractions that are not explicitly specified.
If you think something should be added, propose it — do not build it unilaterally.

---

## 4. Tech Stack Loyalty

Never substitute or introduce a technology not listed in the tech stack (ARCHITECTURE.md Section 2).
If you believe a substitution is warranted, propose it with justification and wait for approval.

---

## 5. Database Schema is Sacred

Never modify the database schema without:
1. Reading the full schema in ARCHITECTURE.md Section 4
2. Proposing the change explicitly
3. Receiving user approval
4. Writing a migration file in `supabase/migrations/`

Never delete columns. Deprecate only. Never rename without a migration.

---

## 6. Design System Compliance

All UI must conform to the design system in ARCHITECTURE.md Section 7.
Never use colours, fonts, or tones not specified there.
Never deviate from the Bebas Neue / DM Sans font pairing.

---

## 7. AI Call Rules

All Claude API calls must follow the patterns in `directives/ai.md` and ARCHITECTURE.md Section 6.
Always use `claude-sonnet-4-20250514`. Never hardcode a different model without approval.
Always wrap in try/catch. Never let AI failures crash the app.

---

## 8. Security Rules

- Never log or expose PayFast tokens
- Never send user PII beyond minimum required to Claude API
- Never store card numbers — PayFast handles tokenisation only
- All Supabase queries must use Row Level Security (RLS)
- Never expose Supabase service role key to the browser

---

## 9. Feature Registry

Before building any feature, check Section 9 of ARCHITECTURE.md.
If the feature is marked `planned` — you may build it.
If it is marked `in-progress` — check with the user first.
If it is marked `complete` — do not rebuild it.
If it is not listed — do not build it without approval.

---

## 10. After Every Session

Run the architecture scanner. Diff the output. Flag any unexpected removals to the user.

---
---

# 3-LAYER ARCHITECTURE — OPERATING MODEL

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch.

## The 3-Layer Architecture

**Layer 1: Directive (What to do)**
- Basically just SOPs written in Markdown, live in `directives/`
- Define the goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee

**Layer 2: Orchestration (Decision making)**
- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution. E.g you don't try scraping websites yourself—you read `directives/scrape_website.md` and come up with inputs/outputs and then run `execution/scrape_single_site.py`

**Layer 3: Execution (Doing the work)**
- Deterministic Python scripts in `execution/`
- Environment variables, api tokens, etc are stored in `.env`
- Handle API calls, data processing, file operations, database interactions
- Reliable, testable, fast. Use scripts instead of manual work. Commented well.

**Why this works:** if you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. The solution is push complexity into deterministic code. That way you just focus on decision-making.

## Operating Principles

**1. Check for tools first**
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist.

**2. Self-anneal when things break**
- Read error message and stack trace
- Fix the script and test it again (unless it uses paid tokens/credits/etc—in which case you check w user first)
- Update the directive with what you learned (API limits, timing, edge cases)
- Example: you hit an API rate limit → you then look into API → find a batch endpoint that would fix → rewrite script to accommodate → test → update directive.

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better approaches, common errors, or timing expectations—update the directive. But don't create or overwrite directives without asking unless explicitly told to. Directives are your instruction set and must be preserved (and improved upon over time, not extemporaneously used and then discarded).

## Self-annealing loop

Errors are learning opportunities. When something breaks:
1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

## File Organization

**Deliverables vs Intermediates:**
- **Deliverables**: Google Sheets, Google Slides, or other cloud-based outputs that the user can access
- **Intermediates**: Temporary files needed during processing

**Directory structure:**
- `AGENT_BRAIN/` - Architecture source of truth, project memory, state, fault log. Read before every session.
- `.tmp/` - All intermediate files (dossiers, scraped data, temp exports). Never commit, always regenerated.
- `execution/` - Python scripts (the deterministic tools)
- `directives/` - SOPs in Markdown (the instruction set)
- `.env` - Environment variables and API keys
- `credentials.json`, `token.json` - Google OAuth credentials (required files, in `.gitignore`)

**Key principle:** Local files are only for processing. Deliverables live in cloud services (Google Sheets, Slides, etc.) where the user can access them. Everything in `.tmp/` can be deleted and regenerated.

## Summary

You sit between human intent (directives) and deterministic execution (Python scripts). Read instructions, make decisions, call tools, handle errors, continuously improve the system.

Be pragmatic. Be reliable. Self-anneal.

## Memory & Fault Logging
- After every completed task, run the memory-writer skill.
- When any error occurs, run the fault-logger skill before attempting a fix.