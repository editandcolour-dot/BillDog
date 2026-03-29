---
description: Start or resume a working session — reads project memory, creates or resumes today's session log, and orients the agent.
---

## /start Workflow

Determine which of the three cases applies, then follow the matching path.

### Session Archiving Policy
- Keep the **14 most recent** session files in `AGENT_BRAIN/sessions/`
- Move any older session files to `AGENT_BRAIN/sessions/archive/`
- Run this check at the start of every Case 1 (new day) session only
- Do not delete archived files

---

### Case 1 — No session file exists for today

1. Read `AGENT_BRAIN/PROJECT_MEMORY.md`
2. Read `AGENT_BRAIN/TECH_STACK.md`
3. Read `AGENT_BRAIN/FAULT_LOG.md`
4. Read `AGENT_BRAIN/STATE.md`
5. Read the most recent file in `AGENT_BRAIN/sessions/` (if any exists)
6. Create `AGENT_BRAIN/sessions/YYYY-MM-DD.md` for today with this header:

```
# Session: YYYY-MM-DD

## [HH:MM] Session Start
- Status: New session
- Context loaded: PROJECT_MEMORY, TECH_STACK, FAULT_LOG, STATE, [last session file if any]
```

7. Summarise: current project state in 3–5 bullet points, including STATE.md if it has active entries
8. Run the **security-preflight** skill before proceeding with any session task
9. Ask: "What are we working on today?"

---

### Case 2 — Today's session file exists and contains a ⏸ marker

1. Read `AGENT_BRAIN/PROJECT_MEMORY.md`
2. Read `AGENT_BRAIN/TECH_STACK.md`
3. Read `AGENT_BRAIN/FAULT_LOG.md`
4. Read `AGENT_BRAIN/STATE.md`
5. Read today's session file `AGENT_BRAIN/sessions/YYYY-MM-DD.md`
6. Append a resume entry to today's session:

```
## [HH:MM] ▶ Session Resumed
- Resumed from pause point
```

7. Summarise: where we left off before the pause, including STATE.md — currently in progress, blocked items, next up
8. Run the **security-preflight** skill before proceeding with any session task
9. Ask: "Ready to continue — shall we pick up where we left off?"

---

### Case 3 — Today's session file exists but has NO ⏸ marker (crash recovery)

1. Read `AGENT_BRAIN/PROJECT_MEMORY.md`
2. Read `AGENT_BRAIN/TECH_STACK.md`
3. Read `AGENT_BRAIN/FAULT_LOG.md`
4. Read `AGENT_BRAIN/STATE.md`
5. Read today's session file `AGENT_BRAIN/sessions/YYYY-MM-DD.md`
6. Check recently modified files in the project to understand what was last touched
7. Append a recovery entry to today's session:

```
## [HH:MM] ⚠️ Crash Recovery
- Session ended without a pause marker
- Recently modified files: [list]
- Last logged action: [last entry in today's session]
```

8. Report: what was found — last action logged, files recently modified, apparent state
9. Run the **security-preflight** skill before proceeding with any session task
10. Ask: "Can you confirm what happened and what state we're in before I continue?"
