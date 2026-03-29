---
name: nextjs-app-router
description: Next.js 14 App Router patterns, conventions, and pitfalls for the Billdog project. UI Agent and API Agent MUST read this before touching any frontend or API route code.
---

# Next.js 14 App Router — Billdog

> **Consumed by:** UI Agent, API Agent
> **Project:** Billdog — SA municipal billing dispute platform
> **Stack:** Next.js 14 (App Router), TypeScript strict, Tailwind CSS 3.x
> **Hosting:** Railway (must respect `$PORT` env var)
> **Route Groups:** `(public)` unauthenticated, `(auth)` login/signup, `(app)` protected

---

## 1. App Router Directory Conventions

The `app/` directory is the root of all routing. Every folder is a route segment. Every `page.tsx` is a publicly accessible page.

### Core Files

| File | Purpose | Scope |
|---|---|---|
| `page.tsx` | The UI for a route | Required to make a route visitable |
| `layout.tsx` | Shared wrapper UI | Wraps all children, doesn't re-render on navigation |
| `loading.tsx` | Instant loading skeleton | Shows while `page.tsx` streams in |
| `error.tsx` | Error boundary | Must be `'use client'` — catches errors in the subtree |
| `not-found.tsx` | 404 UI | Triggered by `notFound()` call |
| `route.ts` | API endpoint | Cannot coexist with `page.tsx` in same folder |

### Route Groups — `(groupName)`

Parenthesised folders create **logical groups** without affecting the URL.

```
app/
├── (public)/           ← URL: / (no "/public" in path)
│   ├── page.tsx        ← Landing page at /
│   ├── pricing/page.tsx ← /pricing
│   └── faq/page.tsx    ← /faq
├── (auth)/             ← URL: /login, /signup (no "/auth")
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (app)/              ← URL: /dashboard, /upload (no "/app")
│   ├── layout.tsx      ← Shared layout for all protected pages
│   ├── dashboard/page.tsx
│   └── upload/page.tsx
└── layout.tsx          ← Root layout (fonts, <html>, <body>)
```

**Rules:**
- Each route group can have its own `layout.tsx` — use this to apply auth checks only to `(app)/`.
- Never put `page.tsx` and `route.ts` in the same folder.
- The root `layout.tsx` is **required** and must include `<html>` and `<body>`.

---

## 2. Server vs Client Components

**Default in App Router: everything is a Server Component.** Only add `'use client'` when you need browser APIs.

### When to Use Server Components (default)
- Fetching data from Supabase
- Reading cookies / headers
- Accessing environment variables (server-only secrets)
- Rendering static or data-driven content
- Anything that doesn't need `useState`, `useEffect`, or browser events

### When to Use Client Components (`'use client'`)
- Interactive UI: forms, buttons with `onClick`, toggles
- Browser APIs: `window`, `localStorage`, `navigator`
- React hooks: `useState`, `useEffect`, `useRef`
- Third-party libs that use browser APIs

### The Boundary Rule
```typescript
// ❌ BANNED — making an entire page client-side
'use client';
export default function DashboardPage() {
  // Now nothing on this page benefits from server rendering
}

// ✅ REQUIRED — push 'use client' to the smallest component
// dashboard/page.tsx (Server Component — fetches data)
export default async function DashboardPage() {
  const cases = await getCases(); // server-side fetch
  return <CaseList cases={cases} />; // client component for interactivity
}

// components/cases/case-list.tsx
'use client';
export function CaseList({ cases }: { cases: Case[] }) {
  const [filter, setFilter] = useState('all');
  // interactive logic here
}
```

### Why It Matters
- Server Components send **zero JavaScript** to the browser → faster page loads.
- Server Components can access Supabase with the **service role key** safely.
- Client Components expose their code to the browser → never put secrets here.

---

## 3. API Routes in App Router

API routes live in `app/api/` as `route.ts` files. Each file exports named functions matching HTTP methods.

### Pattern
```typescript
// app/api/cases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch cases' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    // validate body...
    // create case...
    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create case' },
      { status: 500 },
    );
  }
}
```

### Rules
- Always type the return as `Promise<NextResponse>`.
- Always wrap in try/catch — never let an unhandled error crash the route.
- Always validate request body before processing.
- Use `NextRequest` for request, `NextResponse.json()` for responses.
- Available methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.

### Dynamic API Routes
```typescript
// app/api/cases/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  // fetch case by id...
}
```

> ⚠️ In Next.js 14+, `params` is a **Promise** — you must `await` it.

---

## 4. Dynamic Routes

### Page Routes with Dynamic Segments
```typescript
// app/(app)/case/[id]/page.tsx
interface CasePageProps {
  params: Promise<{ id: string }>;
}

export default async function CasePage({ params }: CasePageProps) {
  const { id } = await params;
  const caseData = await getCase(id);
  if (!caseData) notFound();
  return <CaseDetail case={caseData} />;
}
```

### `useParams` (Client Components Only)
```typescript
'use client';
import { useParams } from 'next/navigation';

export function CaseActions() {
  const params = useParams<{ id: string }>();
  // params.id is available
}
```

### Static Generation
```typescript
// Optional: pre-generate pages at build time
export async function generateStaticParams() {
  const cases = await getAllCaseIds();
  return cases.map((c) => ({ id: c.id }));
}
```

---

## 5. Middleware

Middleware runs **before** every request. It lives at the project root as `middleware.ts`.

### Auth Protection Pattern
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  // Protected routes — redirect to login if no session
  if (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/upload') ||
      request.nextUrl.pathname.startsWith('/analysis') ||
      request.nextUrl.pathname.startsWith('/letter') ||
      request.nextUrl.pathname.startsWith('/case') ||
      request.nextUrl.pathname.startsWith('/settings') ||
      request.nextUrl.pathname.startsWith('/success')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Auth routes — redirect to dashboard if already logged in
  if (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup')) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|og-image.png).*)',
  ],
};
```

### Rules
- Middleware runs on the **Edge Runtime** — limited API access, no Node.js-specific modules.
- The `matcher` config determines which routes trigger middleware — exclude static assets.
- Never do heavy computation in middleware — it runs on every request.

---

## 6. `next.config.js` — Railway Deployment

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Railway sets $PORT — Next.js respects this automatically
  // No manual port config needed

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Strict mode for development
  reactStrictMode: true,

  // TypeScript strict checking during build
  typescript: {
    // Don't skip type checking in production builds
    ignoreBuildErrors: false,
  },

  // ESLint checking during build
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
```

### Railway Specifics
- Railway auto-detects Next.js and runs `npm run build` then `npm start`.
- `$PORT` is injected by Railway — Next.js picks it up automatically.
- Set environment variables in Railway dashboard, not in `.env` on server.
- Health checks: Railway pings `/` — ensure the landing page returns 200.

---

## 7. Environment Variable Conventions

| Prefix | Available In | Use For |
|---|---|---|
| `NEXT_PUBLIC_` | Browser + Server | Supabase URL, Supabase anon key, app URL |
| No prefix | Server only | API keys, service role keys, secrets |

```typescript
// ❌ BANNED — secret leaked to browser
const key = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

// ✅ REQUIRED — server-only, no prefix
const key = process.env.ANTHROPIC_API_KEY; // only in API routes / server components
```

**Rule:** If you add `NEXT_PUBLIC_` to a secret, you've shipped it to every browser. This is a security incident.

---

## 8. Image Optimisation

Always use `next/image` — never a raw `<img>` tag.

```typescript
import Image from 'next/image';

// Local image
<Image
  src="/logo.svg"
  alt="Billdog logo"
  width={168}
  height={42}
  priority // for above-the-fold images (hero, nav logo)
/>

// Remote image (Supabase Storage)
<Image
  src={bill.imageUrl}
  alt={`Bill for ${bill.period}`}
  width={800}
  height={1100}
  className="rounded-lg"
/>
```

### Rules
- `width` and `height` are **required** (prevents layout shift).
- Use `priority` on hero images and nav logo — loads them immediately.
- Remote images need domain config in `next.config.js` `images.remotePatterns`.
- Use `fill` prop with `sizes` for responsive images in containers.

---

## 9. Font Loading

Use `next/font/google` — it self-hosts fonts at build time, eliminating FOUT (Flash of Unstyled Text).

```typescript
// app/layout.tsx
import { Bebas_Neue, DM_Sans } from 'next/font/google';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmSans.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

```css
/* globals.css */
:root {
  --font-bebas: 'Bebas Neue', sans-serif;
  --font-dm-sans: 'DM Sans', sans-serif;
}

body { font-family: var(--font-dm-sans); }
h1, h2, h3 { font-family: var(--font-bebas); }
```

**Rule:** Never load fonts via `<link>` tags or CSS `@import`. Always use `next/font`.

---

## 10. Layouts

### Root Layout (Required)
```typescript
// app/layout.tsx — wraps EVERYTHING
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />      {/* visible on all pages */}
        {children}
        <Footer />   {/* visible on all pages */}
      </body>
    </html>
  );
}
```

### Route Group Layouts
```typescript
// app/(app)/layout.tsx — only wraps authenticated pages
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  return (
    <div className="min-h-screen bg-off-white">
      <AppSidebar />
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
```

### Rules
- Layouts **do not re-render** on navigation — only the `page.tsx` inside changes.
- Use route group layouts to apply auth checks — avoids repeating in every page.
- Don't put interactive state in layouts unless it needs to persist across pages.
- The root layout **must** include `<html>` and `<body>` — no other layout should.

---

## 11. Metadata & SEO

### Static Metadata
```typescript
// app/(public)/pricing/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing | Billdog',
  description: 'No upfront costs. We only charge 20% of what we recover. If we don\'t win, you don\'t pay.',
  openGraph: {
    title: 'Pricing | Billdog',
    description: 'No upfront costs. 20% success fee only.',
    url: 'https://billdog.co.za/pricing',
    images: ['/og-image.png'],
  },
};
```

### Dynamic Metadata
```typescript
// app/(app)/case/[id]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const caseData = await getCase(id);
  return {
    title: `Case ${caseData?.bill_period} | Billdog`,
    description: `Dispute case for ${caseData?.municipality}`,
  };
}
```

### Rules
- Every public page **must** have `title` and `description`.
- Use `generateMetadata` for dynamic pages (case details, analysis).
- Include OpenGraph data on all public pages for social sharing.
- Root layout should set default metadata that children can override.

---

## 12. Common Pitfalls

### Hydration Errors
**Cause:** Server HTML doesn't match client HTML.
```typescript
// ❌ CAUSES HYDRATION ERROR
export function Greeting() {
  return <p>Current time: {new Date().toLocaleString()}</p>; // different on server vs client
}

// ✅ FIX — use useEffect for client-only values
'use client';
export function Greeting() {
  const [time, setTime] = useState<string>('');
  useEffect(() => { setTime(new Date().toLocaleString()); }, []);
  return <p>Current time: {time}</p>;
}
```

### Server/Client Boundary Mistakes
```typescript
// ❌ BREAKS — importing server-only code in client component
'use client';
import { supabaseAdmin } from '@/lib/supabase/server'; // this uses service role key!

// ✅ FIX — fetch via API route from client
'use client';
const res = await fetch('/api/cases');
```

### Forgetting to Await `cookies()`
```typescript
// ❌ BREAKS in Next.js 14+
import { cookies } from 'next/headers';
const cookieStore = cookies(); // This is now a Promise!

// ✅ REQUIRED
const cookieStore = await cookies();
```

### Infinite Redirect Loops in Middleware
```typescript
// ❌ INFINITE LOOP — middleware runs on /login too, redirects back
if (!session) {
  return NextResponse.redirect(new URL('/login', request.url));
}

// ✅ FIX — exclude auth pages from redirect
if (!session && !request.nextUrl.pathname.startsWith('/login')) {
  return NextResponse.redirect(new URL('/login', request.url));
}
```

### Forgetting `'use client'` on `error.tsx`
```typescript
// ❌ BREAKS — error boundaries MUST be client components
// app/error.tsx
export default function Error({ error, reset }) { ... }

// ✅ REQUIRED
'use client';
export default function Error({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) { ... }
```

### Using `router.push` in Server Components
```typescript
// ❌ BREAKS — useRouter is client-only
import { useRouter } from 'next/navigation';
// can't use in server component

// ✅ FIX — use redirect() in server components
import { redirect } from 'next/navigation';
redirect('/dashboard');
```
