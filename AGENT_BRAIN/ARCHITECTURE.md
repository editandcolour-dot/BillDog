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
| Revenue Model | 15% success fee on recovered funds. Zero upfront cost to user. |
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
│       ├── cron/escalate/route.ts   ← POST: nightly escalation cron (Railway)
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
│   ├── escalation/
│   │   ├── stage-config.ts          ← 7-stage escalation config + templates
│   │   └── escalate-dispute.ts      ← Core escalation engine
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
fee_charged     numeric(12,2)                 -- 15% of amount_recovered
escalation_stage  int DEFAULT 1               -- current stage (1-7)
next_action_at    timestamptz                  -- when next escalation fires
last_escalation_at timestamptz                -- prevents double-sends
escalation_history jsonb DEFAULT '[]'          -- audit trail of all sends
dispute_type      text                         -- water|electricity|rates|refuse|sewerage|other
promo_code        text                         -- applied promo code string
promo_applied     boolean DEFAULT false
promo_free        boolean DEFAULT false
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### `promo_codes`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
code            text UNIQUE NOT NULL
max_free        integer NOT NULL DEFAULT 10
resolved_count  integer NOT NULL DEFAULT 0
active          boolean DEFAULT true
created_at      timestamptz DEFAULT now()
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

### `cron_errors`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
case_id         uuid REFERENCES cases(id) ON DELETE SET NULL
stage           int
error           text NOT NULL
metadata        jsonb
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
| How It Works page | complete | app/(public)/how-it-works/ | 5-step process, hero, trust bar, CTA |
| Pricing page | complete | app/(public)/pricing/ | Success fee card, worked example, comparison table |
| Real Cases page | complete | app/(public)/real-cases/ | 6 sourced news stories, disclaimer |
| FAQ page | complete | app/(public)/faq/ | 4 categories: General, Pricing, Legal, Privacy |
| About page | complete | app/(public)/about/ | Mission, AI transparency, values |
| Contact page | complete | app/(public)/contact/ api/contact/ | Form wired to Resend + contact cards |
| Privacy Policy | complete | app/(public)/privacy/ | POPIA compliant |
| Terms of Service | complete | app/(public)/terms/ | |
| POPIA Statement | complete | app/(public)/popia/ | |
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
| PayFast card on file | complete | lib/payfast/ api/payfast/tokenise/ app/(app)/letter/[id]/ | Tokenise pre-send, charge on resolution |
| Legislation RAG | complete | supabase/ (pgvector) | Voyage AI embeddings |
| Success page | complete | app/(app)/success/ | |
| Settings page | planned | app/(app)/settings/ | |
| PayFast webhook | complete | api/webhooks/payfast/ | ITN handler with signature validation |
| Escalation cron | complete | api/cron/escalate/ lib/escalation/ | 7-stage automated follow-up engine, Railway cron |
| Promo codes     | complete | api/cases/[id]/promo/ | FIRSTTEN logic, bypasses standard fee |
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

> Last scanned: 2026-05-09T20:09:53.914659+00:00
> Project root: `E:\BillDog`

### Directory Inventory

```
📁 (root)/
  📄 .env  (0.1 KB)
  📄 .env.local  (1.6 KB)
  📄 .env.local.example  (0.9 KB)
  📄 .eslintrc.json  (0.1 KB)
  📄 .gitignore  (0.4 KB)
  📄 .prettierrc  (0.2 KB)
  📄 2425.txt  (22.3 KB)
  📄 2425_water.pdf  (1460.5 KB)
  📄 2526_water.pdf  (1465.0 KB)
  📄 AGENTS.md  (7.6 KB)
  📄 CLAUDE.md  (7.7 KB)
  📄 TECH_DEBT.md  (0.3 KB)
  📄 build-error.log  (2.4 KB)
  📄 build-log.txt  (1.6 KB)
  📄 build.log  (1.9 KB)
  📄 corpus-test-summary.md  (173.5 KB)
  📄 e2e_phase2_test.mjs  (17.2 KB)
  📄 middleware.ts  (2.9 KB)
  📄 mismatch.json  (13.1 KB)
  📄 mock-server.js  (0.2 KB)
  📄 next-env.d.ts  (0.2 KB)
  📄 next.config.mjs  (1.6 KB)
  📄 nixpacks.toml  (0.4 KB)
  📄 out.log  (428.8 KB)
  📄 package-lock.json  (307.2 KB)
  📄 package.json  (1.4 KB)
  📄 payfast_response.html  (12.6 KB)
  📄 postcss.config.mjs  (0.1 KB)
  📄 railway.toml  (0.1 KB)
  📄 railway_test.js  (1.2 KB)
  📄 scrape.js  (0.4 KB)
  📄 scrape2.js  (0.4 KB)
  📄 scratch.js  (1.8 KB)
  📄 setup_test_data.js  (2.0 KB)
  📄 tailwind.config.ts  (1.0 KB)
  📄 test-parser.ts  (0.1 KB)
  📄 test-results.txt  (8.2 KB)
  📄 testRegex.js  (0.2 KB)
  📄 test_bill.pdf  (0.6 KB)
  📄 test_payfast_dryrun.js  (2.7 KB)
  📄 test_payfast_no_passphrase.js  (2.4 KB)
  📄 test_payfast_order.js  (2.5 KB)
  📄 test_payfast_permutations.js  (2.3 KB)
  📄 test_payfast_prod.js  (2.3 KB)
  📄 test_pf.html  (12.7 KB)
  📄 test_pf.js  (1.8 KB)
  📄 test_seed.js  (1.6 KB)
  📄 tsconfig.json  (0.7 KB)
  📄 tsconfig.tsbuildinfo  (271.4 KB)
  📄 vercel.json  (0.1 KB)
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
  📄 settings.local.json  (1.7 KB)
📁 AGENT_BRAIN/
  📄 ARCHITECTURE.md  (60.6 KB)
  📄 FAULT_LOG.md  (5.1 KB)
  📄 MEMORY_INDEX.md  (0.8 KB)
  📄 PROJECT_MEMORY.md  (2.9 KB)
  📄 STATE.md  (0.9 KB)
  📄 TECH_STACK.md  (0.1 KB)
  📄 payfast-diagnostic-memory.md  (4.1 KB)
  📁 AGENT_BRAIN\sessions/
    📄 .gitkeep  (0.0 KB)
    📄 2026-03-26.md  (0.9 KB)
    📄 2026-03-27.md  (0.6 KB)
    📄 2026-03-28.md  (7.2 KB)
    📄 2026-03-29.md  (0.3 KB)
    📄 2026-03-30.md  (1.1 KB)
    📄 2026-03-31.md  (3.7 KB)
    📄 2026-04-01.md  (1.2 KB)
    📄 2026-04-02.md  (1.5 KB)
    📄 2026-04-03.md  (3.7 KB)
    📄 2026-04-04.md  (0.9 KB)
    📄 2026-04-05.md  (0.7 KB)
    📄 2026-04-06.md  (0.2 KB)
    📄 2026-04-15.md  (1.4 KB)
    📄 2026-04-16.md  (1.8 KB)
    📄 2026-04-18.md  (1.7 KB)
    📄 2026-04-20.md  (1.7 KB)
    📄 2026-04-21.md  (0.6 KB)
    📄 2026-04-22.md  (0.4 KB)
    📄 2026-04-23.md  (0.3 KB)
    📄 2026-04-24.md  (1.3 KB)
📁 app/
  📄 error.tsx  (0.7 KB)
  📄 favicon.ico  (25.3 KB)
  📄 globals.css  (2.5 KB)
  📄 layout.tsx  (1.8 KB)
  📄 not-found.tsx  (0.5 KB)
  📄 robots.ts  (0.4 KB)
  📄 sitemap.ts  (1.5 KB)
  📁 app\(app)/
    📄 .gitkeep  (0.0 KB)
    📄 error.tsx  (0.7 KB)
    📄 layout.tsx  (0.9 KB)
    📁 app\(app)\account/
      📄 page.tsx  (26.5 KB)
    📁 app\(app)\analysis/
      📁 app\(app)\analysis\[id]/
        📄 page.tsx  (18.0 KB)
    📁 app\(app)\case/
      📁 app\(app)\case\[id]/
        📄 page.tsx  (11.0 KB)
        📁 app\(app)\case\[id]\verify/
          📄 page.tsx  (3.3 KB)
    📁 app\(app)\dashboard/
      📄 page.tsx  (3.7 KB)
    📁 app\(app)\letter/
      📁 app\(app)\letter\[id]/
        📄 page.tsx  (20.3 KB)
    📁 app\(app)\onboarding/
      📄 page.tsx  (1.9 KB)
      📁 app\(app)\onboarding\auto-fetch/
        📄 page.tsx  (2.0 KB)
    📁 app\(app)\settings/
      📄 page.tsx  (0.2 KB)
    📁 app\(app)\success/
      📄 page.tsx  (5.4 KB)
    📁 app\(app)\upload/
      📄 page.tsx  (1.3 KB)
  📁 app\(auth)/
    📄 .gitkeep  (0.0 KB)
    📄 layout.tsx  (0.8 KB)
    📁 app\(auth)\login/
      📄 page.tsx  (0.8 KB)
    📁 app\(auth)\signup/
      📄 page.tsx  (0.9 KB)
    📁 app\(auth)\verify-email/
      📄 page.tsx  (1.3 KB)
  📁 app\(public)/
    📄 .gitkeep  (0.0 KB)
    📄 error.tsx  (0.6 KB)
    📄 layout.tsx  (0.4 KB)
    📄 page.tsx  (1.6 KB)
    📁 app\(public)\about/
      📄 page.tsx  (8.3 KB)
    📁 app\(public)\blog/
      📁 app\(public)\blog\estimated-readings-south-africa/
        📄 page.tsx  (2.2 KB)
      📁 app\(public)\blog\how-to-dispute-municipal-bill-south-africa/
        📄 page.tsx  (7.8 KB)
      📁 app\(public)\blog\how-to-read-municipal-bill/
        📄 page.tsx  (2.1 KB)
      📁 app\(public)\blog\municipal-billing-errors-south-africa/
        📄 page.tsx  (2.0 KB)
      📁 app\(public)\blog\municipality-complaint-not-resolved/
        📄 page.tsx  (2.1 KB)
      📁 app\(public)\blog\municipality-disconnection-rights/
        📄 page.tsx  (2.2 KB)
      📁 app\(public)\blog\rates-valuation-dispute/
        📄 page.tsx  (2.1 KB)
      📁 app\(public)\blog\section-102-municipal-systems-act/
        📄 page.tsx  (2.3 KB)
      📁 app\(public)\blog\water-bill-overcharge-south-africa/
        📄 page.tsx  (2.0 KB)
    📁 app\(public)\contact/
      📄 layout.tsx  (0.4 KB)
      📄 page.tsx  (9.7 KB)
    📁 app\(public)\disputes/
      📁 app\(public)\disputes\[municipality]/
        📄 page.tsx  (8.9 KB)
    📁 app\(public)\faq/
      📄 page.tsx  (9.9 KB)
    📁 app\(public)\how-it-works/
      📄 page.tsx  (8.8 KB)
    📁 app\(public)\popia/
      📄 page.tsx  (12.0 KB)
    📁 app\(public)\pricing/
      📄 page.tsx  (10.2 KB)
    📁 app\(public)\privacy/
      📄 page.tsx  (17.9 KB)
    📁 app\(public)\real-cases/
      📄 page.tsx  (7.3 KB)
    📁 app\(public)\terms/
      📄 page.tsx  (11.0 KB)
  📁 app\actions/
    📄 auth.ts  (1.1 KB)
  📁 app\api/
    📄 .gitkeep  (0.0 KB)
    📁 app\api\analyse/
      📄 route.ts  (7.3 KB)
    📁 app\api\analyse-multi/
      📄 route.ts  (12.9 KB)
    📁 app\api\autofetch/
      📁 app\api\autofetch\consent/
        📄 route.ts  (2.9 KB)
      📁 app\api\autofetch\credentials/
        📄 route.ts  (8.4 KB)
        📁 app\api\autofetch\credentials\[id]/
          📄 route.ts  (2.9 KB)
      📁 app\api\autofetch\jobs/
        📄 route.ts  (1.8 KB)
        📁 app\api\autofetch\jobs\[id]/
          📁 app\api\autofetch\jobs\[id]\retry/
            📄 route.ts  (3.8 KB)
      📁 app\api\autofetch\status/
        📄 route.ts  (3.1 KB)
      📁 app\api\autofetch\worker/
        📁 app\api\autofetch\worker\backfill/
          📄 route.ts  (14.0 KB)
        📁 app\api\autofetch\worker\discovery/
          📄 route.ts  (9.4 KB)
        📁 app\api\autofetch\worker\fetch-latest/
          📄 route.ts  (14.5 KB)
        📁 app\api\autofetch\worker\monthly/
          📄 route.ts  (3.0 KB)
        📁 app\api\autofetch\worker\monthly-alert/
          📄 route.ts  (0.7 KB)
    📁 app\api\cases/
      📁 app\api\cases\[id]/
        📄 route.ts  (9.0 KB)
        📁 app\api\cases\[id]\capture-id/
          📄 route.ts  (1.5 KB)
        📁 app\api\cases\[id]\letter/
          📄 route.ts  (2.0 KB)
        📁 app\api\cases\[id]\verify/
          📄 route.ts  (4.2 KB)
      📁 app\api\cases\create-from-vision/
        📄 route.ts  (3.4 KB)
      📁 app\api\cases\submit-id/
        📄 route.ts  (2.2 KB)
    📁 app\api\consent/
      📁 app\api\consent\log/
        📄 route.ts  (1.7 KB)
    📁 app\api\contact/
      📄 route.ts  (2.6 KB)
    📁 app\api\cron/
      📁 app\api\cron\bill-2-reminder/
        📄 route.ts  (2.1 KB)
      📁 app\api\cron\delete-ids/
        📄 route.ts  (1.2 KB)
      📁 app\api\cron\disclosure-request/
        📄 route.ts  (3.3 KB)
      📁 app\api\cron\escalate/
        📄 route.ts  (2.2 KB)
      📁 app\api\cron\escalation/
        📄 route.ts  (0.8 KB)
      📁 app\api\cron\seo-report/
        📄 route.ts  (2.9 KB)
      📁 app\api\cron\social-monitor/
        📄 route.ts  (0.4 KB)
      📁 app\api\cron\tariff-reminder/
        📄 route.ts  (1.1 KB)
    📁 app\api\extract-vision/
      📄 route.ts  (3.0 KB)
    📁 app\api\generate-letter/
      📄 route.ts  (7.2 KB)
    📁 app\api\payfast/
      📁 app\api\payfast\test-form/
        📄 route.ts  (7.3 KB)
      📁 app\api\payfast\tokenise/
        📄 route.ts  (2.7 KB)
    📁 app\api\send-letter/
      📄 route.ts  (7.7 KB)
    📁 app\api\upload/
      📄 route.ts  (3.7 KB)
    📁 app\api\upload-multi/
      📄 route.ts  (4.3 KB)
    📁 app\api\user/
      📁 app\api\user\delete/
        📄 route.ts  (2.8 KB)
      📁 app\api\user\export/
        📄 route.ts  (1.9 KB)
      📁 app\api\user\mandate/
        📄 route.ts  (2.9 KB)
      📁 app\api\user\profile/
        📄 route.ts  (1.1 KB)
    📁 app\api\webhooks/
      📁 app\api\webhooks\payfast/
        📄 route.ts  (6.9 KB)
      📁 app\api\webhooks\resend-inbound/
        📄 route.ts  (6.2 KB)
  📁 app\auth/
    📁 app\auth\callback/
      📄 route.ts  (0.8 KB)
  📁 app\coverage/
    📄 page.tsx  (3.4 KB)
  📁 app\fonts/
    📄 GeistMonoVF.woff  (66.3 KB)
    📄 GeistVF.woff  (64.7 KB)
  📁 app\payfast-test-dom/
    📄 layout.tsx  (0.2 KB)
    📄 page.tsx  (1.5 KB)
📁 bin/
  📄 discover.ts  (1.6 KB)
📁 components/
  📁 components\analysis/
    📄 .gitkeep  (0.0 KB)
  📁 components\blog/
    📄 BlogLayout.tsx  (2.3 KB)
  📁 components\cases/
    📄 .gitkeep  (0.0 KB)
    📄 CaptureIdModal.tsx  (3.0 KB)
    📄 ConfirmResolution.tsx  (4.0 KB)
    📄 DeleteCaseButton.tsx  (2.9 KB)
    📄 DisputeGateBanner.tsx  (2.0 KB)
    📄 EscalationTimeline.tsx  (6.0 KB)
    📄 PublicProtectorModal.tsx  (5.7 KB)
  📁 components\dashboard/
    📄 CaseCard.tsx  (3.4 KB)
    📄 CaseTimeline.tsx  (4.6 KB)
  📁 components\forms/
    📄 .gitkeep  (0.0 KB)
    📄 AutoFetchForm.tsx  (11.1 KB)
    📄 CameraCapture.tsx  (11.0 KB)
    📄 LoginForm.tsx  (2.9 KB)
    📄 MultiFileUploader.tsx  (12.4 KB)
    📄 OnboardingForm.tsx  (4.1 KB)
    📄 SignupForm.tsx  (10.0 KB)
    📄 UploadFlow.tsx  (2.9 KB)
    📄 UploadForm.tsx  (3.1 KB)
  📁 components\landing/
    📄 CtaSection.tsx  (1.9 KB)
    📄 FaqSection.tsx  (2.8 KB)
    📄 HeroSection.tsx  (4.3 KB)
    📄 HowItWorksSection.tsx  (2.9 KB)
    📄 RealCasesSection.tsx  (3.9 KB)
    📄 StatsSection.tsx  (2.2 KB)
    📄 TrustBar.tsx  (3.0 KB)
    📄 index.ts  (0.3 KB)
  📁 components\layout/
    📄 .gitkeep  (0.0 KB)
    📄 AppNav.tsx  (1.9 KB)
    📄 CookieBanner.tsx  (1.7 KB)
    📄 Footer.tsx  (2.4 KB)
    📄 Nav.tsx  (2.8 KB)
    📄 SkipLink.tsx  (0.4 KB)
    📄 index.ts  (0.1 KB)
  📁 components\reports/
    📄 BillTimeline.tsx  (2.8 KB)
    📄 CrossAnalysisReport.tsx  (3.0 KB)
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
📁 data/
  📁 data\contacts/
    📄 00_README.md  (1.8 KB)
    📄 06_ward_councillor_lookup_instructions.md  (1.9 KB)
    📄 municipalities_master.csv  (19.9 KB)
    📄 public_protector_contacts.csv  (1.5 KB)
    📄 ward_councillors_BCM.csv  (3.7 KB)
    📄 ward_councillors_KSD.csv  (0.4 KB)
    📄 ward_councillors_Overstrand.csv  (1.1 KB)
📁 directives/
  📄 architecture_sync.md  (2.7 KB)
  📄 best_practices.md  (1.3 KB)
  📄 error_fix.md  (4.2 KB)
  📄 example_directive.md  (0.5 KB)
  📄 phase_3_security_hardening.md  (1.3 KB)
  📄 planning.md  (5.2 KB)
  📄 self_annealing.md  (1.2 KB)
  📄 semantic_search.md  (0.5 KB)
  📄 seo_automation.md  (0.5 KB)
  📄 standard_directive_template.md  (0.7 KB)
📁 docs/
  📄 credential-key-rotation.md  (3.2 KB)
  📄 v5-reconciliation-rules.md  (6.1 KB)
📁 execution/
  📄 example_script.py  (0.6 KB)
  📄 index_codebase.py  (2.6 KB)
  📄 requirements.txt  (0.0 KB)
  📄 scan_architecture.py  (12.7 KB)
  📄 scrape_brand_firecrawl.py  (3.2 KB)
  📄 script_boiler_plate.py  (1.5 KB)
  📄 semantic_search.py  (1.4 KB)
  📄 seo_optimizer.py  (1.3 KB)
📁 hooks/
  📄 use-scroll-reveal.ts  (0.8 KB)
📁 lib/
  📄 env.ts  (0.4 KB)
  📄 rate-limit.ts  (1.2 KB)
  📄 social-monitor.ts  (4.8 KB)
  📁 lib\autofetch/
    📄 alert.ts  (2.4 KB)
    📄 revocation.ts  (1.2 KB)
  📁 lib\checks/
    📄 universalChecks.ts  (6.1 KB)
  📁 lib\claude/
    📄 .gitkeep  (0.0 KB)
    📄 analyse-bill.ts  (12.4 KB)
    📄 analyse-cross-bill.ts  (4.6 KB)
    📄 analyse-vision.ts  (3.4 KB)
    📄 client.ts  (0.3 KB)
    📄 compare-bills.ts  (2.6 KB)
    📄 generate-letter.ts  (6.2 KB)
    📄 grounded-prompt.ts  (3.0 KB)
    📄 parse-municipality-response.ts  (2.1 KB)
    📄 production-pipeline-e2e.test.ts  (4.9 KB)
    📄 vision.ts  (1.2 KB)
  📁 lib\constants/
    📄 fees.test.ts  (0.8 KB)
    📄 fees.ts  (0.6 KB)
  📁 lib\crypto/
    📄 credentials.test.ts  (4.6 KB)
    📄 credentials.ts  (3.1 KB)
  📁 lib\data/
    📄 seo-municipalities.ts  (11.9 KB)
  📁 lib\discovery/
    📄 agent.ts  (32.7 KB)
    📄 dom-utils.ts  (2.9 KB)
    📄 prompt.ts  (3.6 KB)
  📁 lib\escalation/
    📄 contactLookup.ts  (2.7 KB)
    📄 escalate-dispute.ts  (17.3 KB)
    📄 escalationEngine.ts  (8.4 KB)
    📄 letterGenerator.ts  (5.9 KB)
    📄 stage-config.ts  (12.7 KB)
    📄 wardCouncillorLookup.ts  (3.4 KB)
  📁 lib\letters/
    📄 verification-block.ts  (1.2 KB)
  📁 lib\municipalities/
    📄 .gitkeep  (0.0 KB)
    📄 sa-metros.json  (2.1 KB)
    📄 sa-metros.test.ts  (2.2 KB)
    📄 sa-metros.ts  (1.6 KB)
  📁 lib\parsers/
    📄 coct-bill-parser-balance.test.ts  (3.8 KB)
    📄 coct-bill-parser-line-balance.test.ts  (6.0 KB)
    📄 coct-bill-parser.test.ts  (4.6 KB)
    📄 generic.ts  (16.5 KB)
    📄 registry.ts  (0.4 KB)
    📄 types.ts  (2.3 KB)
    📄 unknown-tariff-proof.test.ts  (3.2 KB)
    📁 lib\parsers\_archive/
      📄 coct-bill-parser-v4.ts  (19.4 KB)
    📁 lib\parsers\configs/
      📄 city-of-cape-town.json  (5.6 KB)
  📁 lib\payfast/
    📄 .gitkeep  (0.0 KB)
    📄 charge.ts  (3.8 KB)
    📄 idempotency.ts  (0.3 KB)
    📄 security-log.ts  (0.6 KB)
    📄 tokenise.ts  (3.9 KB)
    📄 validate.ts  (3.0 KB)
  📁 lib\pdf/
    📄 .gitkeep  (0.0 KB)
    📄 parse.ts  (1.9 KB)
  📁 lib\popia/
    📄 consent.ts  (1.1 KB)
    📄 luhn.ts  (0.5 KB)
  📁 lib\qstash/
    📄 client.ts  (0.2 KB)
    📄 verify.ts  (1.2 KB)
  📁 lib\rag/
    📄 legislation.ts  (2.2 KB)
  📁 lib\recovery/
    📄 charge.ts  (6.5 KB)
    📄 detect.test.ts  (3.6 KB)
    📄 detect.ts  (4.5 KB)
  📁 lib\resend/
    📄 .gitkeep  (0.0 KB)
    📄 autofetch-report.ts  (2.9 KB)
    📄 autofetch-revoked.ts  (2.9 KB)
    📄 bill2-reminder.ts  (0.8 KB)
    📄 client.ts  (0.3 KB)
    📄 inbound.ts  (1.6 KB)
    📄 notifications.ts  (1.5 KB)
    📄 send-dispute.ts  (1.3 KB)
  📁 lib\scrapers/
    📄 generic.ts  (12.9 KB)
    📄 registry.ts  (1.2 KB)
    📄 types.ts  (2.7 KB)
    📁 lib\scrapers\configs/
      📄 city-of-cape-town.json  (1.8 KB)
    📁 lib\scrapers\discovery/
      📄 index.ts  (1.4 KB)
  📁 lib\supabase/
    📄 .gitkeep  (0.0 KB)
    📄 admin.ts  (0.6 KB)
    📄 client.ts  (0.2 KB)
    📄 server.ts  (0.7 KB)
  📁 lib\tariff/
    📄 gazette-fetcher.ts  (0.8 KB)
    📄 gazette-parser.ts  (0.3 KB)
    📄 generic-store.test.ts  (9.8 KB)
    📄 generic-store.ts  (0.5 KB)
    📄 registry.ts  (0.6 KB)
    📄 tariff-resolver.ts  (3.4 KB)
    📄 tariffLookup.ts  (4.3 KB)
    📄 types.ts  (0.4 KB)
    📁 lib\tariff\_archive/
      📄 coct-tariff-lookup-v5.ts  (6.3 KB)
    📁 lib\tariff\configs/
      📄 city-of-cape-town.json  (14.4 KB)
    📁 lib\tariff\data/
      📄 AG_FETCH_INSTRUCTIONS.md  (2.2 KB)
      📄 CRITICAL_LEGAL_NOTE.md  (1.9 KB)
      📄 MUNICIPALITY_INDEX.json  (10.1 KB)
      📁 lib\tariff\data\CoCT/
        📄 CoCT_2022-23.json  (3.0 KB)
        📄 CoCT_2023-24.json  (3.0 KB)
        📄 CoCT_2024-25.json  (3.0 KB)
        📄 CoCT_2025-26.json  (4.4 KB)
      📁 lib\tariff\data\billdog_all_munis/
        📄 AG_FETCH_INSTRUCTIONS.md  (2.2 KB)
        📄 BILLDOG_ANTI_HALLUCINATION_PROMPT.md  (8.4 KB)
        📄 CRITICAL_LEGAL_NOTE.md  (1.9 KB)
        📄 ESKOM_TARIFFS_2025-26.json  (1.3 KB)
        📄 MUNICIPALITY_INDEX.json  (10.1 KB)
        📄 SNAPTRACK_SOURCE_INDEX.md  (1.6 KB)
        📁 lib\tariff\data\billdog_all_munis\BCM/
          📄 BCM_2025-26.json  (2.3 KB)
        📁 lib\tariff\data\billdog_all_munis\CoJ/
          📄 CoJ_2025-26.json  (2.5 KB)
          📄 CoJ_LEGAL_ALERT.json  (0.8 KB)
        📁 lib\tariff\data\billdog_all_munis\CoT/
          📄 CoT_2025-26.json  (2.5 KB)
        📁 lib\tariff\data\billdog_all_munis\Eastern_Cape/
          📄 amahlathi_2025_26.json  (0.8 KB)
          📄 blue-crane-route_2025_26.json  (0.8 KB)
          📄 dr-beyers-naude_2025_26.json  (0.8 KB)
          📄 elundini_2025_26.json  (0.8 KB)
          📄 emalahleni-ec_2025_26.json  (0.8 KB)
          📄 enoch-mgijima_2025_26.json  (0.8 KB)
          📄 great-kei_2025_26.json  (0.8 KB)
          📄 inxuba-yethemba_2025_26.json  (0.8 KB)
          📄 king-sabata-dalindyebo_2025_26.json  (0.8 KB)
          📄 kou-kamma_2025_26.json  (0.8 KB)
          📄 kouga_2025_26.json  (0.8 KB)
          📄 makana_2025_26.json  (0.8 KB)
          📄 matatiele_2025_26.json  (0.8 KB)
          📄 mbizana_2025_26.json  (0.8 KB)
          📄 ndlambe_2025_26.json  (0.8 KB)
          📄 raymond-mhlaba_2025_26.json  (0.8 KB)
          📄 sakhisizwe_2025_26.json  (0.8 KB)
          📄 senqu_2025_26.json  (0.8 KB)
          📄 sundays-river_2025_26.json  (0.8 KB)
          📄 umsobomvu_2025_26.json  (0.8 KB)
          📄 walter-sisulu_2025_26.json  (0.8 KB)
        📁 lib\tariff\data\billdog_all_munis\Ekurhuleni/
          📄 Ekurhuleni_2025-26.json  (2.4 KB)
          📄 Ekurhuleni_LEGAL_ALERT.json  (0.8 KB)
        📁 lib\tariff\data\billdog_all_munis\Free_State/
          📄 centlec-mangaung_2025_26.json  (0.9 KB)
          📄 dihlabeng_2025_26.json  (0.8 KB)
          📄 kopanong_2025_26.json  (0.8 KB)
          📄 letsemeng_2025_26.json  (0.8 KB)
          📄 mafube_2025_26.json  (0.8 KB)
          📄 maluti-a-phofung_2025_26.json  (0.8 KB)
          📄 mantsopa_2025_26.json  (0.8 KB)
          📄 masilonyana_2025_26.json  (0.8 KB)
          📄 matjhabeng_2025_26.json  (0.8 KB)
          📄 metsimaholo_2025_26.json  (0.8 KB)
          📄 mohokare_2025_26.json  (0.8 KB)
          📄 moqhaka_2025_26.json  (0.8 KB)
          📄 nala_2025_26.json  (0.8 KB)
          📄 ngwathe_2025_26.json  (0.8 KB)
          📄 nketoana_2025_26.json  (0.8 KB)
          📄 setsoto_2025_26.json  (0.8 KB)
          📄 tokologo_2025_26.json  (0.8 KB)
          📄 tswelopele_2025_26.json  (0.8 KB)
        📁 lib\tariff\data\billdog_all_munis\Gauteng/
          📄 emfuleni_2025_26.json  (1.1 KB)
          📄 lesedi_2025_26.json  (0.8 KB)
          📄 merafong_2025_26.json  (0.8 KB)
          📄 midvaal_2025_26.json  (0.8 KB)
          📄 mogale-city_2025_26.json  (0.8 KB)
          📄 randwest_2025_26.json  (0.8 KB)
          📄 westrand-distributors_2025_26.json  (0.8 KB)
        📁 lib\tariff\data\billdog_all_munis\Limpopo/
          📄 ba-phalaborwa_2025_26.json  (0.8 KB)
          📄 bela-bela_2025_26.json  (0.8 KB)
          📄 blouberg_2025_26.json  (0.8 KB)
          📄 elias-motsoaledi_2025_26.json  (0.8 KB)
          📄 ephraim-mogale_2025_26.json  (0.8 KB)
          📄 greater-letaba_2025_26.json  (0.8 KB)
          📄 greater-tzaneen_2025_26.json  (0.8 KB)
          📄 lephalale_2025_26.json  (0.8 KB)
          📄 makhado_2025_26.json  (0.8 KB)
          📄 modimolle-mookgophong_2025_26.json  (0.8 KB)
          📄 mogalakwena_2025_26.json  (0.8 KB)
          📄 molemole_2025_26.json  (0.8 KB)
          📄 musina_2025_26.json  (0.8 KB)
          📄 polokwane_2025_26.json  (0.8 KB)
          📄 thabazimbi_2025_26.json  (0.8 KB)
        📁 lib\tariff\data\billdog_all_munis\Mangaung/
          📄 Mangaung_2023-24.json  (2.0 KB)
          📄 Mangaung_2024-25.json  (0.9 KB)
        📁 lib\tariff\data\billdog_all_munis\Mpumalanga/
          📄 Mbombela_2025-26.json  (1.5 KB)
        📁 lib\tariff\data\billdog_all_munis\Msunduzi/
          📄 Msunduzi_2024-25.json  (1.0 KB)
          📄 Msunduzi_LEGAL_ALERT.json  (1.1 KB)
        📁 lib\tariff\data\billdog_all_munis\NMBM/
          📄 NMBM_2024-25.json  (1.9 KB)
        📁 lib\tariff\data\billdog_all_munis\North_West/
          📄 city-of-matlosana_2025_26.json  (0.8 KB)
          📄 ditsobotla_2025_26.json  (0.8 KB)
          📄 greater-taung_2025_26.json  (0.8 KB)
          📄 jb-marks_2025_26.json  (0.8 KB)
          📄 kgetleng-rivier_2025_26.json  (0.8 KB)
          📄 lekwa-teemane_2025_26.json  (0.8 KB)
          📄 madibeng_2025_26.json  (0.9 KB)
          📄 mamusa_2025_26.json  (0.8 KB)
          📄 maquassi-hills_2025_26.json  (0.8 KB)
          📄 naledi-nw_2025_26.json  (0.8 KB)
          📄 ramotshere-moiloa_2025_26.json  (0.8 KB)
          📄 rustenburg_2025_26.json  (0.8 KB)
          📄 tswaing_2025_26.json  (0.8 KB)
          📁 lib\tariff\data\billdog_all_munis\North_West\Madibeng/
            📄 Madibeng_LEGAL_ALERT.json  (0.6 KB)
        📁 lib\tariff\data\billdog_all_munis\Northern_Cape/
          📄 dawid-kruiper_2025_26.json  (0.8 KB)
          📄 dikgatlong_2025_26.json  (0.8 KB)
          📄 emthanjeni_2025_26.json  (0.8 KB)
          📄 ga-segonyana_2025_26.json  (0.8 KB)
          📄 gamagara_2025_26.json  (0.8 KB)
          📄 hantam_2025_26.json  (0.8 KB)
          📄 joe-morolong_2025_26.json  (0.8 KB)
          📄 kai-garib_2025_26.json  (0.9 KB)
          📄 kamiesberg_2025_26.json  (0.8 KB)
          📄 kareeberg_2025_26.json  (0.8 KB)
          📄 karoo-hoogland_2025_26.json  (0.8 KB)
          📄 kgatelopele_2025_26.json  (0.8 KB)
          📄 khai-ma_2025_26.json  (0.8 KB)
          📄 magareng_2025_26.json  (0.8 KB)
          📄 nama-khoi_2025_26.json  (0.9 KB)
          📄 phokwane_2025_26.json  (0.8 KB)
          📄 renosterberg_2025_26.json  (0.8 KB)
          📄 richtersveld_2025_26.json  (0.8 KB)
          📄 siyancuma_2025_26.json  (0.8 KB)
          📄 siyathemba_2025_26.json  (0.8 KB)
          📄 sol-plaatje_2025_26.json  (0.8 KB)
          📄 thembelihle_2025_26.json  (0.8 KB)
          📄 tsantsabane_2025_26.json  (0.8 KB)
          📄 ubuntu_2025_26.json  (0.8 KB)
        📁 lib\tariff\data\billdog_all_munis\Western_Cape/
          📄 beaufort-west_2025_26.json  (0.8 KB)
          📄 bergrivier_2025_26.json  (0.8 KB)
          📄 bitou_2025_26.json  (0.8 KB)
          📄 breede-valley_2025_26.json  (0.8 KB)
          📄 cape-agulhas_2025_26.json  (0.8 KB)
          📄 cederberg_2025_26.json  (0.8 KB)
          📄 drakenstein_2025_26.json  (1.6 KB)
          📄 george_2025_26.json  (1.4 KB)
          📄 hessequa_2025_26.json  (0.8 KB)
          📄 kannaland_2025_26.json  (0.8 KB)
          📄 knysna_2025_26.json  (0.8 KB)
          📄 laingsburg_2025_26.json  (0.8 KB)
          📄 langeberg_2025_26.json  (0.8 KB)
          📄 matzikama_2025_26.json  (0.8 KB)
          📄 mossel-bay_2025_26.json  (0.8 KB)
          📄 oudtshoorn_2025_26.json  (0.8 KB)
          📄 overstrand_2025_26.json  (0.8 KB)
          📄 prince-albert_2025_26.json  (0.8 KB)
          📄 saldanha-bay_2025_26.json  (0.8 KB)
          📄 stellenbosch_2025_26.json  (1.1 KB)
          📄 swartland_2025_26.json  (0.8 KB)
          📄 swellendam_2025_26.json  (0.8 KB)
          📄 theewaterskloof_2025_26.json  (0.8 KB)
          📄 witzenberg_2025_26.json  (0.8 KB)
        📁 lib\tariff\data\billdog_all_munis\eThekwini/
          📄 eThekwini_2024-25.json  (2.1 KB)
          📄 eThekwini_2025-26.json  (1.8 KB)
      📁 lib\tariff\data\eskom_supply/
        📄 ESKOM_TARIFFS_2025-26.json  (1.3 KB)
      📁 lib\tariff\data\metros/
        📁 lib\tariff\data\metros\BCM/
          📄 BCM_2025-26.json  (2.3 KB)
        📁 lib\tariff\data\metros\CoJ/
          📄 CoJ_2025-26.json  (2.5 KB)
          📄 CoJ_LEGAL_ALERT.json  (0.8 KB)
        📁 lib\tariff\data\metros\CoT/
          📄 CoT_2025-26.json  (2.5 KB)
        📁 lib\tariff\data\metros\Ekurhuleni/
          📄 Ekurhuleni_2025-26.json  (2.4 KB)
          📄 Ekurhuleni_LEGAL_ALERT.json  (0.8 KB)
        📁 lib\tariff\data\metros\Mangaung/
          📄 Mangaung_2023-24.json  (2.0 KB)
          📄 Mangaung_2024-25.json  (0.9 KB)
        📁 lib\tariff\data\metros\NMBM/
          📄 NMBM_2024-25.json  (1.9 KB)
        📁 lib\tariff\data\metros\eThekwini/
          📄 eThekwini_2024-25.json  (2.1 KB)
          📄 eThekwini_2025-26.json  (1.8 KB)
      📁 lib\tariff\data\secondary/
        📁 lib\tariff\data\secondary\Madibeng/
          📄 Madibeng_LEGAL_ALERT.json  (0.6 KB)
        📁 lib\tariff\data\secondary\Mbombela/
          📄 Mbombela_2025-26.json  (1.5 KB)
        📁 lib\tariff\data\secondary\Msunduzi/
          📄 Msunduzi_2024-25.json  (1.0 KB)
          📄 Msunduzi_LEGAL_ALERT.json  (1.1 KB)
      📁 lib\tariff\data\{metros/
    📁 lib\tariff\verifiers/
      📄 electricityHUCharge.ts  (2.3 KB)
      📄 ratesCharge.ts  (2.7 KB)
      📄 refuseCharge.ts  (2.0 KB)
      📄 waterFixedCharge.ts  (3.3 KB)
      📄 waterTierRate.ts  (1.4 KB)
  📁 lib\tiers/
    📄 disclosureRequest.ts  (1.5 KB)
    📄 tier2Analysis.ts  (2.2 KB)
    📄 tier3Report.ts  (1.7 KB)
    📄 tierClassifier.ts  (1.9 KB)
  📁 lib\utils/
    📄 get-client-ip.ts  (0.8 KB)
  📁 lib\validators/
    📄 .gitkeep  (0.0 KB)
    📄 bill-validator.test.ts  (20.1 KB)
    📄 bill-validator.ts  (26.5 KB)
    📄 fallback-chain.test.ts  (2.7 KB)
    📄 prescription.test.ts  (13.4 KB)
    📄 prescription.ts  (9.8 KB)
    📄 sa-id.ts  (1.5 KB)
📁 public/
  📄 .gitkeep  (0.0 KB)
  📄 bulldog-mascot.png  (576.2 KB)
  📄 logo.svg  (2.9 KB)
  📄 og-image.jpg  (72.5 KB)
📁 scripts/
  📄 answer-key.json  (1.4 KB)
  📄 corpus-matcher.test.ts  (5.4 KB)
  📄 corpus-test-results.json  (1.5 KB)
  📄 corpus-test-runner.ts  (7.1 KB)
  📄 corpus_t1_results.md  (162.8 KB)
  📄 debug-parse-bill.ts  (3.0 KB)
  📄 extract-sample-bill.ts  (0.6 KB)
  📄 generate_test_bill.py  (10.9 KB)
  📄 query-tariffs.ts  (1.0 KB)
  📄 regression.ts  (7.6 KB)
  📄 run-test.js  (0.7 KB)
  📄 scorecard.ts  (4.4 KB)
  📄 seed-tariff-cache.ts  (3.1 KB)
  📄 setup-tariff-bucket.ts  (11.8 KB)
  📄 social-monitor.ts  (0.2 KB)
  📄 test-bill.pdf  (4.4 KB)
  📄 tier2-blind-runner.ts  (7.2 KB)
  📄 tier2-raw-output.json  (24.7 KB)
  📄 tier3-blind-runner.ts  (6.3 KB)
  📄 tier3-raw-output.json  (10.7 KB)
📁 supabase/
  📁 supabase\.temp/
    📄 cli-latest  (0.0 KB)
    📄 gotrue-version  (0.0 KB)
    📄 linked-project.json  (0.1 KB)
    📄 pooler-url  (0.1 KB)
    📄 postgres-version  (0.0 KB)
    📄 project-ref  (0.0 KB)
    📄 rest-version  (0.0 KB)
    📄 storage-migration  (0.0 KB)
    📄 storage-version  (0.0 KB)
  📁 supabase\migrations/
    📄 .gitkeep  (0.0 KB)
    📄 001_initial_schema.sql  (3.3 KB)
    📄 002_storage_bucket.sql  (1.0 KB)
    📄 003_case_events.sql  (0.8 KB)
    📄 004_popia_fields.sql  (0.4 KB)
    📄 005_escalation.sql  (2.6 KB)
    📄 006_seed_speaker_emails.sql  (1.3 KB)
    📄 008_encrypted_id.sql  (2.3 KB)
    📄 009_case_resolution.sql  (0.8 KB)
    📄 010_fix_poppi_ownership.sql  (0.9 KB)
    📄 011_fix_status_constraint.sql  (0.4 KB)
    📄 012_phase12_seo_pages.sql  (0.8 KB)
    📄 013_multi_bill.sql  (3.5 KB)
    📄 014_coverage_tiers.sql  (0.9 KB)
    📄 015_disclosure_ownership.sql  (0.8 KB)
    📄 016_escalation_system.sql  (1.1 KB)
    📄 018_tariff_resolver.sql  (1.5 KB)
    📄 019_enable_rls_escalation_letters.sql  (1.7 KB)
    📄 020_mandate_consent.sql  (6.4 KB)
    📄 021_consent_events.sql  (1.7 KB)
    📄 022_municipal_autofetch.sql  (6.6 KB)
    📄 023_profile_id_number.sql  (2.4 KB)
    📄 20260401000000_promo_codes.sql  (0.8 KB)
📁 tests/
  📄 consent.test.ts  (8.1 KB)
  📄 setup.ts  (0.9 KB)
  📁 tests\bills/
    📄 ISU100004459317.pdf  (22.9 KB)
    📄 ISU100004766152.pdf  (23.1 KB)
    📄 ISU104006696081.pdf  (23.0 KB)
    📄 ISU106005973089.pdf  (23.0 KB)
    📄 ISU106006147353.pdf  (23.0 KB)
    📄 ISU106006204459.pdf  (23.0 KB)
    📄 ISU108012156854.pdf  (23.0 KB)
    📄 ISU108012770557.pdf  (23.0 KB)
    📄 ISU109010758573.pdf  (23.0 KB)
    📄 ISU109011686920.pdf  (23.0 KB)
    📄 ISU109012042310.pdf  (23.1 KB)
    📄 ISU110010536497.pdf  (23.0 KB)
    📄 ISU130010166607.pdf  (23.0 KB)
    📄 ISU130010292671.pdf  (23.0 KB)
    📄 ISU140009995549.pdf  (23.1 KB)
    📄 ISU140010454972.pdf  (23.1 KB)
    📄 ISU170009799604.pdf  (23.1 KB)
    📄 ISU170010670237.pdf  (23.1 KB)
    📄 ISU180010358491.pdf  (23.1 KB)
    📄 ISU190010157842.pdf  (23.2 KB)
    📄 ISU190010280998.pdf  (23.1 KB)
    📄 ISU190010404920.pdf  (23.1 KB)
    📄 ISU201010668145.pdf  (22.9 KB)
    📄 ISU201010924705.pdf  (23.0 KB)
    📄 ISU201011483082.pdf  (22.9 KB)
    📄 ISU202011208647.pdf  (23.0 KB)
    📄 ISU220009097762.pdf  (23.0 KB)
    📄 ISU220009857915.pdf  (23.4 KB)
    📄 ISU220010140883.pdf  (23.1 KB)
    📄 ISU240009029749.pdf  (23.1 KB)
    📄 ISU240009699552.pdf  (23.1 KB)
    📄 ISU260008268823.pdf  (23.1 KB)
    📄 ISU260008499432.pdf  (23.0 KB)
    📄 ISU260009230832.pdf  (23.0 KB)
    📄 ISU280008356737.pdf  (23.0 KB)
    📄 ISU290007488789.pdf  (22.9 KB)
  📁 tests\corpus/
    📁 tests\corpus\v5/
      📁 tests\corpus\v5\billdog-test-corpus-v5/
        📄 README.md  (4.2 KB)
        📄 answer_key.json  (40.9 KB)
        📁 tests\corpus\v5\billdog-test-corpus-v5\tier1_single_bill/
          📄 T1-C01.pdf  (5.1 KB)
          📄 T1-C02.pdf  (5.1 KB)
          📄 T1-C03.pdf  (5.0 KB)
          📄 T1-C04.pdf  (5.0 KB)
          📄 T1-C05.pdf  (5.0 KB)
          📄 T1-C06.pdf  (5.0 KB)
          📄 T1-C07.pdf  (5.1 KB)
          📄 T1-C08.pdf  (5.1 KB)
          📄 T1-C09.pdf  (5.1 KB)
          📄 T1-C10.pdf  (5.0 KB)
          📄 T1-C11.pdf  (5.0 KB)
          📄 T1-C12.pdf  (5.1 KB)
          📄 T1-C13.pdf  (5.0 KB)
          📄 T1-C14.pdf  (5.0 KB)
          📄 T1-C15.pdf  (5.0 KB)
          📄 T1-C16.pdf  (5.0 KB)
          📄 T1-C17.pdf  (5.0 KB)
          📄 T1-C18.pdf  (5.0 KB)
          📄 T1-C19.pdf  (5.1 KB)
          📄 T1-C20.pdf  (5.0 KB)
          📄 T1-E01.pdf  (5.0 KB)
          📄 T1-E02.pdf  (5.0 KB)
          📄 T1-E03.pdf  (5.0 KB)
          📄 T1-E04.pdf  (5.0 KB)
          📄 T1-E05.pdf  (5.0 KB)
          📄 T1-E06.pdf  (5.0 KB)
          📄 T1-E07.pdf  (5.0 KB)
          📄 T1-E08.pdf  (4.9 KB)
          📄 T1-E09.pdf  (5.0 KB)
          📄 T1-E10.pdf  (5.0 KB)
          📄 T1-E11.pdf  (5.0 KB)
          📄 T1-E12.pdf  (5.0 KB)
          📄 T1-E13.pdf  (5.0 KB)
          📄 T1-E14.pdf  (5.0 KB)
          📄 T1-E15.pdf  (5.0 KB)
          📄 T1-E16.pdf  (5.0 KB)
        📁 tests\corpus\v5\billdog-test-corpus-v5\tier2_series/
          📄 T2-S01.pdf  (5.0 KB)
          📄 T2-S02.pdf  (5.0 KB)
          📄 T2-S03.pdf  (5.0 KB)
          📄 T2-S04.pdf  (5.0 KB)
          📄 T2-S05.pdf  (5.0 KB)
          📄 T2-S06.pdf  (5.0 KB)
          📄 T2-S07.pdf  (5.0 KB)
          📄 T2-S08.pdf  (5.0 KB)
          📄 T2-S09.pdf  (5.0 KB)
          📄 T2-S10.pdf  (5.0 KB)
          📄 T2-S11.pdf  (5.0 KB)
          📄 T2-S12.pdf  (5.0 KB)
        📁 tests\corpus\v5\billdog-test-corpus-v5\tier3_edge_cases/
          📄 T3-01.pdf  (5.0 KB)
          📄 T3-02.pdf  (5.0 KB)
          📄 T3-03.pdf  (5.0 KB)
          📄 T3-04.pdf  (5.1 KB)
          📄 T3-05.pdf  (5.0 KB)
          📄 T3-06.pdf  (5.0 KB)
      📁 tests\corpus\v5\billdog-tier2-bills/
        📄 README.md  (1.9 KB)
        📁 tests\corpus\v5\billdog-tier2-bills\tier2_series/
          📄 T2-S01.pdf  (5.0 KB)
          📄 T2-S02.pdf  (5.0 KB)
          📄 T2-S03.pdf  (5.0 KB)
          📄 T2-S04.pdf  (5.0 KB)
          📄 T2-S05.pdf  (5.0 KB)
          📄 T2-S06.pdf  (5.0 KB)
          📄 T2-S07.pdf  (5.0 KB)
          📄 T2-S08.pdf  (5.0 KB)
          📄 T2-S09.pdf  (5.0 KB)
          📄 T2-S10.pdf  (5.0 KB)
          📄 T2-S11.pdf  (5.0 KB)
          📄 T2-S12.pdf  (5.0 KB)
      📁 tests\corpus\v5\billdog-tier3-bills/
        📄 README.md  (1.6 KB)
        📁 tests\corpus\v5\billdog-tier3-bills\tier3_edge_cases/
          📄 T3-01.pdf  (5.0 KB)
          📄 T3-02.pdf  (5.0 KB)
          📄 T3-03.pdf  (5.0 KB)
          📄 T3-04.pdf  (5.1 KB)
          📄 T3-05.pdf  (5.0 KB)
          📄 T3-06.pdf  (5.0 KB)
📁 types/
  📄 .gitkeep  (0.0 KB)
  📄 analysis.ts  (6.4 KB)
  📄 index.ts  (10.1 KB)
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
| `semantic_search.md` | (no goal section found) |
| `seo_automation.md` | Automate the SEO optimization pipeline via periodic scans, generating deterministic reports and metadata recommendations |
| `standard_directive_template.md` | A clear, one-sentence description of what this directive achieves. |

### Execution Scripts

| Script | Purpose |
|---|---|
| `example_script.py` | (no docstring found) |
| `index_codebase.py` | (no docstring found) |
| `scan_architecture.py` | Architecture Scanner — Deterministic filesystem scanner for BillDog. |
| `scrape_brand_firecrawl.py` | (no docstring found) |
| `script_boiler_plate.py` | (no docstring found) |
| `semantic_search.py` | (no docstring found) |
| `seo_optimizer.py` | SEO Optimizer — Hive automated SEO scanner and decision maker. |

## SECTION 11 — DESIGN DECISIONS LOG

> Human/agent authored. Preserved across scanner runs. Add entries — never delete.

**DD-001** | 2026-03-27 | Success fee model (15%)
Rational: Zero friction for user acquisition. "Found money" psychology means 15% is readily accepted. Validated by US medical bill service Billdog (different market, same model). Card-on-file via PayFast avoids trust problem of post-resolution invoicing.

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
