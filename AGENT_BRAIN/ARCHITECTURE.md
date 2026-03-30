# BILLDOG — ARCHITECTURE BRAIN
> **STATUS: AUTHORITATIVE**
> Last updated: 2026-03-27
> Scanner: `python execution/scan_architecture.py --output AGENT_BRAIN/ARCHITECTURE.md`
>
> ⚠️ ALL AGENTS MUST READ THIS ENTIRE DOCUMENT BEFORE WRITING ANY CODE, MAKING ANY PLAN, OR SUGGESTING ANY CHANGE.
> If something is not described here, ask the user before building it. No guessing. No assumptions.

---

## SECTION 1 — PROJECT IDENTITY

| Field | Value |
|---|---|
| Product Name | Billdog |
| Domain | billdog.co.za |
| One-liner | AI-powered municipal billing dispute service for South African property owners |
| Revenue Model | 20% success fee on recovered funds. Zero upfront cost to user. |
| Legal Basis | Section 102, Municipal Systems Act (No. 32 of 2000) |
| Target Market v1 | South African residential property owners |
| Target Market v2 | Commercial and industrial property owners |
| Type | Website (not a native app). Must be fully mobile-responsive. |
| Brand Tone | Bold, direct, consumer-champion. Never corporate. Never timid. |
| Hero Copy | "Your municipality got it wrong. We'll make it right." |
| Sub Copy | "No lawyers. No queues. No nonsense. Just results." |
| AI Disclosure | "AI-powered analysis, human-reviewed letters" — disclosed as feature, not disclaimer |
| Competitor | councilsolutions.co.za — manual, human-only, no self-service |
| Moat | First mover + data flywheel: case history, municipality-specific knowledge, success rates |

---

## SECTION 2 — TECH STACK

> ⚠️ NEVER substitute or introduce unlisted technology without explicit user approval and an architecture update.

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Frontend | Next.js | 14 (App Router) | Website only. No React Native. No Expo. |
| Styling | Tailwind CSS | 3.x | Mobile-first. All breakpoints must be considered. |
| Backend | Next.js API Routes | — | No separate backend server. All API logic lives in `/app/api/` |
| Database | Supabase (PostgreSQL) | Latest | Single source of data truth |
| Auth | Supabase Auth | — | Email/password + magic link |
| File Storage | Supabase Storage | — | Bill PDFs and images only |
| AI / Analysis | Anthropic Claude API | claude-sonnet-4-20250514 | Bill analysis + letter generation |
| PDF Parsing | pdf-parse | Node.js | Extract text from uploaded bills |
| Image OCR | Claude Vision | claude-sonnet-4-20250514 | For photo uploads of bills |
| Email Sending | Resend | — | Dispute letters to municipalities + user notifications |
| Payments | PayFast | — | Card-on-file token. Charge on confirmed success only. |
| Hosting | Railway | — | Next.js deployed as Railway service |
| RAG / Legislation | Supabase pgvector | — | Municipal Systems Act, bylaws, case law |
| Embeddings | Voyage AI | — | For legislation RAG vectors |
| Domain | billdog.co.za | — | Registered via domains.co.za |

---

## SECTION 3 — REPOSITORY STRUCTURE

> Every directory and file listed here has a defined purpose. Do not create files outside this structure without updating this document.

```
billdog/
├── AGENTS.md                        ← Agent operating rules (read first)
├── AGENT_BRAIN/
│   └── ARCHITECTURE.md              ← THIS FILE — single source of truth
├── directives/                      ← Agent SOPs and rules per domain
│   ├── architecture_sync.md         ← When/how to update architecture doc
│   ├── database.md                  ← DB schema rules and migration SOP
│   ├── api.md                       ← API route conventions
│   ├── ui.md                        ← UI/design rules and component patterns
│   ├── ai.md                        ← Claude API usage rules and prompt patterns
│   ├── email.md                     ← Resend/email rules
│   └── payments.md                  ← PayFast rules and charge logic
├── execution/
│   └── scan_architecture.py         ← Scans filesystem, regenerates architecture doc
├── app/                             ← Next.js App Router root
│   ├── layout.tsx                   ← Root layout (fonts, nav, footer)
│   ├── globals.css                  ← Tailwind + custom CSS vars
│   ├── (public)/                    ← Public pages — no auth required
│   │   ├── page.tsx                 ← Home / Landing page
│   │   ├── how-it-works/page.tsx    ← Detailed explainer
│   │   ├── pricing/page.tsx         ← Success fee breakdown + worked example
│   │   ├── real-cases/page.tsx      ← Sourced horror stories (no fake testimonials)
│   │   ├── faq/page.tsx             ← Full FAQ
│   │   ├── about/page.tsx           ← Why Billdog, AI transparency, SA focus
│   │   ├── contact/page.tsx         ← Simple contact form
│   │   ├── privacy/page.tsx         ← POPIA-compliant privacy policy
│   │   ├── terms/page.tsx           ← Terms of service
│   │   └── popia/page.tsx           ← POPIA compliance statement
│   ├── (auth)/                      ← Auth flow pages
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── onboarding/page.tsx      ← Name, municipality, account number, property type
│   ├── (app)/                       ← Protected pages — auth required
│   │   ├── dashboard/page.tsx       ← My Cases — all cases with status
│   │   ├── upload/page.tsx          ← Upload bill (PDF or photo)
│   │   ├── analysis/[id]/page.tsx   ← AI findings, line-by-line breakdown
│   │   ├── letter/[id]/page.tsx     ← Dispute letter preview + optional edit
│   │   ├── case/[id]/page.tsx       ← Single case detail + event timeline
│   │   ├── success/page.tsx         ← Dispute sent confirmation
│   │   └── settings/page.tsx        ← Profile, card on file, notifications
│   └── api/                         ← API routes (server-side only)
│       ├── analyse/route.ts         ← POST: parse bill + Claude analysis
│       ├── generate-letter/route.ts ← POST: generate dispute letter
│       ├── send-letter/route.ts     ← POST: email letter via Resend
│       ├── cases/route.ts           ← GET/POST: list + create cases
│       ├── cases/[id]/route.ts      ← GET/PATCH: single case
│       ├── municipalities/route.ts  ← GET: municipality contact lookup
│       └── webhooks/
│           └── payfast/route.ts     ← PayFast ITN webhook handler
├── components/
│   ├── ui/                          ← Primitive UI components (Button, Card, Badge, etc.)
│   ├── layout/                      ← Nav, Footer, PageWrapper
│   ├── forms/                       ← UploadForm, DisputeForm, OnboardingForm
│   ├── cases/                       ← CaseCard, CaseTimeline, StatusBadge
│   └── analysis/                    ← BillBreakdown, ErrorLine, RecoverableAmount
├── lib/
│   ├── supabase/
│   │   ├── client.ts                ← Browser Supabase client
│   │   ├── server.ts                ← Server Supabase client
│   │   └── middleware.ts            ← Auth middleware (protects /app routes)
│   ├── claude/
│   │   ├── analyse-bill.ts          ← Bill analysis prompt + API call
│   │   └── generate-letter.ts       ← Letter generation prompt + API call
│   ├── resend/
│   │   └── send-dispute.ts          ← Send letter email to municipality
│   ├── payfast/
│   │   └── charge.ts                ← Card-on-file charge on success
│   ├── pdf/
│   │   └── parse.ts                 ← pdf-parse wrapper
│   └── municipalities/
│       └── index.ts                 ← Municipality contact database lookup
├── types/
│   └── index.ts                     ← All shared TypeScript types
├── public/
│   ├── logo.svg                     ← Billdog logo (navy/orange dog carrying letter)
│   └── og-image.png                 ← Open Graph image for social sharing
└── supabase/
    ├── migrations/                  ← All DB migrations in chronological order
    └── seed.sql                     ← Municipality contact data seed
```

---

## SECTION 4 — DATABASE SCHEMA

> ⚠️ Never modify schema without a migration file. Never delete columns — deprecate only.
> All tables must have Row Level Security (RLS) enabled.

### `profiles`
```sql
id              uuid PRIMARY KEY REFERENCES auth.users(id)
full_name       text NOT NULL
email           text NOT NULL
phone           text
municipality    text                          -- e.g. "City of Cape Town"
account_number  text                          -- municipal account number
property_type   text CHECK IN ('residential','commercial','industrial')
payfast_token   text                          -- encrypted card-on-file token
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### `cases`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES profiles(id)
status          text NOT NULL DEFAULT 'uploading'
                -- ENUM: uploading | analysing | letter_ready | sent
                --       acknowledged | resolved | escalated | closed
bill_url        text                          -- Supabase Storage path
bill_text       text                          -- raw parsed text from PDF/image
municipality    text NOT NULL
account_number  text NOT NULL
bill_period     text                          -- e.g. "January 2026"
total_billed    numeric(12,2)
errors_found    jsonb                         -- array of error objects (see AI Section)
recoverable     numeric(12,2)                 -- estimated recoverable amount
letter_content  text                          -- generated dispute letter (plain text)
letter_sent_at  timestamptz
municipality_email text                       -- where letter was sent
response_notes  text                          -- municipality response summary
resolved_at     timestamptz
amount_recovered numeric(12,2)               -- confirmed by user on resolution
fee_charged     numeric(12,2)                 -- 20% of amount_recovered
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### `case_events`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
case_id         uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE
event_type      text NOT NULL
                -- ENUM: uploaded | analysed | letter_generated | letter_sent
                --       response_received | escalated | resolved | payment_charged
note            text
metadata        jsonb                         -- optional structured data per event
created_at      timestamptz DEFAULT now()
```

### `municipalities`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
name            text NOT NULL UNIQUE
province        text NOT NULL
dispute_email   text NOT NULL
dispute_phone   text
postal_address  text
ombudsman_email text
nersa_applicable boolean DEFAULT true
typical_response_days int DEFAULT 30
active          boolean DEFAULT true
created_at      timestamptz DEFAULT now()
```

### `legislation` (RAG store)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
title           text NOT NULL
section         text NOT NULL              -- e.g. "Section 102"
content         text NOT NULL
embedding       vector(1536)
source          text NOT NULL
                -- Municipal Systems Act | Property Rates Act
                -- Prescription Act | Electricity Regulation Act
                -- Municipal Finance Management Act
created_at      timestamptz DEFAULT now()
```

---

## SECTION 5 — USER FLOW

> This is the canonical user journey. Every page and API route maps to a step here.

```
STEP 1:  LAND          → app/(public)/page.tsx
STEP 2:  SIGN UP       → app/(auth)/signup/page.tsx  [Supabase Auth]
STEP 3:  ONBOARD       → app/(auth)/onboarding/page.tsx  [saves to profiles]
STEP 4:  UPLOAD        → app/(app)/upload/page.tsx  [PDF or photo → Supabase Storage]
STEP 5:  PARSE         → api/analyse/route.ts  [pdf-parse or Claude Vision]
STEP 6:  ANALYSE       → api/analyse/route.ts  [Claude API → errors JSON → saved to cases]
STEP 7:  VIEW RESULTS  → app/(app)/analysis/[id]/page.tsx
STEP 8:  GENERATE      → api/generate-letter/route.ts  [Claude + RAG → letter text]
STEP 9:  PREVIEW       → app/(app)/letter/[id]/page.tsx  [user can edit]
STEP 10: CARD ON FILE  → app/(app)/letter/[id]/page.tsx  [PayFast tokenisation]
STEP 11: SEND          → api/send-letter/route.ts  [Resend → municipality email]
STEP 12: CONFIRM       → app/(app)/success/page.tsx  [case status → 'sent']
STEP 13: TRACK         → app/(app)/dashboard/page.tsx + app/(app)/case/[id]/page.tsx
STEP 14: RESOLVE       → app/(app)/case/[id]/page.tsx  [user confirms resolution + amount]
STEP 15: CHARGE        → api/cases/[id]/route.ts  [PATCH status=resolved → PayFast charge]
STEP 16: RECEIPT       → Resend email to user
```

---

## SECTION 6 — AI / CLAUDE API RULES

> ⚠️ Always use `claude-sonnet-4-20250514`. Never change the model without approval.

### Bill Analysis (lib/claude/analyse-bill.ts)
- **Input:** Raw bill text string (from pdf-parse or Claude Vision OCR)
- **Output:** Strict JSON — no prose, no markdown fences
- **Max tokens:** 2000
- **Required output schema:**
```json
{
  "errors": [
    {
      "line_item": "string — exact line item name from bill",
      "service_type": "electricity | water | gas | rates | sewerage | refuse | other",
      "amount_charged": 0.00,
      "expected_amount": 0.00,
      "issue": "string — plain English explanation",
      "legal_basis": "string — relevant act and section",
      "recoverable": true
    }
  ],
  "total_billed": 0.00,
  "total_recoverable": 0.00,
  "confidence": "high | medium | low",
  "bill_period": "string",
  "municipality_detected": "string",
  "summary": "string — 1-2 sentence plain English summary"
}
```

### Letter Generation (lib/claude/generate-letter.ts)
- **Input:** Analysis JSON + user profile + municipality name + RAG legislation context
- **Output:** Plain text dispute letter — no HTML, no markdown
- **Max tokens:** 4000
- **Must cite:** Section 102 of Municipal Systems Act (minimum)
- **Must include:** Account number, disputed line items with amounts, legal basis per item, specific resolution requested, 30-day response deadline
- **Tone:** Formal, firm, professional — not aggressive, not emotional

### Claude Vision OCR (for image uploads)
- Send image as base64 to Claude with instruction to extract all bill text
- Output: Plain text string — treat same as pdf-parse output thereafter

### General Rules
- Always wrap all Claude calls in try/catch
- Log every Claude call result to `case_events` (event_type: 'analysed' or 'letter_generated')
- Never expose ANTHROPIC_API_KEY to the browser
- Never send more PII than needed (only account number, municipality, bill text)

---

## SECTION 7 — DESIGN SYSTEM

> ⚠️ All UI must conform to this. Never deviate without updating this section.

### Colour Palette
```
--navy:         #0B1F3A   Primary dark bg, headings
--blue:         #1A56DB   Secondary accent, snout colour on logo
--orange:       #F97316   Primary CTA, logo accent, highlights
--orange-light: #FB923C   Hover states
--white:        #FFFFFF
--off-white:    #F8FAFF   Alternate section backgrounds
--grey:         #64748B   Body text, labels, captions
--light-grey:   #E2E8F0   Borders, dividers, input borders
--success:      #10B981   Recovered amounts, success states, confirmations
--error:        #EF4444   Error amounts, warnings
```

### Typography
- **Display / H1 / H2:** Bebas Neue (Google Fonts) — letter-spacing: 1-3px
- **Body / UI:** DM Sans (Google Fonts) — weights: 300, 400, 500, 700
- **Never use:** Inter, Roboto, Arial, system-ui as primary typefaces

### Component Patterns
- **Primary button:** bg-orange, white text, rounded-md, font-bold, hover:bg-orange-light, hover:-translate-y-0.5
- **Outline button:** transparent, white border (on dark), navy border (on light), hover:border-solid
- **Cards:** white bg, light-grey border, rounded-2xl, hover:shadow-lg hover:-translate-y-1
- **Badges/tags:** small caps, rounded-full, coloured bg at 10-15% opacity, matching text colour
- **Section labels:** uppercase, letter-spacing: 2px, orange, small (0.75-0.8rem), above headings

### Layout
- Max content width: 1200px, centred, 6% horizontal padding
- Section vertical padding: 80-100px desktop, 60px mobile
- Mobile minimum: 320px width — all layouts must work at this width
- Touch targets: minimum 44px height on all interactive elements

### Logo
- File: `/public/logo.svg`
- Usage: Nav (height 42px), Footer (height 36px), always on dark background in nav
- Never stretch, never recolour, never use text-only fallback in production

---

## SECTION 8 — INTEGRATIONS & ENVIRONMENT VARIABLES

> Never commit values. Never expose to browser except NEXT_PUBLIC_ prefixed vars.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server only — never expose to browser

# Anthropic
ANTHROPIC_API_KEY=                  # Server only

# Resend
RESEND_API_KEY=                     # Server only
RESEND_FROM_EMAIL=                  # e.g. disputes@billdog.co.za

# PayFast
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=                 # Server only
PAYFAST_ITN_URL=                    # Webhook URL for payment notifications

# Voyage AI
VOYAGE_API_KEY=                     # Server only — for embeddings

# App
NEXT_PUBLIC_APP_URL=                # e.g. https://billdog.co.za
NODE_ENV=
```

---

## SECTION 9 — FEATURE REGISTRY

> Check this before building anything. Status must be kept current.

| Feature | Status | Files | Notes |
|---|---|---|---|
| Landing page | complete | app/(public)/page.tsx, components/landing/ | All 8 sections: Hero, Trust, Stats, How It Works, Real Cases, Testimonials, FAQ, CTA |
| Root layout | complete | app/layout.tsx | Fonts, viewport, Nav, Footer, SkipLink, semantic landmarks |
| Error & 404 pages | complete | app/error.tsx, app/not-found.tsx, components/ui/ErrorCard.tsx | Global/Layout boundaries and custom 404 page. |
| Nav component | complete | components/layout/Nav.tsx | Fixed, backdrop-blur, mobile CTA, desktop nav links |
| Footer component | complete | components/layout/Footer.tsx | Legal disclaimer, POPIA/Privacy/Terms links, copyright |
| Button component | complete | components/ui/Button.tsx | Primary, outline-dark, outline-light, disabled. Link/button polymorphic |
| Logo | complete | public/logo.svg | Dog carrying letter SVG |
| Skip navigation | complete | components/layout/SkipLink.tsx | sr-only, focus-visible |
| FAQ accordion | complete | components/ui/FaqAccordion.tsx | aria-expanded, aria-controls, keyboard accessible |
| ScrollReveal | complete | components/ui/ScrollReveal.tsx | Intersection Observer fade-in |
| Prescription validation | complete | lib/validators/prescription.ts | SA Prescription Act Section 11. Per-service-type periods. 41 unit tests. |
| Test infrastructure | complete | vitest.config.ts, tests/setup.ts | Vitest, 70% coverage thresholds, env vars, mock reset |
| How It Works page | planned | app/(public)/how-it-works/ | |
| Pricing page | planned | app/(public)/pricing/ | |
| Real Cases page | planned | app/(public)/real-cases/ | Use sourced news stories only |
| FAQ page | planned | app/(public)/faq/ | |
| About page | planned | app/(public)/about/ | |
| Contact page | planned | app/(public)/contact/ | |
| Privacy Policy | planned | app/(public)/privacy/ | POPIA compliant |
| Terms of Service | planned | app/(public)/terms/ | |
| POPIA Statement | planned | app/(public)/popia/ | |
| Supabase Auth | complete | app/(auth)/ lib/supabase/ | |
| Onboarding flow | complete | app/(app)/onboarding/ | |
| Bill upload | complete | app/(app)/upload/ api/upload/ | PDF + image support |
| PDF parsing | complete | lib/pdf/parse.ts | pdf-parse library |
| Claude bill analysis | complete | lib/claude/analyse-bill.ts | Returns structured JSON |
| Analysis results page | complete | app/(app)/analysis/[id]/ | Dynamic Claude UI polling with prescription validation |
| Letter generation | complete | lib/claude/generate-letter.ts | |
| Letter preview page | complete | app/(app)/letter/[id]/ | User can edit before send |
| Municipality email | complete | lib/resend/ api/send-letter/ | Resend integration |
| Inbound email webhook | complete | api/webhooks/resend-inbound/ | Resend integration |
| Municipality database | planned | lib/municipalities/ supabase/seed.sql | All SA metros |
| Cases dashboard | complete | app/(app)/dashboard/ | |
| Case detail page | complete | app/(app)/case/[id]/ | Timeline view |
| PayFast card on file | planned | lib/payfast/ | Tokenise only — charge on success |
| Legislation RAG | complete | supabase/ (pgvector) | Voyage AI embeddings |
| Success page | complete | app/(app)/success/ | |
| Settings page | planned | app/(app)/settings/ | |
| PayFast webhook | planned | api/webhooks/payfast/ | ITN handler |
| Commercial v2 | future | — | Not in scope for v1 |
| Class action module | future | — | Community complaint aggregation |
| WhatsApp sharing | future | — | Viral loop feature |

---

## SECTION 10 — MUNICIPALITY DATABASE (v1 Seed Data)

> All metros supported at launch. Seed file: `supabase/seed.sql`

| Municipality | Province | Dispute Email | Notes |
|---|---|---|---|
| City of Cape Town | Western Cape | accounts@capetown.gov.za | Tel: 0860 103 089 |
| City of Johannesburg | Gauteng | [email protected] | Joburg Connect: 0860 562 874 |
| City of Tshwane | Gauteng | [email protected] | Tel: 012 358 9999 |
| eThekwini Municipality | KwaZulu-Natal | [email protected] | Tel: 080 031 3111 |
| Ekurhuleni | Gauteng | [email protected] | Tel: 011 999 0000 |
| Nelson Mandela Bay | Eastern Cape | [email protected] | Tel: 041 506 1111 |
| Buffalo City | Eastern Cape | [email protected] | Tel: 043 705 1111 |
| Mangaung | Free State | [email protected] | Tel: 051 405 8000 |

> Escalation path (same for all): Municipal Ombudsman → NERSA (electricity) → Public Protector

---


---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

## AUTO-SCANNED FILESYSTEM SNAPSHOT

> Last scanned: 2026-03-30T16:33:45.980715+00:00
> Project root: `C:\Users\Jason\Desktop\BillDog`

### Directory Inventory

```
📁 (root)/
  📄 .env  (0.2 KB)
  📄 .env.local  (1.0 KB)
  📄 .env.local.example  (0.0 KB)
  📄 .eslintrc.json  (0.1 KB)
  📄 .gitignore  (0.4 KB)
  📄 .prettierrc  (0.2 KB)
  📄 AGENTS.md  (7.6 KB)
  📄 CLAUDE.md  (7.7 KB)
  📄 TECH_DEBT.md  (0.3 KB)
  📄 build-error.log  (2.4 KB)
  📄 build.log  (1.9 KB)
  📄 middleware.ts  (2.6 KB)
  📄 next-env.d.ts  (0.2 KB)
  📄 next.config.mjs  (0.2 KB)
  📄 package-lock.json  (269.8 KB)
  📄 package.json  (1.1 KB)
  📄 postcss.config.mjs  (0.1 KB)
  📄 railway.toml  (0.1 KB)
  📄 tailwind.config.ts  (1.0 KB)
  📄 test-results.txt  (8.2 KB)
  📄 tsconfig.json  (0.6 KB)
  📄 tsconfig.tsbuildinfo  (182.9 KB)
  📄 vitest.config.ts  (0.6 KB)
📁 .agents/
  📁 .agents\skills/
    📁 .agents\skills\accessibility/
      📄 SKILL.md  (16.4 KB)
    📁 .agents\skills\antigravity/
      📄 SKILL.md  (14.6 KB)
    📁 .agents\skills\brand-scraper/
      📄 SKILL.md  (9.7 KB)
    📁 .agents\skills\claude-api/
      📄 SKILL.md  (15.5 KB)
    📁 .agents\skills\coding-standards/
      📄 SKILL.md  (12.7 KB)
    📁 .agents\skills\error-handling/
      📄 SKILL.md  (16.3 KB)
    📁 .agents\skills\fault-logger/
      📄 SKILL.md  (1.7 KB)
    📁 .agents\skills\github/
      📄 SKILL.md  (9.6 KB)
    📁 .agents\skills\legal/
      📄 SKILL.md  (9.8 KB)
    📁 .agents\skills\memory-writer/
      📄 SKILL.md  (1.5 KB)
    📁 .agents\skills\mobile-responsive/
      📄 SKILL.md  (15.2 KB)
    📁 .agents\skills\municipal-law/
      📄 SKILL.md  (12.9 KB)
    📁 .agents\skills\nextjs/
      📄 SKILL.md  (15.9 KB)
    📁 .agents\skills\nextjs-auth-middleware/
      📄 SKILL.md  (16.4 KB)
    📁 .agents\skills\payfast/
      📄 SKILL.md  (14.5 KB)
    📁 .agents\skills\payfast-security/
      📄 SKILL.md  (15.2 KB)
    📁 .agents\skills\pdf-parse/
      📄 SKILL.md  (12.1 KB)
    📁 .agents\skills\popia/
      📄 SKILL.md  (14.7 KB)
    📁 .agents\skills\rag-pgvector/
      📄 SKILL.md  (12.1 KB)
    📁 .agents\skills\railway/
      📄 SKILL.md  (10.8 KB)
    📁 .agents\skills\resend/
      📄 SKILL.md  (13.2 KB)
    📁 .agents\skills\sa-prescription/
      📄 SKILL.md  (12.5 KB)
    📁 .agents\skills\security/
      📄 SKILL.md  (15.5 KB)
    📁 .agents\skills\security-preflight/
      📄 SKILL.md  (1.9 KB)
    📁 .agents\skills\skill-creator/
      📄 SKILL.md  (21.5 KB)
    📁 .agents\skills\supabase/
      📄 SKILL.md  (17.8 KB)
    📁 .agents\skills\supabase-rls/
      📄 SKILL.md  (12.9 KB)
    📁 .agents\skills\tailwind/
      📄 SKILL.md  (13.5 KB)
    📁 .agents\skills\testing/
      📄 SKILL.md  (18.6 KB)
    📁 .agents\skills\ui-design-system/
      📄 SKILL.md  (16.7 KB)
  📁 .agents\workflows/
    📄 pause.md  (0.8 KB)
    📄 project-init.md  (3.0 KB)
    📄 start.md  (2.7 KB)
📁 .claude/
  📄 settings.local.json  (0.1 KB)
📁 AGENT_BRAIN/
  📄 ARCHITECTURE.md  (37.1 KB)
  📄 FAULT_LOG.md  (0.5 KB)
  📄 PROJECT_MEMORY.md  (1.9 KB)
  📄 STATE.md  (0.6 KB)
  📄 TECH_STACK.md  (0.1 KB)
  📁 AGENT_BRAIN\sessions/
    📄 .gitkeep  (0.0 KB)
    📄 2026-03-26.md  (0.9 KB)
    📄 2026-03-27.md  (0.6 KB)
    📄 2026-03-28.md  (7.2 KB)
    📄 2026-03-29.md  (0.3 KB)
    📄 2026-03-30.md  (1.1 KB)
📁 app/
  📄 error.tsx  (0.7 KB)
  📄 favicon.ico  (25.3 KB)
  📄 globals.css  (2.5 KB)
  📄 layout.tsx  (1.5 KB)
  📄 not-found.tsx  (0.5 KB)
  📁 app\(app)/
    📄 .gitkeep  (0.0 KB)
    📄 error.tsx  (0.7 KB)
    📄 layout.tsx  (0.9 KB)
    📁 app\(app)\analysis/
      📁 app\(app)\analysis\[id]/
        📄 page.tsx  (14.2 KB)
    📁 app\(app)\case/
      📁 app\(app)\case\[id]/
        📄 page.tsx  (8.6 KB)
    📁 app\(app)\dashboard/
      📄 page.tsx  (3.7 KB)
    📁 app\(app)\letter/
      📁 app\(app)\letter\[id]/
        📄 page.tsx  (19.1 KB)
    📁 app\(app)\onboarding/
      📄 page.tsx  (1.9 KB)
    📁 app\(app)\success/
      📄 page.tsx  (5.4 KB)
    📁 app\(app)\upload/
      📄 page.tsx  (0.8 KB)
  📁 app\(auth)/
    📄 .gitkeep  (0.0 KB)
    📄 layout.tsx  (0.5 KB)
    📁 app\(auth)\login/
      📄 page.tsx  (0.8 KB)
    📁 app\(auth)\signup/
      📄 page.tsx  (0.8 KB)
    📁 app\(auth)\verify-email/
      📄 page.tsx  (1.3 KB)
  📁 app\(public)/
    📄 .gitkeep  (0.0 KB)
    📄 error.tsx  (0.6 KB)
    📄 layout.tsx  (0.4 KB)
    📄 page.tsx  (1.2 KB)
    📁 app\(public)\contact/
      📄 page.tsx  (5.7 KB)
    📁 app\(public)\popia/
      📄 page.tsx  (12.0 KB)
    📁 app\(public)\privacy/
      📄 page.tsx  (15.4 KB)
    📁 app\(public)\terms/
      📄 page.tsx  (11.0 KB)
  📁 app\actions/
    📄 auth.ts  (1.1 KB)
  📁 app\api/
    📄 .gitkeep  (0.0 KB)
    📁 app\api\analyse/
      📄 route.ts  (6.7 KB)
    📁 app\api\cases/
      📁 app\api\cases\[id]/
        📄 route.ts  (3.3 KB)
        📁 app\api\cases\[id]\letter/
          📄 route.ts  (1.9 KB)
    📁 app\api\generate-letter/
      📄 route.ts  (4.9 KB)
    📁 app\api\payfast/
      📁 app\api\payfast\tokenise/
        📄 route.ts  (1.2 KB)
    📁 app\api\send-letter/
      📄 route.ts  (4.6 KB)
    📁 app\api\upload/
      📄 route.ts  (3.5 KB)
    📁 app\api\user/
      📁 app\api\user\delete/
        📄 route.ts  (2.1 KB)
      📁 app\api\user\export/
        📄 route.ts  (1.9 KB)
    📁 app\api\webhooks/
      📁 app\api\webhooks\payfast/
        📄 route.ts  (5.8 KB)
      📁 app\api\webhooks\resend-inbound/
        📄 route.ts  (4.2 KB)
  📁 app\auth/
    📁 app\auth\callback/
      📄 route.ts  (0.8 KB)
  📁 app\fonts/
    📄 GeistMonoVF.woff  (66.3 KB)
    📄 GeistVF.woff  (64.7 KB)
📁 components/
  📁 components\analysis/
    📄 .gitkeep  (0.0 KB)
  📁 components\cases/
    📄 .gitkeep  (0.0 KB)
    📄 ConfirmResolution.tsx  (4.0 KB)
  📁 components\dashboard/
    📄 CaseCard.tsx  (3.3 KB)
    📄 CaseTimeline.tsx  (4.6 KB)
  📁 components\forms/
    📄 .gitkeep  (0.0 KB)
    📄 LoginForm.tsx  (2.9 KB)
    📄 OnboardingForm.tsx  (4.1 KB)
    📄 SignupForm.tsx  (6.8 KB)
    📄 UploadForm.tsx  (3.1 KB)
  📁 components\landing/
    📄 CtaSection.tsx  (1.9 KB)
    📄 FaqSection.tsx  (2.8 KB)
    📄 HeroSection.tsx  (4.2 KB)
    📄 HowItWorksSection.tsx  (2.9 KB)
    📄 RealCasesSection.tsx  (3.9 KB)
    📄 StatsSection.tsx  (2.0 KB)
    📄 TestimonialsSection.tsx  (3.4 KB)
    📄 TrustBar.tsx  (3.0 KB)
    📄 index.ts  (0.4 KB)
  📁 components\layout/
    📄 .gitkeep  (0.0 KB)
    📄 AppNav.tsx  (1.3 KB)
    📄 CookieBanner.tsx  (1.7 KB)
    📄 Footer.tsx  (2.2 KB)
    📄 Nav.tsx  (2.6 KB)
    📄 SkipLink.tsx  (0.4 KB)
    📄 index.ts  (0.1 KB)
  📁 components\ui/
    📄 .gitkeep  (0.0 KB)
    📄 Button.tsx  (3.4 KB)
    📄 ErrorCard.tsx  (1.7 KB)
    📄 FaqAccordion.tsx  (2.3 KB)
    📄 FileDropZone.tsx  (5.5 KB)
    📄 ScrollReveal.tsx  (1.0 KB)
    📄 index.ts  (0.1 KB)
📁 coverage/
  📄 lcov.info  (2.0 KB)
  📁 coverage\lcov-report/
    📄 base.css  (5.3 KB)
    📄 block-navigation.js  (2.6 KB)
    📄 favicon.png  (0.4 KB)
    📄 index.html  (4.3 KB)
    📄 prescription.ts.html  (41.9 KB)
    📄 prettify.css  (0.7 KB)
    📄 prettify.js  (17.2 KB)
    📄 sort-arrow-sprite.png  (0.1 KB)
    📄 sorter.js  (6.6 KB)
📁 directives/
  📄 architecture_sync.md  (2.7 KB)
  📄 best_practices.md  (1.3 KB)
  📄 error_fix.md  (4.2 KB)
  📄 example_directive.md  (0.5 KB)
  📄 phase_3_security_hardening.md  (1.3 KB)
  📄 planning.md  (5.2 KB)
  📄 self_annealing.md  (1.2 KB)
  📄 standard_directive_template.md  (0.7 KB)
📁 execution/
  📄 example_script.py  (0.6 KB)
  📄 scan_architecture.py  (12.7 KB)
  📄 scrape_brand_firecrawl.py  (3.2 KB)
  📄 script_boiler_plate.py  (1.5 KB)
📁 hooks/
  📄 use-scroll-reveal.ts  (0.8 KB)
📁 lib/
  📁 lib\claude/
    📄 .gitkeep  (0.0 KB)
    📄 analyse-bill.ts  (6.8 KB)
    📄 client.ts  (0.3 KB)
    📄 generate-letter.ts  (3.9 KB)
    📄 vision.ts  (1.2 KB)
  📁 lib\municipalities/
    📄 .gitkeep  (0.0 KB)
  📁 lib\payfast/
    📄 .gitkeep  (0.0 KB)
    📄 charge.ts  (3.6 KB)
    📄 idempotency.ts  (0.3 KB)
    📄 security-log.ts  (0.6 KB)
    📄 tokenise.ts  (2.0 KB)
    📄 validate.ts  (3.0 KB)
  📁 lib\pdf/
    📄 .gitkeep  (0.0 KB)
    📄 parse.ts  (1.9 KB)
  📁 lib\rag/
    📄 legislation.ts  (2.3 KB)
  📁 lib\resend/
    📄 .gitkeep  (0.0 KB)
    📄 client.ts  (0.3 KB)
    📄 inbound.ts  (1.6 KB)
    📄 send-dispute.ts  (1.3 KB)
  📁 lib\supabase/
    📄 .gitkeep  (0.0 KB)
    📄 admin.ts  (0.6 KB)
    📄 client.ts  (0.2 KB)
    📄 server.ts  (0.7 KB)
  📁 lib\validators/
    📄 .gitkeep  (0.0 KB)
    📄 prescription.test.ts  (13.4 KB)
    📄 prescription.ts  (9.8 KB)
📁 public/
  📄 .gitkeep  (0.0 KB)
  📄 logo.svg  (1.8 KB)
📁 scripts/
  📄 generate_test_bill.py  (10.9 KB)
  📄 test-bill.pdf  (4.4 KB)
📁 supabase/
  📁 supabase\migrations/
    📄 .gitkeep  (0.0 KB)
    📄 001_initial_schema.sql  (3.3 KB)
    📄 002_storage_bucket.sql  (1.0 KB)
    📄 003_case_events.sql  (0.8 KB)
    📄 004_popia_fields.sql  (0.4 KB)
📁 tests/
  📄 setup.ts  (0.9 KB)
📁 types/
  📄 .gitkeep  (0.0 KB)
  📄 analysis.ts  (0.6 KB)
  📄 index.ts  (5.3 KB)
```

### Directive Goals

| Directive | Goal |
|---|---|
| `architecture_sync.md` | Keep `AGENT_BRAIN/ARCHITECTURE.md` accurate and current as the single source of truth for the entire project. |
| `best_practices.md` | (no goal section found) |
| `error_fix.md` | Ensure all error diagnosis and fix implementation is architecturally aligned before a single line of code is written or  |
| `example_directive.md` | The goal is to generate a greeting message and save it to a file in the `.tmp/` directory. |
| `phase_3_security_hardening.md` | (no goal section found) |
| `planning.md` | Ensure all new features, changes, and refactors are architecturally aligned and explicitly approved before any implement |
| `self_annealing.md` | (no goal section found) |
| `standard_directive_template.md` | A clear, one-sentence description of what this directive achieves. |

### Execution Scripts

| Script | Purpose |
|---|---|
| `example_script.py` | (no docstring found) |
| `scan_architecture.py` | Architecture Scanner — Deterministic filesystem scanner for BillDog. |
| `scrape_brand_firecrawl.py` | (no docstring found) |
| `script_boiler_plate.py` | (no docstring found) |

### Environment Variables (names only)

- `FIRECRAWL_API_KEY`

## SECTION 11 — DESIGN DECISIONS LOG

> Human/agent authored. Preserved across scanner runs. Add entries — never delete.

**DD-001** | 2026-03-27 | Success fee model (20%)
Rationale: Zero friction for user acquisition. "Found money" psychology means 20% is readily accepted. Validated by US medical bill service Billdog (different market, same model). Card-on-file via PayFast avoids trust problem of post-resolution invoicing.

**DD-002** | 2026-03-27 | Next.js over plain HTML
Rationale: Landing page prototype is HTML but production build uses Next.js for SSR/SEO, API routes, auth middleware, and future scalability. Railway deployment supports Node.js natively.

**DD-003** | 2026-03-27 | Human-in-the-loop for v1
Rationale: v1 requires manual review of municipality responses. v2 will add AI classification of responses. This reduces risk of incorrect escalation and builds training data for v2.

**DD-004** | 2026-03-27 | No fake testimonials
Rationale: Consumer Protection Act prohibits misleading advertising. Real cases sourced from IOL, Daily Maverick, and other SA publications used instead. Framed as "Real Cases" not "Customer Results".

**DD-005** | 2026-03-27 | Disclose AI use proactively
Rationale: "AI-powered analysis, human-reviewed letters" disclosed as a feature not a disclaimer. Builds trust, differentiates from manual competitors, protects against challenge of AI-generated outputs.

**DD-006** | 2026-03-27 | Resend for email (not SendGrid)
Rationale: Simpler API, generous free tier, better developer experience, no legacy bloat. Sufficient for dispute letter volume at launch.

**DD-007** | 2026-03-27 | Legislation RAG via pgvector
Rationale: Every dispute letter must cite correct legislation. RAG ensures letters are legally accurate and specific. Same architecture used successfully in prior project (Pinecone/Voyage AI). Using Supabase pgvector keeps stack simpler — one less external service.

---

## SECTION 12 — CONSTRAINTS & HARD RULES

> These must never be violated. Add constraints — never remove without user approval.

1. **Never store raw card numbers.** PayFast tokenisation only.
2. **Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.** Server-side only.
3. **Never expose ANTHROPIC_API_KEY to the browser.** Server-side only.
4. **All Supabase tables must have RLS enabled.** No exceptions.
5. **Never send fake or fabricated dispute letters.** All letters must be based on actual bill analysis.
6. **Never claim legal outcomes we cannot guarantee.** Copy must say "we'll fight for you" not "guaranteed recovery".
7. **Bill files stored in Supabase Storage must be private.** Never publicly accessible URLs.
8. **Prescription rule: electricity/water errors older than 3 years cannot be disputed.** App must warn user if bill period is outside this window.
9. **Never use testimonials that aren't real.** Use sourced case studies only.
10. **Mobile-first always.** Every component must be built mobile-first and tested at 320px.
11. **All mutations go through API routes.** No direct Supabase writes from the browser for sensitive operations.
12. **PayFast charges only trigger on confirmed resolution.** Never charge speculatively.
