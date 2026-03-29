# Architecture Sync

## Goal
Keep `AGENT_BRAIN/ARCHITECTURE.md` accurate and current as the single source of truth for the entire project.

## Context
Every agent must consult `ARCHITECTURE.md` before planning, building, or fixing anything. If the doc is stale, agents work from wrong assumptions. This directive defines when and how to update it.

## When to Run

| Trigger | Action |
|---|---|
| Session start | Run scanner to verify doc matches reality |
| New file or directory created | Update Section 3 (Repository Structure) |
| New directive or script added | Update Section 3 + relevant domain section |
| New feature started | Update Section 9 (Feature Registry) status to `in-progress` |
| Feature completed | Update Section 9 status to `complete` |
| Schema change | Update Section 4 (Database Schema) — must match migration file |
| New env var added | Update Section 8 (Integrations) |
| Architectural decision made | Append to Section 11 (Design Decisions Log) |
| New constraint discovered | Append to Section 12 (Constraints & Hard Rules) |
| Tech substitution approved | Update Section 2 (Tech Stack) |

## Execution Steps

### 1. Run the scanner
```bash
python execution/scan_architecture.py --output AGENT_BRAIN/ARCHITECTURE.md
```
The scanner will:
- Walk the filesystem and update the auto-generated sections
- Preserve human/agent-authored sections: Design Decisions Log (Section 11) and Constraints (Section 12)
- Output to `.tmp/architecture_scan.json` for reference

### 2. Verify the output
- Diff the new `ARCHITECTURE.md` against the previous version
- Flag any unexpected removals (could indicate accidental file deletion)
- Ensure no external project references leaked in

### 3. Manual enrichment
After the scanner populates the factual skeleton, the orchestrating agent must:
- Add any new Design Decision entries (format: `**DD-NNN** | YYYY-MM-DD | Title`)
- Add any new Constraints discovered during the session
- Update Feature Registry statuses for any work done in this session

## Tools
- `execution/scan_architecture.py`

## Outputs
- `AGENT_BRAIN/ARCHITECTURE.md` (updated in-place)
- `.tmp/architecture_scan.json` (intermediate scan data)

## Edge Cases & Error Handling
- **Scanner fails**: Check `.tmp/execution.log` for stack trace. Most likely a permissions error or unexpected file encoding.
- **Sections missing after scan**: The scanner preserves Sections 11 and 12 via marker detection. If markers are malformed, it falls back to appending the previous content verbatim.
- **Merge conflicts**: If two agents update the doc simultaneously (unlikely but possible), the later write wins. The scanner always regenerates from filesystem truth, so re-running resolves drift.
