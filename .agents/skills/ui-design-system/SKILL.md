---
name: ui-design-system
description: Billdog design system — colours, typography, components, patterns. UI Agent MUST read this before building every single component, page, or layout.
---

# UI Design System — Billdog

> **Consumed by:** UI Agent — read before every component, page, and layout
> **Project:** Billdog — SA municipal billing dispute platform
> **Fonts:** Bebas Neue (display) + DM Sans (body) via `next/font/google`
> **Reference:** `billdog-landing.html` prototype — all patterns derived from this
> **Rule:** No freelancing on colours, fonts, or patterns. Consistency is non-negotiable.

---

## 1. Colour Palette

Every colour in the system has a defined role. Never use a colour outside this palette.

### Primary Palette

| Token | Hex | CSS Variable | Usage |
|---|---|---|---|
| Navy | `#0B1F3A` | `--navy` | Primary dark background, headings on light, nav, footer |
| Blue | `#1A56DB` | `--blue` | Secondary accent, links, sent/analysing status |
| Orange | `#F97316` | `--orange` | Primary CTA, logo accent, highlights, section labels |
| Orange Light | `#FB923C` | `--orange-light` | **Hover states only** — never as primary |

### Neutral Palette

| Token | Hex | CSS Variable | Usage |
|---|---|---|---|
| White | `#FFFFFF` | `--white` | Card backgrounds, text on dark backgrounds |
| Off-White | `#F8FAFF` | `--off-white` | Alternate section backgrounds |
| Grey | `#64748B` | `--grey` | Body text, labels, captions, placeholders |
| Light Grey | `#E2E8F0` | `--light-grey` | Borders, dividers, input borders |

### Semantic Palette

| Token | Hex | CSS Variable | Usage |
|---|---|---|---|
| Success | `#10B981` | `--success` | Recovered amounts, resolved status, confirmations |
| Error | `#EF4444` | `--error` | Error amounts, warnings, form validation errors |

### CSS Variables (globals.css)
```css
:root {
  --navy: #0B1F3A;
  --blue: #1A56DB;
  --orange: #F97316;
  --orange-light: #FB923C;
  --white: #FFFFFF;
  --off-white: #F8FAFF;
  --grey: #64748B;
  --light-grey: #E2E8F0;
  --success: #10B981;
  --error: #EF4444;
  --footer-dark: #070F1E;
}
```

### Rules
- **Orange Light is hover-only.** Never use it as a resting-state colour.
- **Grey is for body text.** Never use navy for long paragraphs — it's too heavy.
- **Off-White alternates with White** for section backgrounds — never two white sections in a row.
- **Success/Error are semantic only.** Never use them decoratively.

---

## 2. Typography

### Font Pairing

| Role | Font | Weights | Usage |
|---|---|---|---|
| Display | Bebas Neue | 400 | H1, H2, H3, stat numbers, nav brand |
| Body | DM Sans | 300, 400, 500, 700 | Body text, labels, buttons, inputs, captions |

### Banned Fonts
Never use as primary: Inter, Roboto, Arial, Helvetica, `system-ui`, `sans-serif` fallback as visible font.

### Size Scale

| Element | Mobile | Desktop | Rules |
|---|---|---|---|
| H1 (hero) | `2.5rem` (40px) | `4rem` (64px) | Bebas Neue, uppercase, white on dark, letter-spacing 2–3px |
| H2 (section) | `2.2rem` (35px) | `3.5rem` (56px) | Bebas Neue, uppercase, responsive via `clamp()` |
| H3 (card/sub) | `1.3rem` (21px) | `1.5rem` (24px) | Bebas Neue or DM Sans Bold |
| Body | `1rem` (16px) | `1.125rem` (18px) | DM Sans 400, `line-height: 1.7` |
| Small / Caption | `0.875rem` (14px) | `0.875rem` (14px) | DM Sans 400, grey |
| Label | `0.75rem` (12px) | `0.75rem` (12px) | DM Sans 700, uppercase, tracking wide |

### Responsive Heading Pattern
```css
/* Use clamp() for fluid scaling — no breakpoints needed */
.section-heading {
  font-family: var(--font-bebas);
  font-size: clamp(2.2rem, 4vw, 3.5rem);
  letter-spacing: 1px;
  text-transform: uppercase;
}
```

### Rules
- **Minimum body font: 16px (1rem).** Never smaller on mobile — prevents iOS zoom and ensures readability.
- **Bebas Neue is always uppercase.** It's a display font — lowercase looks wrong.
- **Letter spacing on Bebas Neue:** 1–3px. Tighter for smaller sizes, wider for larger.
- **Line height for body text:** 1.6–1.7. Never below 1.5.

---

## 3. Hero Section Pattern

The hero is the first thing users see. It sets the tone.

### Structure
```
┌─────────────────────────────────────────────────────┐
│  [NAV: fixed, navy, blur backdrop]                  │
│                                                     │
│  ┌──────────────────┐  ┌────────────────────┐       │
│  │  SECTION LABEL    │  │   Floating card    │ (desktop)
│  │  H1 with <orange> │  │   with animation   │       │
│  │  Sub-headline     │  │   (hidden mobile)  │       │
│  │  [CTA] [Outline]  │  └────────────────────┘       │
│  └──────────────────┘                               │
│                                                     │
│  Background: navy + radial gradient glows           │
└─────────────────────────────────────────────────────┘
```

### Implementation
```html
<section class="relative min-h-screen bg-navy overflow-hidden">
  <!-- Gradient glows -->
  <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-orange/8 rounded-full blur-[120px]"></div>
  <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue/10 rounded-full blur-[100px]"></div>

  <div class="relative max-w-[1200px] mx-auto px-6 md:px-[6%] pt-32 pb-20">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

      <!-- Left: Copy -->
      <div class="opacity-0 animate-fade-up">
        <span class="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
          AI-Powered Billing Disputes
        </span>
        <h1 class="font-display text-4xl md:text-6xl text-white tracking-wider leading-tight">
          YOUR MUNICIPALITY GOT IT <span class="text-orange">WRONG</span>
        </h1>
        <p class="mt-6 text-white/60 text-lg leading-relaxed max-w-lg">
          No lawyers. No queues. No nonsense. Just results.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row gap-4">
          <button class="btn-primary">Dispute My Bill</button>
          <button class="btn-outline-dark">See How It Works</button>
        </div>
      </div>

      <!-- Right: Floating card (desktop only) -->
      <div class="hidden lg:block animate-float">
        <!-- Stat card or illustration -->
      </div>
    </div>
  </div>
</section>
```

---

## 4. Brand Voice in UI Copy

### Tone
- **Bold and direct.** Billdog fights for the consumer.
- **Consumer-champion.** We're on their side, not the municipality's.
- **Never corporate.** Never timid. Never legal-speak in marketing copy.
- **Confident without arrogance.** We deliver results, not promises.

### Example Copy

| Element | ✅ Billdog Voice | ❌ Wrong Tone |
|---|---|---|
| Hero H1 | "YOUR MUNICIPALITY GOT IT WRONG" | "Municipal Billing Error Detection Service" |
| Hero sub | "No lawyers. No queues. No nonsense." | "We offer comprehensive billing analysis solutions." |
| CTA | "Dispute My Bill" | "Submit for Review" |
| Value prop | "We fight. You save." | "Our service helps optimise your billing outcomes." |
| Trust | "R12.4M recovered for South Africans" | "We have processed thousands of cases." |
| Pricing | "We only win if you win. 20% of what we recover." | "Success-based fee structure applies." |

### Rules
- Headlines in Bebas Neue should feel like a **punchy newspaper headline**.
- Body text in DM Sans should feel like a **trusted friend explaining something**.
- Error messages should be **helpful, not blaming** — "That file type isn't supported. Try a PDF or photo."
- Loading states should be **active** — "Analysing your bill..." not "Please wait."

---

## 5. Button System

### Primary Button (Orange CTA)
```html
<button class="
  min-h-[44px] px-7 py-3
  bg-orange text-white font-bold
  rounded-md
  hover:bg-orange-light hover:-translate-y-0.5
  hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)]
  active:translate-y-0
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2
">
  Dispute My Bill
</button>
```

### Outline Button (Dark Background)
```html
<button class="
  min-h-[44px] px-7 py-3
  bg-transparent text-white font-bold
  border-2 border-white/30
  rounded-md
  hover:border-white hover:bg-white/[0.08]
  hover:-translate-y-0.5
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-navy
">
  See How It Works
</button>
```

### Outline Button (Light Background)
```html
<button class="
  min-h-[44px] px-7 py-3
  bg-transparent text-navy font-bold
  border-2 border-light-grey
  rounded-md
  hover:border-navy hover:-translate-y-0.5
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2
">
  Learn More
</button>
```

### Disabled State
```html
<button class="opacity-50 cursor-not-allowed pointer-events-none" disabled>
  Processing...
</button>
```

### Rules
- **All buttons: `min-h-[44px]`** — touch target compliance.
- **Primary CTA shadow on hover:** `shadow-[0_8px_24px_rgba(249,115,22,0.35)]` — orange glow.
- **Never mix button types** in the same button group. Use primary + outline, never two primaries.
- **Focus rings are mandatory.** Adjust `ring-offset` colour to match the background.

---

## 6. Card System

### Standard Card (Light Background)
```html
<div class="
  bg-white
  border border-light-grey
  rounded-2xl
  p-7
  hover:-translate-y-1 hover:shadow-xl
  transition-all duration-200
">
  <h3 class="font-display text-xl text-navy tracking-wide">Card Title</h3>
  <p class="mt-3 text-grey text-sm leading-relaxed">Card content...</p>
</div>
```

### Dark Card (Navy Background)
```html
<div class="
  bg-white/5
  border border-white/[0.08]
  rounded-2xl
  p-7
  hover:-translate-y-1 hover:border-white/20
  transition-all duration-200
">
  <h3 class="font-display text-xl text-white tracking-wide">Card Title</h3>
  <p class="mt-3 text-white/60 text-sm leading-relaxed">Card content...</p>
</div>
```

### Stat Card (Dark Variant)
```html
<div class="bg-white/5 border border-white/[0.08] rounded-2xl p-7 text-center">
  <p class="font-display text-[3.8rem] text-orange leading-none">R12.4M</p>
  <p class="mt-2 text-white/60 text-sm">Recovered for South Africans</p>
</div>
```

---

## 7. Badge & Tag System

```html
<!-- Base badge -->
<span class="
  inline-flex items-center
  rounded-full
  text-xs font-bold uppercase tracking-widest
  px-3 py-1
  bg-{colour}/10 text-{colour}
">
  Label
</span>
```

### Colour Variants

| Variant | Classes | Use |
|---|---|---|
| Orange | `bg-orange/10 text-orange` | Highlights, new items |
| Blue | `bg-blue/10 text-blue` | Info, links, sent status |
| Success | `bg-success/10 text-success` | Resolved, approved, recovered |
| Error | `bg-error/10 text-error` | Not yet in scope, errors, escalated |
| Grey | `bg-grey/10 text-grey` | Inactive, closed, uploading |

---

## 8. Section Label Pattern

Every section heading gets a label above it:

```html
<span class="
  block mb-3
  text-orange text-xs font-bold uppercase tracking-[2px]
">
  How It Works
</span>
<h2 class="
  font-display tracking-wide
  text-navy  /* or text-white on dark bg */
  text-[clamp(2.2rem,4vw,3.5rem)]
">
  THREE SIMPLE STEPS
</h2>
```

**Rules:**
- Always orange text.
- Always uppercase, `tracking-[2px]`, `text-xs`, `font-bold`.
- Always `mb-3` gap before the heading.
- Label text should be **2–4 words** max.

---

## 9. Status Badge Colours

Exact mapping for case status across all UI:

| Status | Background | Text | Tailwind Classes |
|---|---|---|---|
| `uploading` | grey/10 | grey | `bg-grey/10 text-grey` |
| `analysing` | blue/10 | blue | `bg-blue/10 text-blue` |
| `letter_ready` | orange/10 | orange | `bg-orange/10 text-orange` |
| `sent` | blue/10 | blue | `bg-blue/10 text-blue` |
| `acknowledged` | orange/10 | orange | `bg-orange/10 text-orange` |
| `resolved` | success/10 | success | `bg-success/10 text-success` |
| `escalated` | error/10 | error | `bg-error/10 text-error` |
| `closed` | grey/10 | grey | `bg-grey/10 text-grey` |

---

## 10. Trust Bar Pattern

Sits below the hero to build credibility:

```html
<div class="bg-off-white border-b border-light-grey">
  <div class="
    max-w-[1200px] mx-auto
    flex justify-around items-center flex-wrap
    gap-5 py-7 px-[6%]
  ">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-navy/10 rounded-lg flex items-center justify-center">
        <ShieldIcon class="w-5 h-5 text-navy" />
      </div>
      <span class="text-grey text-sm font-medium">Section 102 Compliant</span>
    </div>
    <!-- more trust items -->
  </div>
</div>
```

---

## 11. Step / Process Pattern

For "How It Works" sections:

```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
  <!-- Connecting line (desktop only) -->
  <div class="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-orange to-blue"></div>

  <!-- Step -->
  <div class="text-center relative">
    <div class="
      w-16 h-16 mx-auto
      bg-navy border-2 border-orange
      rounded-full
      flex items-center justify-center
    ">
      <span class="font-display text-2xl text-white">1</span>
    </div>
    <h3 class="mt-5 font-bold text-navy text-lg">Upload Your Bill</h3>
    <p class="mt-2 text-grey text-sm leading-relaxed">
      Photo or PDF — our AI handles both.
    </p>
  </div>
  <!-- more steps -->
</div>
```

---

## 12. Form Input System

```html
<!-- Standard input -->
<div>
  <label class="block text-sm font-medium text-navy mb-1.5">
    Account Number
  </label>
  <input
    type="text"
    class="
      w-full min-h-[44px]
      border border-light-grey rounded-lg
      px-4 py-3
      text-base text-navy
      placeholder:text-grey/50
      focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy
      transition-all duration-200
    "
    placeholder="Municipal account number"
  />
</div>

<!-- Error state -->
<div>
  <input class="... border-error focus:ring-error" />
  <p class="text-error text-sm mt-1">Account number is required</p>
</div>
```

**Rule:** `text-base` (16px) minimum on all inputs — prevents iOS auto-zoom.

---

## 13. Logo Usage

| Context | Height | Background | File |
|---|---|---|---|
| Navigation | 42px | Navy (dark) | `/public/logo.svg` |
| Footer | 36px | Footer dark (#070F1E) | `/public/logo.svg` |
| Favicon | 32×32 | Transparent | `/public/favicon.ico` |

### Rules
- **Always use `/public/logo.svg`** — never recreate the logo in code.
- **Never stretch** — maintain aspect ratio.
- **Never recolour** — the logo has its own orange/white palette.
- **Never use a text fallback** in production — the SVG must load.

---

## 14. Animation System

### Page Load — Fade Up
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-up { animation: fadeUp 0.7s ease forwards; }
.animate-fade-up-delay { animation: fadeUp 0.7s ease 0.2s forwards; }
```

### Hero Visual — Float
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}
.animate-float { animation: float 4s ease-in-out infinite; }
```

### Scroll Reveal — IntersectionObserver
Use `useScrollReveal` hook (see tailwind skill) — fade in elements as they enter the viewport.

### Hover Transitions
```
transition-all duration-200  — standard for all interactive elements
```

**Rule:** Never exceed `duration-300` for hover transitions. Anything longer feels sluggish.

---

## 15. Spacing System

| Element | Mobile | Desktop |
|---|---|---|
| Section padding vertical | `py-16` | `py-20 md:py-24` |
| Content max width | — | `max-w-[1200px] mx-auto` |
| Horizontal padding | `px-6` | `md:px-[6%]` |
| Card padding | `p-6` | `p-7` |
| Grid gap | `gap-6` | `gap-6` (consistent) |
| Stack gap (vertical items) | `space-y-4` | `space-y-6` |
| Button spacing in groups | `gap-3` | `gap-4` |

---

## 16. Layout System

### Navigation
```
Position: fixed top-0
Background: navy with backdrop-blur
Content: logo left, CTA right
Height: ~72px
Z-index: 50
```

### Page Structure
```
Nav (fixed)
Hero (min-h-screen, navy)
Trust Bar (off-white)
Section 1 (white)
Section 2 (off-white or navy)
Section 3 (alternating)
CTA Section (navy)
Footer (#070F1E)
```

### Section Alternation Pattern
```
navy → white → off-white → navy → white → off-white
```
Never place two navy sections adjacent. Never place two white sections adjacent.

### Footer
```
Background: #070F1E (darker than navy)
Logo: left, 36px height
Links: right, grouped
Copyright: centered below, text-white/40, text-sm
```
