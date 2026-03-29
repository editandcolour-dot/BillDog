---
name: coding-standards
description: Enterprise-level TypeScript/Next.js coding standards for Billdog. ALL agents MUST read this before writing any code.
---

# Coding Standards — Billdog

> **Consumed by:** Every agent, every session, before writing any code.
> **Project:** Billdog — SA municipal billing dispute platform
> **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS 3.x, Supabase, Railway

---

## 1. TypeScript Strict Mode

- `strict: true` in `tsconfig.json` — non-negotiable.
- **No `any`.** Ever. Use `unknown` + type guards if the type is genuinely unknown.
- **No implicit types.** Every function parameter, return type, and variable with non-obvious type must be explicitly typed.
- **Interfaces for everything.** All API request/response shapes, component props, database row types, and state objects get a named interface or type in `types/index.ts`.

```typescript
// ❌ BANNED
function analyseResult(data: any) { ... }

// ✅ REQUIRED
interface AnalysisResult {
  errors: BillError[];
  totalBilled: number;
  totalRecoverable: number;
  confidence: 'high' | 'medium' | 'low';
}
function analyseResult(data: AnalysisResult): DisputeSummary { ... }
```

---

## 2. File Size Limits

- **Maximum 200 lines per file.** No exceptions.
- **Single Responsibility Principle.** One file does one thing.
- If a file is approaching 200 lines, split it:
  - Extract sub-components into their own files
  - Extract logic into custom hooks (`hooks/`)
  - Extract utilities into `lib/`
  - Extract types into `types/`

---

## 3. Function Size Limits

- **Maximum 30 lines per function.** If it's longer, decompose it.
- **One job per function.** A function should do exactly one thing and do it well.
- Name the function after what it does — if you can't name it clearly, it's doing too much.

```typescript
// ❌ BANNED — 80-line function that parses, validates, transforms, and saves
async function handleBillUpload(file: File) { ... }

// ✅ REQUIRED — decomposed
async function handleBillUpload(file: File): Promise<Case> {
  const validated = validateUploadedFile(file);
  const text = await extractTextFromFile(validated);
  const analysis = await analyseBillText(text);
  return await createCase(analysis);
}
```

---

## 4. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Components | PascalCase | `CaseTimeline`, `BillBreakdown` |
| Functions / variables | camelCase | `calculateRecoverable`, `totalAmount` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE`, `API_TIMEOUT_MS` |
| Files / directories | kebab-case | `case-timeline.tsx`, `bill-breakdown.tsx` |
| Types / interfaces | PascalCase | `CaseStatus`, `BillError` |
| Hooks | camelCase with `use` prefix | `useCaseData`, `useAnalysis` |
| API routes | kebab-case | `generate-letter/route.ts` |
| Environment variables | SCREAMING_SNAKE | `NEXT_PUBLIC_SUPABASE_URL` |

---

## 5. Component Structure

Every React component file must follow this exact order:

```typescript
// 1. IMPORTS — external libs first, then internal, then types
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CaseStatus } from '@/types';

// 2. CONSTANTS (if any, file-scoped)
const STATUS_COLOURS: Record<CaseStatus, string> = { ... };

// 3. TYPES (component-specific only — shared types go in types/)
interface CaseCardProps {
  caseId: string;
  status: CaseStatus;
  onSelect: (id: string) => void;
}

// 4. COMPONENT
export function CaseCard({ caseId, status, onSelect }: CaseCardProps) {
  // hooks first
  // derived state / computations
  // handlers
  // return JSX
}

// 5. NO default exports — always named exports
```

**Rules:**
- Never use `default export`. Always named exports for tree-shaking and refactor safety.
- Keep JSX clean — extract complex conditions into variables or sub-components.
- No inline styles. Use Tailwind classes exclusively.

---

## 6. Custom Hooks

- Extract **all** non-trivial logic from components into hooks.
- Hooks live in `hooks/` or co-located with their feature.
- Always prefix with `use`.

```typescript
// ❌ BANNED — logic buried in component
function Dashboard() {
  const [cases, setCases] = useState<Case[]>([]);
  useEffect(() => {
    fetch('/api/cases').then(r => r.json()).then(setCases);
  }, []);
  // ... 50 more lines of data manipulation
}

// ✅ REQUIRED — logic extracted
function Dashboard() {
  const { cases, isLoading, error } = useCases();
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState error={error} />;
  return <CaseList cases={cases} />;
}
```

---

## 7. Import Rules

- **Absolute imports only.** Configure `@/` path alias in `tsconfig.json`.
- **Never use relative imports** like `../../components/ui/button`.
- Import order (enforced):
  1. External packages (`react`, `next`, etc.)
  2. Internal modules (`@/components/`, `@/lib/`, `@/hooks/`)
  3. Types (`import type` — always use `import type` for type-only imports)
  4. Styles (if any)

```typescript
// ❌ BANNED
import { Button } from '../../components/ui/button';

// ✅ REQUIRED
import { Button } from '@/components/ui/button';
```

---

## 8. Barrel Files

- Every directory with multiple exports gets an `index.ts` barrel file.
- Import from the barrel, not from individual files.
- **No circular dependencies.** If A imports from B's barrel which re-exports from A — restructure.

```typescript
// components/ui/index.ts
export { Button } from './button';
export { Card } from './card';
export { Badge } from './badge';

// Usage
import { Button, Card, Badge } from '@/components/ui';
```

---

## 9. Async/Await Only

- **No `.then()` chains.** Use `async/await` exclusively.
- **No callback patterns.** Wrap callback-based APIs in Promise if needed.
- Always handle errors with try/catch at the appropriate level.

```typescript
// ❌ BANNED
fetch('/api/cases')
  .then(res => res.json())
  .then(data => setCases(data))
  .catch(err => console.error(err));

// ✅ REQUIRED
try {
  const res = await fetch('/api/cases');
  if (!res.ok) throw new ApiError('Failed to fetch cases', res.status);
  const data: Case[] = await res.json();
  setCases(data);
} catch (error) {
  handleApiError(error);
}
```

---

## 10. Error Propagation

- **Never swallow errors silently.** Every catch block must either re-throw, log meaningfully, or display to user.
- **Throw meaningful errors.** Include what failed, why, and context.
- Use custom error classes for domain-specific errors.

```typescript
// ❌ BANNED
try { await sendLetter(caseId); }
catch (e) { console.log(e); }

// ✅ REQUIRED
export class DisputeError extends Error {
  constructor(
    message: string,
    public readonly caseId: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DisputeError';
  }
}

try {
  await sendLetter(caseId);
} catch (error) {
  throw new DisputeError(
    `Failed to send dispute letter for case ${caseId}: ${error}`,
    caseId,
    'LETTER_SEND_FAILED',
  );
}
```

---

## 11. Environment Validation

- Validate **all** required env vars on app startup. Fail fast with a clear message.
- Create a typed env config module — never access `process.env` directly in business logic.

```typescript
// lib/env.ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
  resendApiKey: requireEnv('RESEND_API_KEY'),
} as const;
```

---

## 12. No Hardcoded Values

- **No magic numbers.** Define named constants.
- **No hardcoded strings** for statuses, types, or config. Use enums or const objects.
- Constants live at the top of the file or in a shared constants module.

```typescript
// ❌ BANNED
if (file.size > 10485760) { ... }
if (status === 'sent') { ... }

// ✅ REQUIRED
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const CASE_STATUS = {
  UPLOADING: 'uploading',
  ANALYSING: 'analysing',
  LETTER_READY: 'letter_ready',
  SENT: 'sent',
} as const;

if (file.size > MAX_FILE_SIZE_BYTES) { ... }
if (status === CASE_STATUS.SENT) { ... }
```

---

## 13. Comments & Documentation

- **JSDoc for all public functions.** Include `@param`, `@returns`, `@throws`.
- **Inline comments only for non-obvious logic.** If the code needs explaining, consider renaming or restructuring first.
- **No commented-out code.** Delete it. Git has history. Commented-out code is dead code that misleads.

```typescript
// ❌ BANNED
// const oldCalculation = amount * 0.15;
const fee = amount * 0.2; // changed from 15% to 20%

// ✅ REQUIRED
/** Success fee rate applied to recovered billing amounts. */
const SUCCESS_FEE_RATE = 0.2;

/**
 * Calculate the success fee for a resolved dispute.
 * @param recoveredAmount - The confirmed amount recovered from the municipality.
 * @returns The fee to charge the user (20% of recovered amount).
 * @throws {DisputeError} If recovered amount is negative or zero.
 */
function calculateSuccessFee(recoveredAmount: number): number {
  if (recoveredAmount <= 0) {
    throw new DisputeError('Recovered amount must be positive', '', 'INVALID_AMOUNT');
  }
  return recoveredAmount * SUCCESS_FEE_RATE;
}
```

---

## 14. Testing

- **Every API route** (`app/api/`) needs at least one test covering the happy path and one error case.
- **Every utility function** (`lib/`) needs unit tests.
- **Every custom hook** needs a test with `renderHook`.
- Test files live adjacent to source: `analyse-bill.ts` → `analyse-bill.test.ts`.
- Use descriptive test names: `it('should return error when bill text is empty')`.

---

## 15. Performance

- **`useMemo` / `useCallback`** — only when measurably needed. Do not prematurely optimise. Profile first.
- **Lazy load heavy components** — use `next/dynamic` for components not needed on initial render (analysis charts, letter editor).
- **Image optimisation** — always use `next/image`, never raw `<img>`.
- **Bundle awareness** — never import an entire library for one function. Use specific imports.

```typescript
// ❌ BANNED
import _ from 'lodash';
const result = _.get(data, 'nested.value');

// ✅ REQUIRED — don't use lodash at all if native works
const result = data?.nested?.value;
```

---

## 16. Accessibility

- **Semantic HTML first.** Use `<button>`, `<nav>`, `<main>`, `<article>` — not `<div onClick>`.
- **ARIA labels** on all interactive elements without visible text.
- **Keyboard navigable.** Every clickable thing must be focusable and activatable via Enter/Space.
- **Colour contrast** — all text must meet WCAG AA minimum (4.5:1 for body, 3:1 for large text).
- **Focus indicators** — never hide focus outlines. Style them, don't remove them.

```typescript
// ❌ BANNED
<div onClick={handleClick} className="cursor-pointer">Upload</div>

// ✅ REQUIRED
<button onClick={handleClick} aria-label="Upload municipal bill">
  Upload
</button>
```

---

## 17. Security

- **Validate all inputs** — server-side. Never trust data from the client.
- **Sanitise before DB writes** — strip any HTML/script injection.
- **Never expose server secrets** — check `NEXT_PUBLIC_` prefix rules.
- **Parameterise all queries** — never interpolate user data into SQL.
- **Rate limit API routes** — especially `/api/analyse` and `/api/send-letter`.
- **CORS** — restrict to `billdog.co.za` in production.

---

## 18. Git Commits

- **Atomic commits.** One logical change per commit.
- **Conventional Commits format:**

| Prefix | Use |
|---|---|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `chore:` | Maintenance, deps, config |
| `docs:` | Documentation only |
| `style:` | Formatting, no logic change |
| `refactor:` | Code restructuring, no behaviour change |
| `test:` | Adding or fixing tests |

```
feat: add bill analysis API route with Claude integration
fix: resolve PDF parsing failure for scanned bills
chore: update Supabase client to latest version
```

---

## 19. Code Review Checklist

Before considering any code complete, the agent must mentally answer YES to all:

- [ ] Would a senior engineer approve this without comments?
- [ ] Does every function have a clear, single responsibility?
- [ ] Are all types explicit — no `any`, no implicit types?
- [ ] Is the file under 200 lines?
- [ ] Are all imports absolute (`@/`)?
- [ ] Is there zero commented-out code?
- [ ] Are errors handled meaningfully, not swallowed?
- [ ] Does it comply with the design system (Section 7 of ARCHITECTURE.md)?
- [ ] Is it accessible — semantic HTML, ARIA labels, keyboard navigable?
- [ ] Is it secure — inputs validated, secrets protected?
- [ ] Are hardcoded values replaced with named constants?
- [ ] Is it mobile-first — tested at 320px?

If any answer is NO, fix it before submitting.
