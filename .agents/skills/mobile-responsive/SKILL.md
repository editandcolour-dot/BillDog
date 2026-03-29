---
name: mobile-responsive
description: Mobile-first responsive design patterns for Billdog. UI Agent MUST read this before building any component, page, or layout.
---

# Mobile Responsive — Billdog

> **Consumed by:** UI Agent — read alongside `ui-design-system` skill before every component
> **Project:** Billdog — SA municipal billing dispute platform
> **Primary audience:** South African consumers — high mobile usage
> **Hard requirement:** 320px minimum width — non-negotiable
> **Philosophy:** Mobile-first. Base styles are mobile. Scale up with breakpoints. Never shrink down.

---

## 1. Mobile-First Philosophy

Write base styles for the smallest screen. Add complexity upward.

```html
<!-- ❌ BANNED — desktop-first, then try to fix mobile -->
<div class="grid grid-cols-3 gap-8 sm:grid-cols-1 sm:gap-4">

<!-- ✅ REQUIRED — mobile-first, scale up -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
```

**Why mobile-first works:**
- Base styles are simple (single column, full width, stacked)
- Complexity is added progressively as screens grow
- If a breakpoint class fails to load, the mobile layout is still usable
- Forces you to prioritise content for small screens

---

## 2. Minimum Width: 320px

Every layout must work at exactly **320px width**. This is the narrowest modern phone (iPhone SE, low-end Android).

### What 320px Means in Practice
- **Horizontal padding max:** `px-4` (16px each side) = 288px content width
- **Two-column grid:** Each column is ~140px — usually too narrow for cards
- **Long words:** Will overflow without `break-words` or `overflow-hidden`
- **Button text:** Keep labels short or use `w-full` stacking

### Testing
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Set width to **320** manually
4. Scroll entire page — check for:
   - Horizontal scrollbar (immediate fail)
   - Text overflow
   - Buttons too small to tap
   - Images breaking layout
   - Forms overflowing container

---

## 3. Breakpoint System

| Prefix | Min Width | Target | Design Approach |
|---|---|---|---|
| (none) | 0px | Mobile phones | **Default — write these first** |
| `sm:` | 640px | Large phones, small tablets | Side-by-side buttons, 2-column grids |
| `md:` | 768px | Tablets | Show desktop nav, 2-3 column layouts |
| `lg:` | 1024px | Laptops | Full desktop layout, floating elements |
| `xl:` | 1280px | Desktop | Max-width content, generous spacing |

### Usage Pattern
```html
<!-- Stack on mobile → 2 cols on tablet → 3 cols on desktop -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

<!-- Full width on mobile → auto width on desktop -->
<button class="w-full sm:w-auto">

<!-- Small text on mobile → larger on desktop -->
<h1 class="text-3xl md:text-5xl lg:text-6xl">

<!-- Hidden on mobile → visible on desktop -->
<div class="hidden lg:block">
```

---

## 4. Touch Targets

**Absolute minimum: 44×44px** on ALL interactive elements. No exceptions.

### Elements That Need Touch Target Enforcement
| Element | Minimum Class | Notes |
|---|---|---|
| Buttons | `min-h-[44px] px-6 py-3` | Primary and secondary |
| Nav links | `min-h-[44px] py-3 px-4` | Each nav item |
| Form inputs | `min-h-[44px] py-3 px-4` | Text, email, password, select |
| Checkboxes/radios | `min-h-[44px] min-w-[44px]` | Make the label tappable too |
| FAQ toggles | `min-h-[44px] py-4` | Full-width clickable header |
| Accordion headers | `min-h-[44px] py-4` | Full-width |
| File upload area | `min-h-[120px]` | Large, generous tap zone |
| Icon buttons | `min-h-[44px] min-w-[44px]` | Close, menu, arrows |
| Clickable badges | `min-h-[44px] px-4 py-2` | Status badges with actions |

```html
<!-- ❌ BANNED — too small -->
<button class="px-2 py-1 text-xs">X</button>

<!-- ✅ REQUIRED -->
<button class="min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Close">
  <XIcon class="h-5 w-5" />
</button>
```

---

## 5. Font Sizes on Mobile

| Element | Minimum | Tailwind Class | Rule |
|---|---|---|---|
| Body text | 16px | `text-base` | **Never smaller** |
| Captions/labels | 14px | `text-sm` | Absolute floor |
| Form inputs | 16px | `text-base` | Prevents iOS auto-zoom |
| Button text | 16px | `text-base` | Readable and tappable |
| Badge text | 12px | `text-xs` | Only for badges — short text |
| Navigation | 16px | `text-base` | Readable on mobile |

```html
<!-- ❌ BANNED — text-xs on body content -->
<p class="text-xs text-grey">Important information about your case...</p>

<!-- ✅ REQUIRED -->
<p class="text-base text-grey">Important information about your case...</p>
```

### iOS Auto-Zoom Prevention
iOS Safari zooms in when an input with `font-size < 16px` is focused. This breaks the layout.

```html
<!-- ❌ CAUSES iOS ZOOM -->
<input class="text-sm" />

<!-- ✅ PREVENTS iOS ZOOM -->
<input class="text-base" />  <!-- 16px — zoom threshold -->
```

---

## 6. Navigation on Mobile

### Desktop Nav (Hidden on Mobile)
```html
<nav class="fixed top-0 w-full bg-navy/95 backdrop-blur-md z-50">
  <div class="max-w-[1200px] mx-auto px-4 md:px-[6%] h-[72px] flex items-center justify-between">

    <!-- Logo — always visible -->
    <Image src="/logo.svg" alt="Billdog" width={120} height={32} priority />

    <!-- Desktop links — hidden on mobile -->
    <div class="hidden md:flex items-center gap-6">
      <a href="#how" class="text-white/70 hover:text-white text-sm">How It Works</a>
      <a href="#pricing" class="text-white/70 hover:text-white text-sm">Pricing</a>
      <button class="btn-primary text-sm">Dispute My Bill</button>
    </div>

    <!-- Mobile: hamburger + CTA -->
    <div class="flex md:hidden items-center gap-3">
      <button class="btn-primary text-sm px-4 py-2">Start</button>
      <button class="min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Menu">
        <MenuIcon class="h-6 w-6 text-white" />
      </button>
    </div>
  </div>
</nav>
```

### Rules
- **Logo always visible** — left side
- **Primary CTA always visible** — even on mobile, show a compact CTA
- **Hamburger menu** for full navigation on mobile
- Mobile menu should be **full-screen overlay** or **slide-in panel**, not a tiny dropdown

---

## 7. Hero Section on Mobile

```html
<section class="min-h-screen bg-navy pt-24 pb-16 px-4 sm:px-6">
  <div class="max-w-[1200px] mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

      <!-- Copy — always visible -->
      <div>
        <h1 class="
          font-display text-white tracking-wider
          text-[clamp(2.5rem,8vw,5rem)]
          leading-[1.1]
        ">
          YOUR MUNICIPALITY GOT IT <span class="text-orange">WRONG</span>
        </h1>
        <p class="mt-5 text-white/60 text-base sm:text-lg max-w-lg leading-relaxed">
          No lawyers. No queues. No nonsense. Just results.
        </p>

        <!-- Buttons: stack on mobile, row on tablet+ -->
        <div class="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button class="btn-primary w-full sm:w-auto">Dispute My Bill</button>
          <button class="btn-outline-dark w-full sm:w-auto">See How It Works</button>
        </div>
      </div>

      <!-- Floating card — desktop only, decorative -->
      <div class="hidden lg:block animate-float">
        <!-- decorative element -->
      </div>
    </div>
  </div>
</section>
```

### Rules
- **`clamp(2.5rem, 8vw, 5rem)`** — fluid H1 that never overflows at 320px
- **Floating card hidden on mobile** — `hidden lg:block` — it's decorative, not essential
- **CTA buttons stack** — `flex-col sm:flex-row` — full width on mobile, auto on tablet+
- **Generous top padding** — `pt-24` accounts for fixed nav height

---

## 8. Stats Grid on Mobile

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Single column on mobile — each stat full width -->
  <div class="bg-white/5 border border-white/[0.08] rounded-2xl p-5 text-center
              first:rounded-t-2xl last:rounded-b-2xl sm:first:rounded-t-none sm:last:rounded-b-none">
    <p class="font-display text-3xl sm:text-[3rem] text-orange">R12.4M</p>
    <p class="mt-1 text-white/60 text-sm">Recovered</p>
  </div>
  <!-- more stats -->
</div>
```

---

## 9. Steps Section on Mobile

```html
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
  <!-- 2 columns on mobile — 5 steps = 2+2+1 -->
  <!-- Last step uses col-span-2 on mobile to center -->

  <!-- Connecting line hidden on mobile -->
  <div class="hidden md:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-orange to-blue"></div>
</div>
```

### Rules
- Step numbers and text must be readable at `grid-cols-2` width (~148px per column at 320px)
- Connecting line: `hidden md:block` — doesn't make sense in a wrapped grid
- Consider vertical step layout on very narrow screens if content doesn't fit

---

## 10. Stories & Testimonials on Mobile

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Full width cards on mobile — always stack vertically -->
  <!-- NEVER use horizontal scroll for testimonials -->
</div>
```

### Rules
- **No horizontal scroll** — stack vertically with `grid-cols-1`
- If limited space, show 2–3 testimonials max on mobile, with a "See more" button
- Quote text at `text-base` minimum

---

## 11. Trust Bar on Mobile

```html
<div class="
  grid grid-cols-2 sm:grid-cols-3 md:flex md:justify-around
  gap-4 py-6 px-4
">
  <!-- 2 columns on mobile, flex-row on desktop -->
  <div class="flex items-center gap-2">
    <div class="w-8 h-8 bg-navy/10 rounded-lg flex items-center justify-center shrink-0">
      <ShieldIcon class="w-4 h-4 text-navy" />
    </div>
    <span class="text-grey text-xs sm:text-sm font-medium">Section 102</span>
  </div>
</div>
```

### Rules
- **Never overflow viewport width** — use `grid-cols-2` wrapping
- Shrink icon size slightly on mobile (`w-8 h-8` vs `w-10 h-10`)
- Shorter labels on mobile if needed

---

## 12. Forms on Mobile

```html
<form class="w-full max-w-md mx-auto space-y-4">
  <!-- Full width inputs -->
  <input class="w-full min-h-[44px] text-base ..." />

  <!-- Keyboard hints -->
  <input type="email" inputMode="email" class="w-full min-h-[44px] text-base ..." />
  <input type="tel" inputMode="numeric" class="w-full min-h-[44px] text-base ..." />

  <!-- Submit: full width on mobile -->
  <button type="submit" class="w-full sm:w-auto min-h-[44px] btn-primary">
    Submit
  </button>
</form>
```

### Rules
- **`w-full`** on all inputs — always
- **`space-y-4`** minimum between fields — fingers need room
- **`inputMode`** for keyboard hints: `email`, `numeric`, `tel`, `url`
- **Submit button full-width** on mobile: `w-full sm:w-auto`
- **Labels above inputs**, never inline on mobile

---

## 13. File Upload on Mobile

```html
<label class="
  block w-full min-h-[120px]
  border-2 border-dashed border-light-grey rounded-2xl
  flex flex-col items-center justify-center gap-3
  p-6 cursor-pointer
  hover:border-orange hover:bg-orange/5
  transition-all duration-200
">
  <UploadIcon class="w-10 h-10 text-grey" />
  <span class="text-grey text-sm text-center">
    Tap to upload or take a photo of your bill
  </span>
  <span class="text-grey/50 text-xs">PDF, JPG, or PNG • Max 10MB</span>
  <input
    type="file"
    class="hidden"
    accept="image/*,application/pdf"
    capture="environment"
  />
</label>
```

### Rules
- **`min-h-[120px]`** — large tap area for mobile
- **`accept="image/*,application/pdf"`** — enables camera on mobile
- **`capture="environment"`** — opens rear camera directly for bill photos
- **Clear instructions** — "Tap to upload or take a photo"

---

## 14. Dashboard on Mobile

```html
<!-- Case list — full width stacked cards -->
<div class="space-y-4 px-4">
  <div class="bg-white border border-light-grey rounded-xl p-4 w-full">
    <div class="flex items-center justify-between">
      <h3 class="font-bold text-navy text-base truncate">City of Cape Town</h3>
      <span class="bg-blue/10 text-blue text-xs font-bold px-2 py-1 rounded-full shrink-0">
        Sent
      </span>
    </div>
    <p class="text-grey text-sm mt-1">ACC-12345 • March 2026</p>
  </div>
</div>

<!-- Case timeline — vertical, no horizontal scroll -->
<div class="space-y-3 pl-6 border-l-2 border-light-grey">
  <div class="relative">
    <div class="absolute -left-[25px] w-3 h-3 bg-orange rounded-full border-2 border-white"></div>
    <p class="text-sm font-medium text-navy">Letter sent to municipality</p>
    <p class="text-xs text-grey">27 March 2026, 10:14</p>
  </div>
</div>
```

### Rules
- **Case cards full width** — `w-full` always
- **Status badges visible** — `shrink-0` so they don't get crushed
- **Timeline vertical** — never horizontal on mobile
- **`truncate`** on long titles — prevent overflow

---

## 15. Tables on Mobile

```html
<!-- ❌ BANNED — data hidden on overflow -->
<div class="overflow-hidden">
  <table>...</table>
</div>

<!-- ✅ REQUIRED — scrollable wrapper -->
<div class="overflow-x-auto -mx-4 px-4">
  <table class="min-w-[600px] w-full">
    <thead>
      <tr class="text-left text-xs text-grey uppercase">
        <th class="py-3 pr-4">Case</th>
        <th class="py-3 pr-4">Municipality</th>
        <th class="py-3 pr-4">Status</th>
        <th class="py-3">Amount</th>
      </tr>
    </thead>
    <!-- rows -->
  </table>
</div>
```

### Rules
- **Never `overflow-hidden` on tables** — data gets cut off
- Use **`overflow-x-auto`** on the wrapper — users can scroll horizontally
- Set **`min-w-[600px]`** on the table so columns don't collapse to unreadable widths
- Consider **card layout** instead of tables on mobile for better UX

---

## 16. Images on Mobile

```html
<!-- Always use next/image -->
<Image
  src={bill.imageUrl}
  alt="Municipal bill"
  width={800}
  height={1100}
  className="w-full h-auto rounded-lg"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### Rules
- **Always `w-full h-auto`** — images scale to container
- **Always set `sizes`** — tells the browser which image size to load
- **Never let images overflow** — container must have `overflow-hidden` if needed
- **Use `priority`** for above-the-fold images only

---

## 17. Viewport Meta Tag

Must be present in root layout `app/layout.tsx`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

This is included automatically by Next.js, but verify it's not overridden.

**Never add** `maximum-scale=1` or `user-scalable=no` — these break accessibility by preventing pinch-to-zoom.

---

## 18. Mobile Testing Checklist

Before any page is considered complete:

- [ ] Tested at **320px** width in Chrome DevTools
- [ ] **No horizontal scrollbar** at any width from 320px to 1440px
- [ ] All interactive elements **minimum 44×44px** touch target
- [ ] **No text below 14px** anywhere on the page
- [ ] Form inputs at **16px minimum** — no iOS zoom on focus
- [ ] **Images don't overflow** their containers
- [ ] **Navigation accessible** — hamburger menu works, CTA visible
- [ ] **CTAs visible and tappable** — not hidden below fold on mobile
- [ ] **Font loads correctly** — no FOUT (Flash of Unstyled Text)
- [ ] **Scroll performance smooth** — no janky animations or layout shifts
- [ ] **Content readable without zooming** — body text comfortable at arm's length
- [ ] **Dark sections have sufficient contrast** — text on navy passes WCAG AA
