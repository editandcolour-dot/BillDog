---
name: claude-api
description: Claude API patterns for Billdog bill analysis and letter generation. AI Agent MUST read this before every Claude API call.
---

# Claude API — Billdog

> **Consumed by:** AI Agent — read before writing any Claude API call, prompt, or response handler
> **Project:** Billdog — SA municipal billing dispute platform
> **Model:** `claude-sonnet-4-20250514` — non-negotiable. Never change without explicit user approval.
> **Rule:** All Claude calls are server-side only. Never expose API key to browser. Never call from Client Components.

---

## 1. Model — Non-Negotiable

```typescript
const MODEL = 'claude-sonnet-4-20250514';
```

- **Always use this exact model string.**
- Never substitute with `claude-3-opus`, `claude-3-haiku`, or any other model.
- If a different model is needed, propose it to the user with justification and wait for approval.
- Update `AGENT_BRAIN/ARCHITECTURE.md` Section 6 after any approved change.

---

## 2. SDK Setup

### Installation
```bash
npm install @anthropic-ai/sdk
```

### Server-Side Client
```typescript
// lib/claude/client.ts
import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('[FATAL] ANTHROPIC_API_KEY is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}
```

### Rules
- **Never instantiate in browser** — only in API routes and server components.
- **Never import in files with `'use client'`** — the SDK and API key must stay server-side.
- **Singleton pattern** — reuse the client instance across calls.

---

## 3. Basic Messages API Pattern

```typescript
import { getClaudeClient } from '@/lib/claude/client';

const client = getClaudeClient();

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  system: 'System prompt here.',
  messages: [
    { role: 'user', content: 'User message here.' },
  ],
});

// Always check content array before accessing
if (response.content.length === 0 || response.content[0].type !== 'text') {
  throw new Error('Empty or non-text Claude response');
}

const text = response.content[0].text;
```

---

## 4. Forcing Strict JSON Output

Critical for bill analysis. Claude must return parseable JSON, not prose.

### System Prompt Instruction
Always include this in system prompts that expect JSON:
```
You must respond with valid JSON only.
No prose. No markdown. No code fences. No explanations.
Raw JSON only.
If you cannot complete the task, return: {"error": "description"}
```

### Parsing Pattern
```typescript
function parseClaudeJson<T>(raw: string): T {
  // Strip accidental markdown fences
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseError) {
    console.error('[claude/parse] Failed to parse JSON', {
      responseLength: raw.length,
      preview: raw.substring(0, 300),
      parseError: parseError instanceof Error ? parseError.message : String(parseError),
    });
    throw new Error('Claude returned invalid JSON');
  }
}
```

### Validation Pattern
```typescript
function validateAnalysisResult(parsed: unknown): AnalysisResult {
  const obj = parsed as Record<string, unknown>;

  // Check required keys
  const requiredKeys = ['errors', 'total_billed', 'total_recoverable', 'confidence', 'summary'];
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      throw new Error(`Missing required key in analysis: ${key}`);
    }
  }

  if (!Array.isArray(obj.errors)) {
    throw new Error('errors must be an array');
  }

  if (!['high', 'medium', 'low'].includes(obj.confidence as string)) {
    throw new Error('confidence must be high, medium, or low');
  }

  return obj as unknown as AnalysisResult;
}
```

**Rule:** Never assume Claude's JSON structure is correct. Always validate before using.

---

## 5. Bill Analysis Call

```typescript
// lib/claude/analyse.ts
import { getClaudeClient } from '@/lib/claude/client';

const ANALYSIS_SYSTEM_PROMPT = `You are an expert South African municipal billing analyst.
You specialise in identifying overcharges, incorrect tariffs, and billing errors in
municipal accounts from City of Cape Town, eThekwini, Johannesburg, Tshwane, and Ekurhuleni.

Analyse the municipal bill text provided and identify all billing errors.

You must respond with valid JSON only.
No prose. No markdown. No code fences. No explanations. Raw JSON only.
If you cannot analyse the bill, return: {"error": "description"}

Required JSON schema:
{
  "errors": [{
    "line_item": "description of the charge",
    "amount_charged": 1234.56,
    "expected_amount": 1000.00,
    "issue": "clear explanation of what is wrong",
    "legal_basis": "relevant legislation or tariff regulation",
    "recoverable": true
  }],
  "total_billed": 5000.00,
  "total_recoverable": 234.56,
  "confidence": "high" | "medium" | "low",
  "bill_period": "March 2026",
  "municipality_detected": "City of Cape Town",
  "summary": "brief plain-English summary of findings"
}`;

export async function analyseBill(billText: string): Promise<AnalysisResult> {
  const client = getClaudeClient();

  // Trim bill text to 8000 chars max
  const trimmedText = billText.length > 8000
    ? billText.substring(0, 8000)
    : billText;

  if (billText.length > 8000) {
    console.warn('[claude/analyse] Bill text exceeds 8000 chars — may indicate extraction issue', {
      originalLength: billText.length,
    });
  }

  const startTime = Date.now();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: trimmedText },
    ],
  });

  const duration = Date.now() - startTime;

  if (response.content.length === 0 || response.content[0].type !== 'text') {
    throw new Error('Empty Claude response for bill analysis');
  }

  const parsed = parseClaudeJson<AnalysisResult>(response.content[0].text);
  const validated = validateAnalysisResult(parsed);

  // Return with metadata for logging
  return {
    ...validated,
    _meta: {
      model: 'claude-sonnet-4-20250514',
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      durationMs: duration,
    },
  };
}
```

### Analysis Output Schema
```typescript
// types/analysis.ts
interface BillingError {
  line_item: string;
  amount_charged: number;
  expected_amount: number;
  issue: string;
  legal_basis: string;
  recoverable: boolean;
}

interface AnalysisResult {
  errors: BillingError[];
  total_billed: number;
  total_recoverable: number;
  confidence: 'high' | 'medium' | 'low';
  bill_period: string;
  municipality_detected: string;
  summary: string;
  _meta?: {
    model: string;
    tokensUsed: number;
    durationMs: number;
  };
}
```

---

## 6. Letter Generation Call

```typescript
// lib/claude/letter.ts

const LETTER_SYSTEM_PROMPT = `You are an expert South African legal writer specialising in
municipal billing disputes under Section 102 of the Municipal Systems Act (No. 32 of 2000).

Write a formal dispute letter to the municipality. The letter must:
- Be addressed to the Municipal Manager
- Reference the account holder's details and account number
- Cite Section 102 of the Municipal Systems Act
- List each disputed charge with the amount, the issue, and the legal basis
- State the total recoverable amount
- Request correction within 30 calendar days per Section 102(2)
- Be professional, firm, and legally sound
- End with the account holder's name

Output the letter as plain text only. No HTML. No markdown. No code fences.
Use proper line breaks and paragraph spacing.`;

export async function generateLetter(
  analysis: AnalysisResult,
  userProfile: UserProfile,
  municipality: Municipality,
  legislationContext: string,
): Promise<string> {
  const client = getClaudeClient();
  const startTime = Date.now();

  const userMessage = `
Account Holder: ${userProfile.full_name}
Account Number: ${userProfile.account_number}
Municipality: ${municipality.name}
Bill Period: ${analysis.bill_period}

Analysis Results:
${JSON.stringify(analysis.errors, null, 2)}

Total Billed: R${analysis.total_billed.toFixed(2)}
Total Recoverable: R${analysis.total_recoverable.toFixed(2)}

Relevant Legislation:
${legislationContext.substring(0, 2000)}
`.trim();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: LETTER_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userMessage },
    ],
  });

  const duration = Date.now() - startTime;

  if (response.content.length === 0 || response.content[0].type !== 'text') {
    throw new Error('Empty Claude response for letter generation');
  }

  const letterText = response.content[0].text.trim();

  // Validate letter quality
  if (letterText.length < 500) {
    console.warn('[claude/letter] Generated letter is unusually short', {
      length: letterText.length,
    });
  }

  return letterText;
}
```

### Letter Requirements Checklist
- [ ] Addressed to Municipal Manager
- [ ] Account holder name and account number
- [ ] References Section 102, Municipal Systems Act
- [ ] Each disputed charge listed with amount and issue
- [ ] Legal basis cited per line item
- [ ] Total recoverable amount stated
- [ ] 30-day correction deadline per Section 102(2)
- [ ] Professional, firm tone
- [ ] Plain text output (no HTML/markdown)

---

## 7. Claude Vision for Image Uploads

```typescript
// lib/claude/vision.ts

export async function extractTextFromImage(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<string> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: [
              'Extract all text from this South African municipal bill image exactly as it appears.',
              'Preserve all numbers, dates, line items, amounts, account numbers, and addresses.',
              'Maintain the structure of tables and line items.',
              'Return only the extracted text, nothing else.',
            ].join(' '),
          },
        ],
      },
    ],
  });

  if (response.content.length === 0 || response.content[0].type !== 'text') {
    throw new Error('Empty Claude Vision response');
  }

  return response.content[0].text;
}
```

---

## 8. Error Handling

Every Claude API call must handle these failure modes:

### Timeout (>30s)
```typescript
const CLAUDE_TIMEOUT_MS = 30_000;

async function callWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = CLAUDE_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await operation();
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(
        'Analysis is taking longer than usual. Please try again.',
        'CLAUDE_TIMEOUT',
      );
    }
    throw error;
  }
}
```

### Rate Limit (429)
```typescript
async function callWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 1,
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    const apiError = error as { status?: number };
    if (apiError.status === 429 && maxRetries > 0) {
      console.warn('[claude] Rate limited, retrying in 60s');
      await new Promise(resolve => setTimeout(resolve, 60_000));
      return callWithRetry(operation, maxRetries - 1);
    }
    throw error;
  }
}
```

### API Error
```typescript
try {
  const result = await analyseBill(billText);
  return NextResponse.json({ data: result });
} catch (error) {
  console.error('[api/analyse]', {
    errorType: error instanceof Error ? error.name : 'Unknown',
    message: error instanceof Error ? error.message : String(error),
    userId: session.user.id,
    caseId,
  });

  // User-friendly message — never expose Claude error details
  return NextResponse.json(
    { error: "We couldn't analyse your bill right now. Please try again in a few minutes." },
    { status: 500 },
  );
}
```

### Empty Response
```typescript
// Always check before accessing content
if (response.content.length === 0 || response.content[0].type !== 'text') {
  throw new Error('Claude returned empty or non-text response');
}
```

---

## 9. Logging Claude Calls

Log every Claude call to `case_events` for debugging and billing tracking.

```typescript
// After successful analysis
await supabase.from('case_events').insert({
  case_id: caseId,
  event_type: 'analysed',
  note: `Bill analysed with ${result.confidence} confidence. ${result.errors.length} issues found. R${result.total_recoverable.toFixed(2)} recoverable.`,
  metadata: {
    model: result._meta?.model,
    tokens_used: result._meta?.tokensUsed,
    duration_ms: result._meta?.durationMs,
    confidence: result.confidence,
    errors_found: result.errors.length,
  },
});

// After successful letter generation
await supabase.from('case_events').insert({
  case_id: caseId,
  event_type: 'letter_generated',
  note: `Dispute letter generated (${letterText.length} chars).`,
  metadata: {
    model: 'claude-sonnet-4-20250514',
    letter_length: letterText.length,
    duration_ms: duration,
  },
});
```

### Rules
- **Never log full bill text** to console in production.
- **Never log full letter content** to console — it contains PII.
- **Always log:** model, token count, duration, confidence, error count.
- **Log to `case_events`** — creates an auditable trail per case.

---

## 10. Token Efficiency

### Bill Text Limits
```typescript
const MAX_BILL_TEXT_CHARS = 8000;

// Trim before sending
if (billText.length > MAX_BILL_TEXT_CHARS) {
  console.warn('[claude] Bill text exceeds 8000 chars', {
    length: billText.length,
    caseId,
  });
  billText = billText.substring(0, MAX_BILL_TEXT_CHARS);
}
```

### Legislation Context Limits
```typescript
const MAX_LEGISLATION_CHARS = 2000;

// Include only relevant legislation in RAG context
const legislationContext = relevantLegislation
  .substring(0, MAX_LEGISLATION_CHARS);
```

### Why These Limits
- Most SA municipal bills are 1000–5000 chars after extraction.
- 8000 chars covers even verbose multi-page bills.
- Beyond 8000 likely means extraction noise (headers, footers repeated).
- Legislation context over 2000 chars wastes tokens — only include directly relevant sections.

---

## 11. Security Reminders

| Rule | Why |
|---|---|
| Never expose `ANTHROPIC_API_KEY` to browser | Anyone could use your API quota |
| Never call Claude from Client Components | API key would be in the client bundle |
| Always call via API routes (`app/api/`) | Key stays server-side |
| Never pass unsanitised user input as prompts | Prompt injection risk |
| Never log API key values | Exposure in log aggregators |

```typescript
// ❌ BANNED — client-side Claude call
'use client';
import Anthropic from '@anthropic-ai/sdk'; // EXPOSED TO BROWSER

// ✅ REQUIRED — call via API route
'use client';
const result = await fetch('/api/analyse', {
  method: 'POST',
  body: JSON.stringify({ caseId }),
});
```
