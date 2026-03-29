---
name: supabase-patterns
description: Supabase database, auth, and storage patterns for Billdog. DB Agent, Auth Agent, and API Agent MUST read this before touching any database, auth, or storage code.
---

# Supabase — Billdog

> **Consumed by:** DB Agent, Auth Agent, API Agent
> **Project:** Billdog — SA municipal billing dispute platform
> **Tables:** `profiles`, `cases`, `case_events`, `municipalities`, `legislation`
> **Storage Bucket:** `bills` (private — PDFs and bill photos)
> **Schema:** See ARCHITECTURE.md Section 4 for full schema

---

## 1. Client Types — When to Use Each

There are three Supabase client types. Using the wrong one is a security incident.

| Client | Where | Access Level | Use For |
|---|---|---|---|
| Browser client | Client Components (`'use client'`) | Anon key + RLS | User-facing reads/writes |
| Server client | Server Components, API routes | Anon key + cookies + RLS | Authenticated server-side queries |
| Service role client | API routes only | Full admin, bypasses RLS | Admin operations, webhooks |

### Browser Client
```typescript
// lib/supabase/client.ts
'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

**Usage — Client Components only:**
```typescript
'use client';
import { createClient } from '@/lib/supabase/client';

export function CaseList() {
  const supabase = createClient();
  // queries respect RLS — user only sees their own data
}
```

### Server Client
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createClient() {
  const cookieStore = await cookies(); // ⚠️ Must await in Next.js 14+

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Can't set cookies in Server Components — safe to ignore
          }
        },
      },
    },
  );
}
```

**Usage — Server Components and API routes:**
```typescript
// app/(app)/dashboard/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false });
  // ...
}
```

### Service Role Client
```typescript
// lib/supabase/admin.ts — NEVER import in client code
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ Server only — bypasses RLS
  );
}
```

**Usage — API routes and webhooks only:**
```typescript
// app/api/webhooks/payfast/route.ts
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = createAdminClient(); // bypasses RLS for webhook processing
  await supabase.from('cases').update({ status: 'resolved' }).eq('id', caseId);
}
```

> ⚠️ **NEVER** import `createAdminClient` in any file under `components/` or any file with `'use client'`. This exposes the service role key to the browser.

---

## 2. Environment Variables

```env
# Browser-safe (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-only (no prefix — never reaches browser)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

| Variable | Available In | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | Safe — it's just the project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | Safe — RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **DANGEROUS** — bypasses all RLS |

---

## 3. Authentication

### Sign Up (Email/Password)
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      full_name: 'John Doe',
    },
  },
});
```

### Sign In (Email/Password)
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword',
});
```

### Magic Link
```typescript
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  },
});
```

### Get Session (Server Components)
```typescript
const supabase = await createClient();
const { data: { session } } = await supabase.auth.getSession();
// session?.user.id — current user ID
```

### Get User (More Secure — Validates with Supabase)
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
// Use getUser() when you need a verified identity (e.g., before writes)
```

### Sign Out
```typescript
await supabase.auth.signOut();
```

### Rules
- Use `getSession()` for quick reads (cached, fast).
- Use `getUser()` for writes and sensitive operations (validates with server).
- Always redirect to `/login` if no session on protected pages.
- Store user profile data in `profiles` table, not in auth metadata.

---

## 4. Middleware — Session Refresh

The middleware refreshes the Supabase session cookie on every request. Without this, sessions expire silently.

```typescript
// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — IMPORTANT: don't remove this
  await supabase.auth.getUser();

  return supabaseResponse;
}
```

```typescript
// middleware.ts (project root)
import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|og-image.png).*)',
  ],
};
```

---

## 5. Storage — Bill File Uploads

Bills (PDFs and photos) are stored in a **private** `bills` bucket.

### Upload
```typescript
// API route — server-side upload
const supabase = await createClient();
const fileName = `${userId}/${caseId}/${Date.now()}.pdf`;

const { data, error } = await supabase.storage
  .from('bills')
  .upload(fileName, fileBuffer, {
    contentType: 'application/pdf',
    upsert: false, // don't overwrite
  });

if (error) throw new StorageError(`Upload failed: ${error.message}`);

// Save the path (NOT a public URL) to the cases table
await supabase
  .from('cases')
  .update({ bill_url: data.path })
  .eq('id', caseId);
```

### Download / Signed URL
```typescript
// Generate a time-limited signed URL for viewing
const { data, error } = await supabase.storage
  .from('bills')
  .createSignedUrl(bill_url, 3600); // expires in 1 hour

if (error) throw new StorageError(`Signed URL failed: ${error.message}`);
// data.signedUrl — share this with the client
```

### Rules
- **Never use public URLs** for bill files — they contain PII.
- **Always use signed URLs** with expiration (1 hour max).
- **File path format:** `{userId}/{caseId}/{timestamp}.{ext}` — prevents collisions.
- **Accepted types:** `application/pdf`, `image/jpeg`, `image/png` — validate on upload.
- **Max file size:** 10MB — validate before upload.

### Bucket RLS Policy
```sql
-- Users can only access their own files
CREATE POLICY "Users can upload their own bills"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own bills"
  ON storage.objects FOR SELECT
  USING (auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 6. Database Queries

Every Supabase query returns `{ data, error }`. **Always check `error`.**

### Select
```typescript
// All cases for current user
const { data, error } = await supabase
  .from('cases')
  .select('*')
  .order('created_at', { ascending: false });

// Single case by ID
const { data, error } = await supabase
  .from('cases')
  .select('*')
  .eq('id', caseId)
  .single(); // returns one object, not array
```

### Select with Related Data (Joins)
```typescript
// Case with its events
const { data, error } = await supabase
  .from('cases')
  .select(`
    *,
    case_events (
      id,
      event_type,
      note,
      created_at
    )
  `)
  .eq('id', caseId)
  .single();

// Case with user profile
const { data, error } = await supabase
  .from('cases')
  .select(`
    *,
    profiles!user_id (
      full_name,
      email,
      municipality
    )
  `)
  .eq('id', caseId)
  .single();
```

### Insert
```typescript
const { data, error } = await supabase
  .from('cases')
  .insert({
    user_id: userId,
    municipality: 'City of Cape Town',
    account_number: 'ACC-12345',
    status: 'uploading',
  })
  .select()  // return the created row
  .single();
```

### Update
```typescript
const { data, error } = await supabase
  .from('cases')
  .update({
    status: 'analysing',
    bill_text: parsedText,
  })
  .eq('id', caseId)
  .select()
  .single();
```

### Upsert
```typescript
// Insert or update based on primary key
const { data, error } = await supabase
  .from('profiles')
  .upsert({
    id: userId,
    full_name: 'John Doe',
    municipality: 'City of Cape Town',
    account_number: 'ACC-12345',
  })
  .select()
  .single();
```

### Delete
```typescript
const { error } = await supabase
  .from('case_events')
  .delete()
  .eq('id', eventId);
```

---

## 7. Filtering

```typescript
// Equality
.eq('status', 'sent')
.neq('status', 'closed')

// Comparison
.gt('recoverable', 0)
.gte('total_billed', 1000)
.lt('created_at', cutoffDate)
.lte('fee_charged', maxFee)

// In list
.in('status', ['sent', 'acknowledged', 'resolved'])

// Null checks
.is('resolved_at', null)        // IS NULL
.not('letter_content', 'is', null)  // IS NOT NULL

// Text search
.ilike('municipality', '%cape town%')  // case-insensitive LIKE

// Ordering
.order('created_at', { ascending: false })

// Pagination
.range(0, 9)   // first 10 rows (0-indexed)
.limit(10)     // max 10 rows
```

---

## 8. Error Handling

```typescript
// ❌ BANNED — ignoring errors
const { data } = await supabase.from('cases').select('*');

// ✅ REQUIRED — always check error
const { data, error } = await supabase.from('cases').select('*');

if (error) {
  throw new DatabaseError(
    `Failed to fetch cases: ${error.message}`,
    error.code,
  );
}

// In API routes — return proper HTTP errors
if (error) {
  return NextResponse.json(
    { error: `Database error: ${error.message}` },
    { status: error.code === 'PGRST116' ? 404 : 500 },
  );
}
```

### Common Error Codes
| Code | Meaning | Action |
|---|---|---|
| `PGRST116` | Row not found (`.single()` returned 0 rows) | Return 404 |
| `23505` | Unique constraint violation | Return 409 Conflict |
| `42501` | RLS policy violation | Check auth, return 403 |
| `23503` | Foreign key violation | Validate references first |

---

## 9. Realtime Subscriptions

For live case status updates on the dashboard:

```typescript
'use client';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export function useCaseUpdates(userId: string, onUpdate: (case: Case) => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('case-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cases',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onUpdate(payload.new as Case);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onUpdate]);
}
```

### Rules
- Realtime is **client-side only** — use in Client Components.
- Always clean up subscriptions in `useEffect` return.
- Filter aggressively — don't subscribe to entire tables.
- Require Realtime to be enabled on the table in Supabase dashboard.

---

## 10. Migrations

All schema changes go through migration files.

### Creating a Migration
```bash
supabase migration new add_response_deadline_to_cases
# Creates: supabase/migrations/20260327080000_add_response_deadline_to_cases.sql
```

### Migration File Format
```sql
-- supabase/migrations/20260327080000_add_response_deadline_to_cases.sql

-- Add response deadline tracking
ALTER TABLE cases
  ADD COLUMN response_deadline timestamptz;

-- Set default for existing rows
UPDATE cases
  SET response_deadline = letter_sent_at + INTERVAL '30 days'
  WHERE letter_sent_at IS NOT NULL;

-- Enable RLS (if new table)
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
```

### Rules
- **Never modify schema without a migration file** (AGENTS.md Rule 5).
- **Never delete columns** — deprecate only (add `_deprecated` suffix).
- **Never rename columns** without a migration that handles both names.
- File naming: `YYYYMMDDHHMMSS_short_description.sql`.
- Always enable RLS on new tables.

---

## 11. Type Generation

Generate TypeScript types from the Supabase schema for full type safety:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

### Usage
```typescript
// types/supabase.ts is auto-generated — never edit manually
import type { Database } from '@/types/supabase';

type Case = Database['public']['Tables']['cases']['Row'];
type CaseInsert = Database['public']['Tables']['cases']['Insert'];
type CaseUpdate = Database['public']['Tables']['cases']['Update'];
```

### Rules
- Regenerate types after every migration.
- Import types from `@/types/supabase` — never hand-write table types.
- The generated file is the source of truth for database types.

---

## 12. Row Level Security (RLS) Patterns

Every table must have RLS enabled. Standard policies for Billdog:

### Profiles
```sql
-- Users can read and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

### Cases
```sql
-- Users can only access their own cases
CREATE POLICY "Users can view own cases"
  ON cases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cases"
  ON cases FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases"
  ON cases FOR UPDATE USING (auth.uid() = user_id);
```

### Case Events
```sql
-- Users can view events for their own cases
CREATE POLICY "Users can view own case events"
  ON case_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_events.case_id
      AND cases.user_id = auth.uid()
    )
  );
```

### Municipalities (Public Read)
```sql
-- Anyone can read municipality data
CREATE POLICY "Municipality data is public"
  ON municipalities FOR SELECT USING (true);
```

---

## 13. Common Mistakes

### Using Browser Client in Server Components
```typescript
// ❌ BREAKS — browser client needs window/document
import { createClient } from '@/lib/supabase/client';
export default async function Page() {
  const supabase = createClient(); // this is the browser client!
}

// ✅ REQUIRED — use server client
import { createClient } from '@/lib/supabase/server';
export default async function Page() {
  const supabase = await createClient();
}
```

### Forgetting to Await `cookies()`
```typescript
// ❌ BREAKS in Next.js 14+ — cookies() returns a Promise
const cookieStore = cookies();

// ✅ REQUIRED
const cookieStore = await cookies();
```

### Not Refreshing Session in Middleware
```typescript
// ❌ BREAKS — sessions expire after 1 hour without refresh
export async function middleware(request: NextRequest) {
  return NextResponse.next(); // no session refresh!
}

// ✅ REQUIRED — use updateSession helper
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}
```

### Missing `.select()` After Insert/Update
```typescript
// ❌ Returns null data
const { data } = await supabase.from('cases').insert({ ... });
// data is null!

// ✅ Returns the created/updated row
const { data } = await supabase.from('cases').insert({ ... }).select().single();
```

### Using Service Role Client Where It's Not Needed
```typescript
// ❌ DANGEROUS — bypasses all RLS
const supabase = createAdminClient();
const { data } = await supabase.from('cases').select('*');
// Returns ALL cases for ALL users!

// ✅ SAFE — RLS filters to current user
const supabase = await createClient(); // server client with cookies
const { data } = await supabase.from('cases').select('*');
// Returns only current user's cases
```
