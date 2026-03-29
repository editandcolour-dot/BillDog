---
description: Pause the current session — writes the ⏸ marker to today's session log so /start can resume cleanly.
---

## /pause Workflow

1. Append a pause entry to today's session log (`AGENT_BRAIN/sessions/YYYY-MM-DD.md`):

```
## [HH:MM] ⏸ Session Paused
- Current task: [what was in progress]
- Completed this session: [one-line summary]
- Next up: [next task if known]
```

2. Update `AGENT_BRAIN/STATE.md` — set **Agent Notes** to a brief handoff note for resume.

3. Confirm to the user:
   > "Session paused. Run /start to resume — I'll pick up exactly where we left off."

## Notes
- The ⏸ marker is what /start uses to detect a clean pause vs. a crash
- Always run /pause before closing the session intentionally
- If you forget to pause, /start will enter crash recovery mode (Case 3) on next open
