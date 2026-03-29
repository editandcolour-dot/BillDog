---
name: supabase-rls
description: Row Level Security patterns for Billdog. DB Agent MUST read this before any migration, table creation, or query.
---

# Row Level Security (RLS) — Billdog

> **Consumed by:** DB Agent — read before any migration, table creation, or query
> **Project:** Billdog — SA municipal billing dispute platform
> **Database:** Supabase PostgreSQL
> **Constraint:** ARCHITECTURE.md Section 12, Constraint 4 — "All Supabase tables must have RLS enabled. No exceptions."

---

## 1. What RLS Is

Row Level Security is **PostgreSQL-level access control**. It enforces data isolation at the database itself — not in the application code, not in the API layer, not in the frontend.

When RLS is enabled on a table:
- Every query is filtered through **policies** you define
- Rows that don't match the policy are **invisible** — not denied, invisible
- This applies even if the SQL query says `SELECT *` — unauthorized rows simply don't appear
- It works regardless of how the query reaches the database (API route, Supabase client, direct SQL)

**Why this matters for Billdog:** Users upload personal municipal bills containing their name, address, account number, and billing history. If User A can see User B's data, that's a **data breach under POPIA** (Protection of Personal Information Act). RLS makes this architecturally impossible.

---

## 2. Why RLS Is Non-Negotiable

| Without RLS | With RLS |
|---|---|
| A bug in API code could expose all users' cases | Database itself blocks unauthorized access |
| A malformed query could return another user's bills | Query returns empty — rows are invisible |
| Security depends on every developer writing perfect code | Security is enforced by PostgreSQL, independent of code quality |
| A single forgotten `.eq('user_id', userId)` leaks data | Forgotten filter is harmless — RLS catches it |

**Rule:** No table goes live without RLS. No migration is complete without policy definitions.

---

## 3. Enabling RLS

Every `CREATE TABLE` must be immediately followed by `ENABLE ROW LEVEL SECURITY`:

```sql
-- In migration file
CREATE TABLE cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  -- ... columns
);

-- IMMEDIATELY after table creation — never skip this
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
```

> ⚠️ **If you forget this line, the table is wide open.** Any user with the anon key can read/write all rows. This is the #1 most dangerous mistake in Supabase.

### Verification
After any migration, verify RLS is enabled:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- rowsecurity must be TRUE for every table
```

---

## 4. Policy Syntax

```sql
CREATE POLICY "policy_name"
  ON table_name
  FOR operation          -- SELECT | INSERT | UPDATE | DELETE | ALL
  TO role                -- authenticated | anon | service_role
  USING (expression)     -- which existing rows can be accessed (SELECT, UPDATE, DELETE)
  WITH CHECK (expression); -- which new rows can be written (INSERT, UPDATE)
```

### USING vs WITH CHECK

| Clause | Applies To | Controls |
|---|---|---|
| `USING` | SELECT, UPDATE, DELETE | Which **existing** rows the user can see/modify |
| `WITH CHECK` | INSERT, UPDATE | Which **new** rows the user can create/set values to |

- `SELECT` needs `USING` only
- `INSERT` needs `WITH CHECK` only
- `UPDATE` needs both `USING` (which rows to update) and `WITH CHECK` (what values are allowed)
- `DELETE` needs `USING` only

---

## 5. The Core Function: `auth.uid()`

`auth.uid()` returns the UUID of the currently authenticated user from the Supabase JWT. It's the foundation of every user-isolation policy.

```sql
-- This expression means: "only rows where user_id matches the logged-in user"
auth.uid() = user_id
```

**Properties:**
- Returns `NULL` if no user is authenticated (anon request)
- Automatically extracted from the JWT in the request header
- Cannot be spoofed — validated by Supabase server
- Works with both anon key and service role key (but service role bypasses policies entirely)

---

## 6. Standard User-Owned Row Pattern

For tables where each row belongs to a specific user (profiles, cases, etc.):

```sql
-- SELECT: User can only see their own rows
CREATE POLICY "Users can view own rows"
  ON cases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: User can only create rows assigned to themselves
CREATE POLICY "Users can create own rows"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: User can only update their own rows
CREATE POLICY "Users can update own rows"
  ON cases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: User can only delete their own rows (if allowed)
CREATE POLICY "Users can delete own rows"
  ON cases FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

> ⚠️ For INSERT — using `USING` instead of `WITH CHECK` is a silent mistake. The policy will exist but won't actually restrict inserts.

---

## 7. Service Role Bypass

The service role key (`SUPABASE_SERVICE_ROLE_KEY`) **bypasses all RLS policies**. It sees every row in every table.

### When to Use
- PayFast webhook handler (no user session — server-to-server)
- Admin operations (batch updates, data maintenance)
- Background jobs (scheduled analysis, report generation)

### When NOT to Use
- Normal user queries — always use the anon key + user session
- Browser-side code — **NEVER** (exposes the key)
- When RLS should apply — don't bypass security out of convenience

```typescript
// ❌ DANGEROUS — bypasses RLS for a normal user query
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();
const { data } = await supabase.from('cases').select('*');
// Returns ALL cases for ALL users!

// ✅ CORRECT — RLS filters to current user
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
const { data } = await supabase.from('cases').select('*');
// Returns only the authenticated user's cases
```

---

## 8. Billdog RLS Policies — Complete Reference

### `profiles`
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users own their profile (id = auth.uid)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profile creation happens on signup via trigger or onboarding
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
```

### `cases`
```sql
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cases"
  ON cases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy — cases are never deleted, only closed
```

### `case_events`
```sql
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;

-- Users can view events for their own cases (join through cases table)
CREATE POLICY "Users can view own case events"
  ON case_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_events.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- Events are created by the system (API routes), not directly by users
-- Insert is handled via service role in API routes
CREATE POLICY "System can create case events"
  ON case_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_events.case_id
      AND cases.user_id = auth.uid()
    )
  );
```

### `municipalities`
```sql
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;

-- Public read — any authenticated user can look up municipality data
CREATE POLICY "Authenticated users can read municipalities"
  ON municipalities FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT, UPDATE, DELETE policies for authenticated users
-- Municipality data is managed via seed.sql and admin only
```

### `legislation`
```sql
ALTER TABLE legislation ENABLE ROW LEVEL SECURITY;

-- Public read — needed for RAG context during bill analysis
CREATE POLICY "Authenticated users can read legislation"
  ON legislation FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT, UPDATE, DELETE policies for authenticated users
-- Legislation is managed via seed and admin only
```

---

## 9. Storage RLS — Bill Files

Storage buckets have their own RLS policies. The `bills` bucket is **private**.

```sql
-- Users can upload files to their own folder
CREATE POLICY "Users can upload own bills"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bills'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own files
CREATE POLICY "Users can view own bills"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bills'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files (if needed)
CREATE POLICY "Users can delete own bills"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bills'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

**File path convention:** `{userId}/{caseId}/{timestamp}.{ext}`
- `storage.foldername(name)[1]` extracts the first folder segment = `userId`
- This ensures User A cannot access User B's folder

---

## 10. Common RLS Mistakes

### Mistake 1: Forgetting to Enable RLS
```sql
-- ❌ Table created but RLS not enabled — WIDE OPEN
CREATE TABLE sensitive_data (...);

-- ✅ Always pair with ENABLE
CREATE TABLE sensitive_data (...);
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;
```
**Impact:** Without `ENABLE ROW LEVEL SECURITY`, all policies are ignored. The table is fully accessible to anyone with the anon key.

### Mistake 2: Using `USING` Instead of `WITH CHECK` on INSERT
```sql
-- ❌ SILENT FAILURE — this policy does nothing for INSERT
CREATE POLICY "bad_policy" ON cases FOR INSERT
  USING (auth.uid() = user_id);  -- USING doesn't apply to INSERT!

-- ✅ CORRECT — WITH CHECK for INSERT
CREATE POLICY "good_policy" ON cases FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Mistake 3: Missing UPDATE WITH CHECK
```sql
-- ❌ DANGEROUS — user can update their row to change user_id to someone else's ID
CREATE POLICY "bad_update" ON cases FOR UPDATE
  USING (auth.uid() = user_id);
  -- Missing WITH CHECK!

-- ✅ CORRECT — USING + WITH CHECK prevents reassignment
CREATE POLICY "good_update" ON cases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Mistake 4: Not Testing with Two Users
```
-- You tested with User A and everything works.
-- But did you test that User A CANNOT see User B's data?
-- Always test isolation with two separate accounts.
```

### Mistake 5: Using Service Role When Anon Is Sufficient
```typescript
// ❌ Bypasses all security — unnecessary
const supabase = createAdminClient();

// ✅ Let RLS do its job
const supabase = await createClient();
```

---

## 11. RLS Testing Protocol

Before any migration is considered complete:

### Step 1: Verify RLS is Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- This query should return ZERO rows
```

### Step 2: Test with User A
- Create test data as User A
- Verify User A can read their own data
- Verify User A can update their own data

### Step 3: Test with User B
- Log in as User B
- Query the same table
- Verify User B sees **zero** of User A's rows
- Attempt to update User A's row — verify it fails silently (returns 0 rows affected)

### Step 4: Test Anon Access
- Make a request without authentication
- Verify the table returns **zero** rows (unless it's a public-read table like municipalities)

### Step 5: Document
- Log the test results in the migration PR or in `AGENT_BRAIN/FAULT_LOG.md`
- Confirm all four checks passed before merging

---

## 12. Migration Checklist

Every migration file that creates or modifies a table must pass this checklist:

- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` present for every new table
- [ ] SELECT policy defined with `USING`
- [ ] INSERT policy defined with `WITH CHECK`
- [ ] UPDATE policy defined with both `USING` and `WITH CHECK`
- [ ] DELETE policy defined (or explicitly noted as "no delete allowed")
- [ ] Policies use `TO authenticated` (not `TO anon` unless intentional)
- [ ] `auth.uid()` used correctly for user isolation
- [ ] Related table policies use `EXISTS` subquery for cross-table checks
- [ ] Storage policies defined if the table references storage files
- [ ] Tested with two separate user accounts
