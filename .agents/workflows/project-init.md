---
name: project-init
description: Run once at the start of every new project using /init. Onboards the project, researches best-fit skills, presents recommendations, and installs approved skills.
---

# Project Init Workflow

## Trigger
Run this workflow only when the user explicitly types /init. Never auto-trigger.

## Step 1 — Project Interview
Ask me these questions one at a time. Wait for each answer before continuing:

1. "What is this project? Describe it in one sentence."
2. "What is the primary platform? (web / mobile / API / desktop / other)"
3. "What is your tech stack? (or type 'unknown' and I will suggest one)"
4. "Does this project handle sensitive data? (money / personal info / auth / health / none)"
5. "What is your deployment target? (Railway / Vercel / Supabase / local / other)"

## Step 2 — Populate Base Files
Using the answers above:
- Write a project summary into PROJECT_MEMORY.md under "Current Project State"
- Write all tech stack details into TECH_STACK.md
- Write today's project start entry into the session log with timestamp

## Step 3 — Skill Research
Using the project description and platform answers:
- Run `npx @rmyndharis/antigravity-skills list` to see the full vault
- Filter the list by keywords matching the project type and platform
- Present matched skills to me for review **before installing anything**
- Build a recommended skill list. For each skill include:
  - Skill name
  - What it does in one line
  - Why it suits THIS specific project
  - Risk level (low / medium / high) based on whether it touches terminal or infrastructure

## Step 4 — Present Recommendations
Present the skill list in this format and wait for my response:

---
RECOMMENDED SKILLS FOR [PROJECT NAME]

1. [skill-name] — [what it does] — Risk: LOW
   Why: [one sentence specific to this project]

2. [skill-name] — [what it does] — Risk: MEDIUM
   Why: [one sentence specific to this project]

[etc.]

Type APPROVE ALL to install everything, or list the numbers you want (e.g. "1 3 5"), or SKIP to install nothing.
---

## Step 5 — Install Approved Skills
For each approved skill:
- Run: npx @rmyndharis/antigravity-skills install [skill-name] --global
- Confirm installation succeeded
- If installation fails, log the failure and try the next skill — do not stop the whole workflow

## Step 6 — Log Everything
After all installs:
- Append an "Installed Skills" section to TECH_STACK.md listing every skill installed, the date, and why it was chosen
- Add a completion entry to today's session log
- Run the security-preflight skill
- Then say: "Project [name] is initialised. Here is what was installed and why. Ready to build."

## Rules
- Never install a skill rated HIGH risk without showing me the skill's full SKILL.md content first and getting explicit approval
- Never install more than 10 skills in one session — quality over quantity
- If a skill search returns no results, say so and suggest I build a custom skill instead
- Always prefer --global installs so skills travel to future projects
