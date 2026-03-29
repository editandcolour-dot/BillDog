---
name: security-preflight
description: Use at the start of every session and before any external URL is accessed, any API is called, or any new MCP tool is connected. Performs a security check of the workspace.
---

## Security Preflight Checklist

Run these checks in order. Stop and alert me if any check fails. Do not proceed with the session task until all checks pass or I explicitly override.

### Check 1 — .env Protection
- Confirm .env exists in .gitignore
- Confirm no .env file contents are visible in any committed file
- Confirm no API keys or tokens appear in any markdown, session log, or memory file
- FAIL ACTION: Alert me immediately. Do not read or reference .env contents under any circumstances.

### Check 2 — Browser Allowlist
- If you are about to access any external URL, confirm it is a known, trusted domain
- Flag any URL that is: a public webhook service, a request logging service, an unknown domain, or anything not directly related to the current build task
- FAIL ACTION: Stop. Show me the URL. Ask for explicit permission before proceeding.

### Check 3 — Workspace Boundary
- Confirm all file operations are within the current project workspace
- Do not read, write, or reference files outside the project root
- Do not access SSH config, AWS credentials, or any system-level config files
- FAIL ACTION: Stop and alert me.

### Check 4 — Terminal Command Safety
- Before running any terminal command that deletes, overwrites, or sends data externally — stop and show me the command first
- Never run infinite processes autonomously — ask me to open a separate terminal tab
- Limit all terminal output using | head -50 to avoid context flooding
- FAIL ACTION: Show me the command and wait for approval.

### On Pass
Log a single line to today's session file:
✅ Security preflight passed — [timestamp]

### On Fail
Log to today's session file:
🚨 Security preflight FAILED — [check name] — [timestamp] — awaiting user decision
