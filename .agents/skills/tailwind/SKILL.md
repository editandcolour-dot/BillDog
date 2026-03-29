---
name: tailwind-ui
description: Mobile-first Tailwind CSS patterns for Billdog. UI Agent MUST read this before touching any component or page.
---

# Tailwind CSS — Billdog UI System

> **Consumed by:** UI Agent — read before every component and page
> **Project:** Billdog — SA municipal billing dispute platform
> **Design System:** Navy/orange/white — bold consumer-champion feel
> **Fonts:** Bebas Neue (display), DM Sans (body)
> **Rule:** No inline `style=` except CSS custom properties. No custom CSS except `globals.css` variables.

---

## 1. Mobile-First Breakpoint Strategy

All styles are written **mobile-first**. Base classes target mobile (320px+). Scale up with prefixes.

| Prefix | Min Width | Target |
|---|---|---|
| (none) | 0px | Mobile — **this is your default** |
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |

```html
<!-- ❌ BANNED — desktop-first, then override for mobile -->
<div class="grid grid-cols-3 sm:grid-cols-1">

<!-- ✅ REQUIRED — mobile-first, scale up -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

**Rule:** If you write a responsive class without testing at 320px, you've written a broken class.

---

## 2. Minimum Width: 320px

Every layout, every component, every page must work at **320px width**.

### Testing Checklist
- [ ] No horizontal scroll at 320px
- [ ] No text overflow or truncation that hides meaning
- [ ] All buttons are full-width or properly stacked
- [ ] Images scale down without breaking layout
- [ ] Form inputs don't overflow their container
- [ ] Navigation is accessible (hamburger menu or collapsible)

### Common 320px Fixes
```html
<!-- Text doesn't overflow -->
<h1 class="text-2xl md:text-4xl lg:text-5xl break-words">

<!-- Buttons stack on mobile -->
<div class="flex flex-col gap-3 sm:flex-row">
  <button class="w-full sm:w-auto">Primary</button>
  <button class="w-full sm:w-auto">Secondary</button>
</div>

<!-- Padding doesn't eat all space -->
<section class="px-4 sm:px-6 md:px-[6%]">
```

---

## 3. Touch Targets

Every interactive element must be at least **44px tall** (Apple HIG / WCAG 2.5.5).

```html
<!-- ❌ BANNED — too small for fingers -->
<button class="px-2 py-1 text-sm">Submit</button>

<!-- ✅ REQUIRED — minimum 44px touch target -->
<button class="min-h-[44px] px-6 py-3 text-base">Submit</button>

<!-- Links in lists -->
<a href="/case/123" class="block min-h-[44px] py-3 px-4">
  Case #123
</a>

<!-- Icon buttons -->
<button class="min-h-[44px] min-w-[44px] flex items-center justify-center">
  <ChevronIcon class="h-5 w-5" />
</button>
```

---

## 4. Colour Palette — Tailwind Config

Extend `tailwind.config.ts` with the Billdog palette. Never use raw hex in class names.

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1F3A',
        blue: '#1A56DB',
        orange: {
          DEFAULT: '#F97316',
          light: '#FB923C',
        },
        'off-white': '#F8FAFF',
        grey: '#64748B',
        'light-grey': '#E2E8F0',
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

### Usage
```html
<!-- Backgrounds -->
<div class="bg-navy">         <!-- #0B1F3A -->
<div class="bg-off-white">    <!-- #F8FAFF -->
<div class="bg-orange">       <!-- #F97316 -->

<!-- Text -->
<p class="text-grey">         <!-- #64748B -->
<p class="text-navy">         <!-- #0B1F3A -->
<span class="text-success">   <!-- #10B981 -->
<span class="text-error">     <!-- #EF4444 -->

<!-- Borders -->
<div class="border border-light-grey">  <!-- #E2E8F0 -->

<!-- Hover -->
<button class="bg-orange hover:bg-orange-light">
```

**Rule:** Never use `bg-[#F97316]`. Use `bg-orange`. If a colour isn't in the config, it doesn't exist.

---

## 5. Font Configuration

```html
<!-- Display headings — Bebas Neue -->
<h1 class="font-display text-4xl md:text-6xl tracking-wide uppercase">
  YOUR MUNICIPALITY GOT IT WRONG
</h1>

<!-- Body text — DM Sans -->
<p class="font-body text-base text-grey leading-relaxed">
  We analyse your municipal bill using AI...
</p>

<!-- Font weights (DM Sans) -->
<span class="font-light">    <!-- 300 -->
<span class="font-normal">   <!-- 400 -->
<span class="font-medium">   <!-- 500 -->
<span class="font-bold">     <!-- 700 -->
```

### Rules
- Headings (`h1`, `h2`, `h3`): Always `font-display` (Bebas Neue)
- Body, labels, buttons, UI: Always `font-body` (DM Sans)
- Never use `font-sans` or system fonts as primary
- Set `font-body` on `<body>` in root layout as default

---

## 6. Button Patterns

### Primary Button (CTA)
```html
<button class="
  min-h-[44px] px-8 py-3
  bg-orange text-white font-bold
  rounded-md
  hover:bg-orange-light hover:-translate-y-0.5
  active:translate-y-0
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2
">
  Dispute My Bill
</button>
```

### Outline Button (on dark background)
```html
<button class="
  min-h-[44px] px-8 py-3
  bg-transparent text-white font-bold
  border-2 border-white/30
  rounded-md
  hover:border-white hover:-translate-y-0.5
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-navy
">
  See How It Works
</button>
```

### Outline Button (on light background)
```html
<button class="
  min-h-[44px] px-8 py-3
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
<button class="opacity-50 cursor-not-allowed" disabled>
  Processing...
</button>
```

**Rule:** Every button must include `focus:ring` styles. Never remove focus indicators.

---

## 7. Card Pattern

```html
<div class="
  bg-white
  border border-light-grey
  rounded-2xl
  p-6 md:p-8
  hover:shadow-lg hover:-translate-y-1
  transition-all duration-300
">
  <h3 class="font-display text-xl text-navy tracking-wide">Card Title</h3>
  <p class="mt-2 text-grey text-sm leading-relaxed">Card content...</p>
</div>
```

### Card Grid
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- cards here -->
</div>
```

---

## 8. Badge / Tag Pattern

Badges use a low-opacity background with matching text colour.

```html
<!-- Generic badge -->
<span class="
  inline-flex items-center
  px-3 py-1
  rounded-full
  text-xs font-bold uppercase tracking-wide
  bg-orange/10 text-orange
">
  New
</span>

<!-- Status badges -->
<span class="bg-blue/10 text-blue ...">Sent</span>
<span class="bg-success/10 text-success ...">Resolved</span>
<span class="bg-orange/10 text-orange ...">Escalated</span>
<span class="bg-grey/10 text-grey ...">Uploading</span>
<span class="bg-grey/10 text-grey ...">Closed</span>
<span class="bg-error/10 text-error ...">Error</span>
```

---

## 9. Section Label Pattern

Small uppercase orange labels that sit above headings.

```html
<span class="
  block mb-3
  text-xs font-bold uppercase tracking-[0.15em]
  text-orange
">
  How It Works
</span>
<h2 class="font-display text-3xl md:text-4xl text-navy tracking-wide">
  THREE SIMPLE STEPS
</h2>
```

---

## 10. Status Badge Colour Map

Use this exact mapping for case status badges across all pages:

| Status | Background | Text | Classes |
|---|---|---|---|
| `uploading` | grey/10 | grey | `bg-grey/10 text-grey` |
| `analysing` | blue/10 | blue | `bg-blue/10 text-blue` |
| `letter_ready` | orange/10 | orange | `bg-orange/10 text-orange` |
| `sent` | blue/10 | blue | `bg-blue/10 text-blue` |
| `acknowledged` | blue/15 | blue | `bg-blue/15 text-blue` |
| `resolved` | success/10 | success | `bg-success/10 text-success` |
| `escalated` | orange/15 | orange | `bg-orange/15 text-orange` |
| `closed` | grey/10 | grey | `bg-grey/10 text-grey` |

---

## 11. Form Inputs

```html
<input
  type="text"
  class="
    w-full min-h-[44px]
    px-4 py-3
    text-base
    bg-white
    border border-light-grey rounded-lg
    text-navy placeholder:text-grey/50
    focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent
    transition-all duration-200
  "
  placeholder="Municipal account number"
/>

<!-- Textarea -->
<textarea class="
  w-full min-h-[120px]
  px-4 py-3
  text-base
  bg-white
  border border-light-grey rounded-lg
  text-navy placeholder:text-grey/50
  focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent
  resize-y
" />

<!-- Select -->
<select class="
  w-full min-h-[44px]
  px-4 py-3
  text-base
  bg-white
  border border-light-grey rounded-lg
  text-navy
  focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent
  appearance-none
">
  <option>City of Cape Town</option>
</select>
```

### Rules
- **`text-base` (16px) minimum** — prevents iOS auto-zoom on input focus.
- **`min-h-[44px]`** — touch target compliance.
- Always include `placeholder:` styles.
- Always include `focus:ring` styles.

---

## 12. Section Spacing & Layout

### Content Container
```html
<div class="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%]">
  <!-- page content -->
</div>
```

### Section Spacing
```html
<!-- Standard section -->
<section class="py-16 md:py-20 lg:py-24">
  <div class="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%]">
    <!-- content -->
  </div>
</section>

<!-- Hero section (more padding) -->
<section class="py-20 md:py-28 lg:py-32">
```

### Dark vs Light Sections
```html
<!-- Dark section (navy) -->
<section class="bg-navy text-white py-16 md:py-24">
  <h2 class="font-display text-3xl md:text-4xl text-white">...</h2>
  <p class="text-white/70">Subdued body text on dark</p>
</section>

<!-- Light section (white) -->
<section class="bg-white py-16 md:py-24">
  <h2 class="font-display text-3xl md:text-4xl text-navy">...</h2>
  <p class="text-grey">Body text on light</p>
</section>

<!-- Alternate section (off-white) -->
<section class="bg-off-white py-16 md:py-24">
```

**Pattern:** Alternate dark → light → off-white to create visual rhythm.

---

## 13. Animation Utilities

Define in `globals.css`, consume via Tailwind classes.

### globals.css Animations
```css
/* globals.css */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```

### Tailwind Config Extension
```typescript
// tailwind.config.ts — inside theme.extend
animation: {
  'fade-up': 'fadeUp 0.6s ease-out forwards',
  'fade-up-delay': 'fadeUp 0.6s ease-out 0.2s forwards',
  'float': 'float 3s ease-in-out infinite',
},
```

### Usage
```html
<!-- Fade up on page load -->
<div class="opacity-0 animate-fade-up">
  <h1>Your municipality got it wrong</h1>
</div>
<div class="opacity-0 animate-fade-up-delay">
  <p>We'll make it right.</p>
</div>

<!-- Floating element (logo, icon) -->
<div class="animate-float">
  <Image src="/logo.svg" ... />
</div>
```

### Hover Transitions (built-in)
```html
<!-- Card lift -->
<div class="hover:-translate-y-1 hover:shadow-lg transition-all duration-300">

<!-- Button lift -->
<button class="hover:-translate-y-0.5 transition-all duration-200">

<!-- Subtle scale -->
<div class="hover:scale-105 transition-transform duration-300">
```

### Scroll Reveal (Intersection Observer)
For scroll-triggered animations, create a `useScrollReveal` hook — don't use Tailwind alone. The hook adds a class when the element enters the viewport:

```typescript
// hooks/use-scroll-reveal.ts
'use client';
import { useEffect, useRef, useState } from 'react';

export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

```html
<div
  ref={ref}
  class={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
>
```

---

## 14. Tailwind Discipline

### Never Use Arbitrary Values When a Utility Exists
```html
<!-- ❌ BANNED -->
<div class="w-[100%]">     <!-- use w-full -->
<div class="mt-[16px]">    <!-- use mt-4 -->
<div class="text-[14px]">  <!-- use text-sm -->
<div class="rounded-[8px]"><!-- use rounded-lg -->

<!-- ✅ REQUIRED -->
<div class="w-full">
<div class="mt-4">
<div class="text-sm">
<div class="rounded-lg">
```

### Allowed Arbitrary Values
Only use `[]` notation when no standard utility exists:
- **Custom max-widths:** `max-w-[1200px]` (no Tailwind utility for 1200)
- **Custom min-heights:** `min-h-[44px]` (touch target)
- **Percentage padding:** `px-[6%]` (design spec)
- **Letter spacing:** `tracking-[0.15em]` (section labels)
- **Opacity fractions:** `bg-orange/10` (badge backgrounds)

### Never Use Inline Styles
```html
<!-- ❌ BANNED -->
<div style="background-color: #0B1F3A; padding: 20px;">

<!-- ✅ REQUIRED -->
<div class="bg-navy p-5">
```

**Only exception:** CSS custom properties for dynamic values:
```html
<div style={{ '--progress': `${percentage}%` } as React.CSSProperties}>
```
