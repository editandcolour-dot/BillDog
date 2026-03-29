---
name: accessibility
description: WCAG 2.1 AA accessibility patterns for Billdog. UI Agent MUST read this before building any component, page, or interactive element.
---

# Accessibility — Billdog

> **Consumed by:** UI Agent — read alongside `ui-design-system` and `mobile-responsive` before every component
> **Project:** Billdog — SA municipal billing dispute platform
> **Target standard:** WCAG 2.1 AA
> **Key demographic:** Includes elderly South African users and users with visual impairments
> **Rule:** Accessibility is not an afterthought. It is built in from the start. Every component, every page, every interaction.

---

## PART 1: Why Accessibility Matters for Billdog

### The User Base
- Billdog serves **all South Africans** — including elderly users, users with visual impairments, and users on low-end devices with assistive technology
- **Pensioners are a key demographic** — they often have billing errors and are more likely to use assistive technology
- Users may be stressed, frustrated, and on unfamiliar devices when dealing with billing disputes

### The Standard
- **WCAG 2.1 AA** is the target — internationally recognised minimum for consumer web apps
- Not AAA (too restrictive for a consumer product), not A (too permissive)

### The Benefits
| Benefit | Impact |
|---|---|
| Inclusive access | Serves users screen readers, keyboard-only, low vision |
| SEO improvement | Semantic HTML ranks better in search engines |
| Lower bounce rates | Accessible apps are easier to use for everyone |
| Legal protection | SA Constitution mandates equality — inaccessible services can be challenged |
| Better code quality | Accessible code is semantic, well-structured, and maintainable |

---

## PART 2: Colour and Contrast

### WCAG AA Contrast Requirements

| Element | Minimum Ratio |
|---|---|
| Normal text (under 18pt / 24px) | **4.5:1** |
| Large text (18pt+ or 14pt+ bold) | **3:1** |
| UI components and icons | **3:1** |

### Billdog Palette — Verified Contrast

| Combination | Ratio | Verdict |
|---|---|---|
| White `#FFFFFF` on Navy `#0B1F3A` | 16.1:1 | ✅ Excellent |
| Navy `#0B1F3A` on White `#FFFFFF` | 16.1:1 | ✅ Excellent |
| Navy `#0B1F3A` on Off-white `#F8FAFF` | 15.4:1 | ✅ Excellent |
| White `#FFFFFF` on Blue `#1A56DB` | 4.6:1 | ✅ Passes AA |
| Grey `#64748B` on White `#FFFFFF` | 4.6:1 | ✅ Passes AA |
| Orange `#F97316` on White `#FFFFFF` | 2.9:1 | ❌ **Fails for text** |
| White `#FFFFFF` on Orange `#F97316` | 2.9:1 | ❌ **Fails for small text** |

### Orange Rules — Critical

Orange is Billdog's accent colour but **fails contrast for body text**:

```typescript
// ❌ BANNED — orange text on white background
<p className="text-orange">Important message</p>

// ✅ ALLOWED — orange for decorative/non-text elements
<div className="border-orange border-2">             // Borders
<ShieldIcon className="text-orange w-5 h-5" />       // Icons (3:1 meets component threshold)
<h2 className="text-orange text-2xl font-bold">      // Large bold heading (18pt+ = 3:1 OK)
<span className="bg-orange/10 text-orange font-bold"> // Labels with large bold text

// ✅ PRIMARY BUTTON — use navy text on orange bg
<button className="bg-orange text-navy font-bold">   // Navy on orange = 4.2:1 ✅
```

### Never Convey Information by Colour Alone

Always pair colour with **text + icon + pattern**:

```html
<!-- ❌ WRONG — colour is the only indicator -->
<div className="bg-red-100 p-4">Your bill has errors</div>

<!-- ✅ RIGHT — colour + icon + text -->
<div className="bg-error/10 border border-error/20 p-4 flex items-center gap-2">
  <AlertCircleIcon className="text-error w-5 h-5" aria-hidden="true" />
  <span className="text-error font-medium">Your bill has errors</span>
</div>
```

---

## PART 3: Semantic HTML

### Use the Right Element

| Purpose | Correct Element | Wrong Element |
|---|---|---|
| Navigation | `<nav aria-label="...">` | `<div className="nav">` |
| Page content | `<main id="main-content">` | `<div className="main">` |
| Sections | `<section aria-labelledby="...">` | `<div className="section">` |
| Actions | `<button>` | `<div onClick>` or `<a onClick>` |
| Navigation links | `<a href="...">` | `<button onClick={() => router.push()}>` |
| Form labels | `<label htmlFor="...">` | `<span>` next to input |
| Lists | `<ul>` / `<ol>` | `<div>` with styled items |
| Data tables | `<table>` with `<th scope>` | `<div>` grid layout |

### Heading Hierarchy

```html
<!-- ✅ CORRECT — logical heading order -->
<h1>Your Bill Analysis</h1>            <!-- One h1 per page -->
  <h2>Errors Found</h2>
    <h3>Water Overcharge</h3>
    <h3>Estimated Reading</h3>
  <h2>Next Steps</h2>

<!-- ❌ WRONG — skipped levels -->
<h1>Your Bill Analysis</h1>
  <h3>Errors Found</h3>                <!-- Skipped h2! -->
```

### Landmark Regions

```html
<body>
  <header>                              <!-- Site header -->
    <nav aria-label="Main navigation">  <!-- Primary nav -->
  </header>

  <main id="main-content">             <!-- Primary content -->
    <section aria-labelledby="results-heading">
      <h2 id="results-heading">Analysis Results</h2>
    </section>
  </main>

  <footer>                             <!-- Site footer -->
    <nav aria-label="Footer links">    <!-- Footer nav -->
  </footer>
</body>
```

---

## PART 4: Keyboard Navigation

### Every Interactive Element Must Be Keyboard Accessible

| Element | Keys | Behaviour |
|---|---|---|
| Buttons | `Space`, `Enter` | Activate |
| Links | `Enter` | Navigate |
| Dropdowns | `Arrow keys` | Navigate options |
| Modals | `Escape` | Close; `Tab` traps inside |
| Accordions | `Enter`/`Space` | Toggle; `Arrow keys` move between |
| File input | `Enter`/`Space` | Open file picker |
| Tabs | `Arrow keys` | Switch tabs |

### Focus Must Always Be Visible

```css
/* globals.css — Billdog focus style */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--off-white), 0 0 0 4px var(--orange);
  border-radius: 4px;
}

/* NEVER do this without a replacement: */
/* *:focus { outline: none; } ← BANNED */
```

In Tailwind:
```html
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2">
```

**Apply this to ALL interactive elements.** No exceptions.

### Skip Navigation Link

First element in `<body>` — visible only on keyboard focus:

```tsx
// components/SkipLink.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-orange focus:text-navy focus:font-bold focus:px-4 focus:py-2 focus:rounded-md"
    >
      Skip to main content
    </a>
  );
}

// app/layout.tsx
<body>
  <SkipLink />
  <Header />
  <main id="main-content">
    {children}
  </main>
</body>
```

### Focus Management for Dynamic Content

| Event | Focus Action |
|---|---|
| Modal opens | Move focus **into** the modal (first focusable element or heading) |
| Modal closes | Return focus to the **trigger button** |
| Form submits | Move focus to success/error message |
| Page navigation | Move focus to `<h1>` or `<main>` |
| Toast appears | Announced via `aria-live` (no focus move) |
| Analysis results load | Move focus to results heading |

```typescript
// Focus management example
const triggerRef = useRef<HTMLButtonElement>(null);

const closeModal = () => {
  setIsOpen(false);
  triggerRef.current?.focus();  // Return focus to trigger
};
```

---

## PART 5: ARIA Attributes

**Rule:** Use ARIA only when native HTML semantics are insufficient. A `<button>` doesn't need `role="button"`.

### Core ARIA for Billdog

| Attribute | Use | Example |
|---|---|---|
| `aria-label` | Names elements without visible text | `<button aria-label="Close modal">✕</button>` |
| `aria-labelledby` | Names element using another element's text | `<section aria-labelledby="faq-heading">` |
| `aria-describedby` | Links to descriptive/help text | `<input aria-describedby="email-hint">` |
| `aria-expanded` | Accordion/dropdown open state | `<button aria-expanded={isOpen}>` |
| `aria-controls` | Links trigger to controlled panel | `<button aria-controls="faq-panel-1">` |
| `aria-hidden` | Hides decorative elements | `<svg aria-hidden="true">` |
| `aria-live` | Announces dynamic content changes | `<div aria-live="polite">Status update</div>` |
| `aria-required` | Marks required form fields | `<input aria-required="true">` |
| `aria-invalid` | Marks fields with validation errors | `<input aria-invalid={!!error}>` |
| `role="status"` | Non-critical updates (toasts) | `<div role="status">Saved successfully</div>` |
| `role="alert"` | Critical updates (errors) | `<div role="alert">Payment failed</div>` |
| `role="dialog"` | Modal dialogs | Must pair with `aria-modal="true"` and `aria-labelledby` |

### Accordion Example (FAQ)
```tsx
<div>
  <button
    id="faq-trigger-1"
    aria-expanded={isOpen}
    aria-controls="faq-panel-1"
    onClick={() => setIsOpen(!isOpen)}
  >
    How does Billdog work?
  </button>

  <div
    id="faq-panel-1"
    role="region"
    aria-labelledby="faq-trigger-1"
    hidden={!isOpen}
  >
    <p>Upload your bill, we analyse it...</p>
  </div>
</div>
```

---

## PART 6: Forms and Inputs

### Every Input Must Have a Visible Label

```tsx
// ✅ CORRECT — visible label with htmlFor
<label htmlFor="email" className="text-sm font-medium text-navy">
  Email address
</label>
<input
  id="email"
  type="email"
  placeholder="you@example.com"              // Supplementary, not the label
  aria-required="true"
  aria-describedby={error ? 'email-error' : 'email-hint'}
  aria-invalid={!!error}
/>
<p id="email-hint" className="text-xs text-grey mt-1">
  We'll send dispute updates to this address.
</p>

// ❌ WRONG — placeholder as only label
<input placeholder="Email" />                 // Label disappears when typing!
```

### Error Messages

```tsx
{error && (
  <p id="email-error" role="alert" className="text-error text-sm mt-1 flex items-center gap-1">
    <AlertCircleIcon className="w-4 h-4" aria-hidden="true" />
    Enter a valid email address
  </p>
)}
```

**Rules:**
- Programmatically linked via `aria-describedby`
- Marked as `role="alert"` for screen reader announcement
- Visible, not just colour-coded
- Descriptive: `"Enter a valid email address"` not `"Invalid"`

### Required Fields

```tsx
<label htmlFor="name">
  Full name <span aria-hidden="true" className="text-error">*</span>
</label>
<input id="name" aria-required="true" />

{/* Legend at form top */}
<p className="text-sm text-grey"><span className="text-error">*</span> Required field</p>
```

### File Upload

```tsx
<label htmlFor="bill-upload" className="block text-sm font-medium text-navy mb-2">
  Upload your municipal bill
</label>
<input
  id="bill-upload"
  type="file"
  accept=".pdf,.jpg,.jpeg,.png"
  aria-describedby="upload-hint"
/>
<p id="upload-hint" className="text-xs text-grey mt-1">
  PDF, JPG, or PNG. Maximum 10MB.
</p>

{/* After file selected — announce to screen readers */}
<div aria-live="polite" className="sr-only">
  {fileName && `File selected: ${fileName}`}
</div>
```

---

## PART 7: Images and Icons

| Type | Treatment | Example |
|---|---|---|
| Informative image | Descriptive `alt` text | `alt="Billdog logo — dog carrying a dispute letter"` |
| Decorative image | Empty `alt` | `alt="" role="presentation"` |
| Decorative SVG icon (with text) | `aria-hidden="true"` | `<ShieldIcon aria-hidden="true" /> Secure Payment` |
| Standalone SVG icon (no text) | `aria-label` + `role="img"` | `<TrashIcon aria-label="Delete case" role="img" />` |
| Hero illustration | Decorative — `aria-hidden="true"` | Bill card floating animation |
| Image of text | ❌ **Never use** | Use actual text instead |

```tsx
// Icon WITH adjacent text — icon is decorative
<button>
  <UploadIcon className="w-5 h-5" aria-hidden="true" />
  Upload Bill
</button>

// Icon WITHOUT text — icon is informative
<button aria-label="Delete case">
  <TrashIcon className="w-5 h-5" role="img" aria-hidden="false" />
</button>
```

---

## PART 8: Motion and Animation

### Respect `prefers-reduced-motion`

Add to `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### In Tailwind Components

```html
<!-- Floating bill card -->
<div className="motion-safe:animate-[float_4s_ease-in-out_infinite] motion-reduce:animate-none">

<!-- Fade-in on scroll -->
<div className="motion-safe:animate-fadeIn motion-reduce:opacity-100">

<!-- Hover transitions -->
<button className="motion-safe:transition-transform motion-safe:hover:scale-105 motion-reduce:hover:scale-100">
```

### Rules
- **Never** use rapidly flashing content (> 3 flashes/second) — can trigger seizures (WCAG 2.3.1)
- Auto-playing animations must have a **pause control**
- All decorative motion must honour `prefers-reduced-motion`

---

## PART 9: Loading and Dynamic Content

### Loading States

```tsx
// Announce loading to screen readers
<div role="status" aria-live="polite">
  {isAnalysing && (
    <>
      <Spinner className="motion-safe:animate-spin" aria-hidden="true" />
      <span>Analysing your bill — this may take a moment...</span>
    </>
  )}
</div>
```

### Dynamic Content Updates

| Content Change | Announcement Method |
|---|---|
| Analysis results loaded | `aria-live="polite"` or move focus to results heading |
| Case status update | `aria-live="polite"` region |
| Toast (success) | `role="status"` |
| Toast (error) | `role="alert"` |
| Form validation error | `role="alert"` on individual error messages |
| Page title change | `document.title` update (screen readers announce) |

### After Async Operations

```tsx
// After analysis completes — move focus to results
const resultsRef = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  if (analysisComplete) {
    resultsRef.current?.focus();
  }
}, [analysisComplete]);

<h2 ref={resultsRef} tabIndex={-1}>Analysis Results</h2>
```

---

## PART 10: Testing Accessibility

### Automated Testing (~30% of issues)

```bash
npm install -D @axe-core/playwright
```

```typescript
// tests/e2e/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/login', '/signup', '/privacy', '/popia'];

for (const path of pages) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

### Manual Testing Checklist (Per Page)

- [ ] Tab through entire page — **logical order?**
- [ ] All interactive elements reachable by keyboard?
- [ ] Focus ring **visible** at all times?
- [ ] Skip navigation link present and working?
- [ ] Screen reader announces content correctly?
- [ ] Error messages announced on form submission?
- [ ] No content flashes more than 3 times per second?
- [ ] All text passes colour contrast (4.5:1 normal, 3:1 large)?
- [ ] Page works at **200% zoom** without horizontal scroll?
- [ ] All images have appropriate `alt` text?
- [ ] All form inputs have visible labels?

### Screen Reader Testing

| Platform | Tool | Cost |
|---|---|---|
| macOS | VoiceOver (`Cmd+F5`) | Free |
| Windows | NVDA | Free |
| Windows | JAWS | Paid |
| iOS | VoiceOver | Free |
| Android | TalkBack | Free |

**Minimum:** Test critical flows with **VoiceOver or NVDA** before launch.

### Browser Tools

| Tool | Purpose |
|---|---|
| Chrome Lighthouse | Automated accessibility audit |
| axe DevTools extension | In-page accessibility scanner |
| WebAIM Contrast Checker | Colour contrast verification |
| Chrome DevTools → Rendering → Emulate `prefers-reduced-motion` | Motion testing |

### WCAG 2.1 AA Pre-Launch Checklist

- [ ] **1.1.1** Non-text content has alt text
- [ ] **1.3.1** Semantic HTML structure correct
- [ ] **1.4.3** Text contrast 4.5:1 minimum
- [ ] **1.4.4** Text resizable to 200% without content loss
- [ ] **1.4.11** UI component contrast 3:1 minimum
- [ ] **2.1.1** All functionality keyboard accessible
- [ ] **2.4.1** Skip navigation link present
- [ ] **2.4.3** Logical focus order
- [ ] **2.4.7** Focus indicator visible
- [ ] **2.5.5** Touch targets minimum 44×44px
- [ ] **3.3.1** Errors identified and described
- [ ] **3.3.2** Labels provided for all inputs
- [ ] **4.1.2** Name, role, value for all UI components
