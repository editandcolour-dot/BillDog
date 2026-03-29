---
name: git-workflow
description: Git branching, commit conventions, and deployment discipline for Billdog. Orchestration Agent MUST read this to maintain clean Git history.
---

# Git Workflow — Billdog

> **Consumed by:** Orchestration Agent — governs all Git operations across the project
> **Project:** Billdog — SA municipal billing dispute platform
> **Hosting:** Railway — auto-deploys from `main`
> **Rule:** Never commit directly to `main`. Never commit secrets. Always run the scanner before committing structural changes.

---

## 1. Branch Naming Conventions

Every branch must use a **type prefix** and **kebab-case description**:

| Prefix | Use | Example |
|---|---|---|
| `feature/` | New feature from Feature Registry | `feature/bill-upload` |
| `fix/` | Bug fix | `fix/payfast-itn-signature` |
| `chore/` | Non-code tasks (deps, config, docs) | `chore/update-dependencies` |
| `refactor/` | Code restructuring, no behaviour change | `refactor/extract-bill-parser` |
| `docs/` | Documentation only | `docs/update-architecture` |

```bash
# ✅ CORRECT
git checkout -b feature/landing-page
git checkout -b fix/mobile-nav-overflow
git checkout -b chore/add-eslint-config

# ❌ BANNED
git checkout -b new-stuff
git checkout -b jason-working
git checkout -b test123
```

### Rules
- Branch names must be **descriptive** — another developer should understand the scope from the name.
- Branch names map to the **Feature Registry** (ARCHITECTURE.md Section 9) when applicable.
- Delete branches after merge — no stale branches.

---

## 2. Never Commit to Main

`main` is the **production branch**. Railway deploys from it automatically.

```bash
# ❌ BANNED — direct commit to main
git checkout main
git add .
git commit -m "quick fix"

# ✅ REQUIRED — feature branch workflow
git checkout -b fix/analysis-timeout
# ... make changes ...
git add .
git commit -m "fix: increase Claude API timeout to 60s"
git push origin fix/analysis-timeout
# Create PR → Review → Merge to main
```

**Why:** A broken commit to `main` = a broken production deploy. Feature branches isolate risk.

---

## 3. Commit Message Convention

Use **Conventional Commits** format: `type: description`

### Types

| Type | When | Example |
|---|---|---|
| `feat:` | New feature or capability | `feat: add bill upload component with drag-and-drop` |
| `fix:` | Bug fix | `fix: resolve PayFast ITN signature validation error` |
| `chore:` | Maintenance, deps, config | `chore: update Supabase client to 2.39.0` |
| `docs:` | Documentation only | `docs: update ARCHITECTURE.md feature registry` |
| `style:` | Formatting, UI tweaks, no logic | `style: fix mobile layout on analysis results page` |
| `refactor:` | Restructure without behaviour change | `refactor: extract bill parsing logic into lib/pdf/parse.ts` |
| `test:` | Adding or fixing tests | `test: add unit tests for success fee calculation` |

### Format
```
type: short description (imperative mood, lowercase, no period)

Optional body explaining WHY, not WHAT.
The code shows WHAT changed. The commit explains WHY.

Optional footer:
Closes #123
Breaking-change: description
```

### Examples
```bash
# ✅ GOOD — clear, scoped, imperative mood
feat: add bill upload API route with PDF validation
fix: prevent duplicate case creation on rapid form submission
chore: add rate limiting to Claude API calls
refactor: move auth middleware helpers to lib/auth/

# ❌ BAD — vague, past tense, bundled
"updated stuff"
"fixed bugs"
"WIP"
"changes"
"added login and signup and dashboard and forgot password"
```

---

## 4. Atomic Commits

**One logical change per commit.** Never bundle unrelated changes.

```bash
# ❌ BANNED — three unrelated changes in one commit
git add .
git commit -m "feat: add upload page, fix navbar, update deps"

# ✅ REQUIRED — separate commits
git add components/upload/
git commit -m "feat: add bill upload component with drag-and-drop"

git add components/nav/
git commit -m "fix: resolve navbar overflow on mobile screens"

git add package.json package-lock.json
git commit -m "chore: update Supabase client to 2.39.0"
```

### Why Atomic Commits Matter
- **Revert safety:** If the upload feature breaks, you can revert just that commit.
- **Code review:** Reviewers see one change at a time — clearer, faster reviews.
- **Git blame:** When tracking down a bug, each line points to a meaningful commit.

---

## 5. `.gitignore`

The following must **always** be in `.gitignore`:

```gitignore
# Environment and secrets
.env
.env.local
.env.production
.env.*.local

# Temporary and intermediate files
.tmp/

# Dependencies
node_modules/

# Next.js build
.next/
out/
build/
dist/

# Google credentials (for execution scripts)
credentials.json
token.json

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/

# Supabase local
supabase/.temp/
```

### Verification
Before every commit:
```bash
git status
# Check that NO file listed above appears in staged changes
# If .env appears — STOP. Do not commit. Fix .gitignore first.
```

---

## 6. Secret Protection

### Never Commit
- `.env` files of any kind
- API keys (Anthropic, Supabase service role, Resend, PayFast)
- OAuth tokens (`token.json`, `credentials.json`)
- Private keys, certificates, passwords

### If You Accidentally Commit a Secret
```bash
# 1. IMMEDIATELY rotate the exposed key in the service dashboard
# 2. Remove from Git history (not just deleting the file — it's still in history)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (coordinate with team)
git push origin --force --all

# 4. Log the incident in AGENT_BRAIN/FAULT_LOG.md
```

**Rule:** It's faster to rotate a key than to clean Git history. Rotate first, clean second.

---

## 7. PR Discipline

Every pull request must:

1. **Reference the Feature Registry** — state which feature from ARCHITECTURE.md Section 9 this implements or fixes.
2. **Include a description** — what changed as a concise summary, why it changed, and what was tested.
3. **Pass all checks** — TypeScript compiles, ESLint passes, tests pass.
4. **Be reviewed** — no self-merging to `main` without at least one review.

### PR Template
```markdown
## What
[One-sentence summary of the change]

## Feature Registry
[Feature name from ARCHITECTURE.md Section 9] — Status: planned → complete

## Changes
- [File 1: what changed]
- [File 2: what changed]

## Testing
- [ ] Tested at 320px mobile
- [ ] Tested happy path
- [ ] Tested error cases
- [ ] RLS verified (if DB changes)
- [ ] Architecture scanner run

## Screenshots
[If UI change, include mobile + desktop screenshots]
```

---

## 8. Architecture Scanner Before Commit

If your changes include **any structural change** (new files, deleted files, new directories, new directives, new scripts), you must run the scanner before committing:

```bash
# Run scanner
python execution/scan_architecture.py --output AGENT_BRAIN/ARCHITECTURE.md

# Stage the updated architecture doc alongside your changes
git add AGENT_BRAIN/ARCHITECTURE.md
git add [your other changed files]
git commit -m "feat: add bill analysis API route

Also updates ARCHITECTURE.md via scanner."
```

### What Counts as Structural
- Creating a new file or directory
- Deleting a file or directory
- Adding a new directive to `directives/`
- Adding a new script to `execution/`
- Adding a new environment variable to `.env`
- Changing the Feature Registry status

### What Doesn't Require a Scanner Run
- Editing content within an existing file (no new/deleted files)
- Updating styles or copy
- Bug fixes that don't change file structure

---

## 9. Railway Deployment

### How It Works
1. Code is merged to `main`
2. Railway detects the push
3. Railway runs `npm run build`
4. If build succeeds, Railway deploys
5. If build fails, previous deploy stays live

### Environment Variables
- Set in **Railway dashboard** — not in `.env` on the server
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`
- Railway injects `$PORT` — Next.js picks it up automatically

### Pre-Merge Checklist
Before merging any PR to `main`:
- [ ] `npm run build` succeeds locally
- [ ] No type errors (`tsc --noEmit`)
- [ ] No lint errors (`eslint .`)
- [ ] Tests pass
- [ ] Architecture doc is current
- [ ] Feature Registry updated if applicable

---

## 10. Versioning & Tags

Use **Semantic Versioning** (`MAJOR.MINOR.PATCH`):

| Part | Increments When | Example |
|---|---|---|
| MAJOR | Breaking changes, major redesign | `v1.0.0` → `v2.0.0` |
| MINOR | New feature, backwards-compatible | `v1.0.0` → `v1.1.0` |
| PATCH | Bug fix, no new features | `v1.1.0` → `v1.1.1` |

### Billdog Version Plan
| Version | Milestone |
|---|---|
| `v0.1.0` | First internal deploy — landing page + auth |
| `v0.2.0` | Bill upload + AI analysis working |
| `v0.3.0` | Letter generation + sending |
| `v0.4.0` | Payment integration + success fee |
| `v1.0.0` | First production release — full user flow end-to-end |

### Tagging a Release
```bash
git tag -a v0.1.0 -m "First internal deploy: landing page + auth"
git push origin v0.1.0
```

---

## 11. Git Hygiene Checklist

Run this mental checklist before every `git push`:

- [ ] Am I on a feature branch, not `main`?
- [ ] Is my commit message in Conventional Commits format?
- [ ] Is each commit atomic — one logical change?
- [ ] Does `git status` show zero secrets or `.env` files?
- [ ] If structural changes, did I run the architecture scanner?
- [ ] Is `ARCHITECTURE.md` staged if it was updated?
- [ ] Does `npm run build` succeed?
- [ ] Would a senior engineer approve this commit history?
