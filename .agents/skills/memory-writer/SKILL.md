---
name: memory-writer
description: Use after every completed task to update project memory and session log.
---

## DO NOT USE WHEN
- A task is still in progress — wait until it is fully complete
- You are in the middle of fault investigation — run fault-logger first, then memory-writer after the fix is confirmed
- Nothing has changed — do not write empty or duplicate entries

## Workflow

1. Append a timestamped entry to today's session log (`AGENT_BRAIN/sessions/YYYY-MM-DD.md`):
   - What was done
   - What changed
   - Any decisions made or issues encountered

2. Update `AGENT_BRAIN/PROJECT_MEMORY.md` if anything structural changed:
   - New features built
   - Architectural decisions made
   - Change in project state

3. Update `AGENT_BRAIN/TECH_STACK.md` if any new service, endpoint, or integration was added.

4. Keep `AGENT_BRAIN/PROJECT_MEMORY.md` under 3KB:
   - Check file size
   - If over limit: summarise and compress — merge related bullet points, remove resolved items, keep only what's current and structural

5. Rewrite `AGENT_BRAIN/STATE.md` to reflect current state:
   - Move **Currently In Progress** → **Just Completed** (one-line summary of the task just finished)
   - Clear **Blocked** if the blocker was resolved; leave it if still pending
   - Populate **Next Up** if the next task is known; clear it if not
   - Clear **Currently In Progress** ready for the next task
   - Update **Agent Notes** with anything worth flagging to the user (questions, decisions needed, concerns)
