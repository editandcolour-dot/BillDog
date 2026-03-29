---
name: railway-deployment
description: Railway deployment and infrastructure patterns for Billdog. Infra Agent MUST read this before any deployment configuration or environment setup.
---

# Railway Deployment — Billdog

> **Consumed by:** Infra Agent — read before any deployment or env configuration
> **Project:** Billdog — SA municipal billing dispute platform
> **Stack:** Next.js 14, Node.js
> **Domain:** billdog.co.za
> **Database:** Supabase (external) — not hosted on Railway

---

## 1. Railway Service Configuration

Railway auto-detects Next.js via **Nixpacks** — no Dockerfile needed.

### How It Works
1. Railway detects `package.json` with a `next` dependency
2. Nixpacks installs Node.js and runs `npm install`
3. Railway runs `npm run build` (which runs `next build`)
4. Railway runs `npm start` (which runs `next start`)
5. The app listens on `$PORT` (injected by Railway)

### `railway.toml` (Project Root)
```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
restartPolicyType = "on_failure"
```

**Rules:**
- Keep `railway.toml` in the project root, committed to Git.
- `restartPolicyType = "on_failure"` ensures auto-restart on crashes without restart loops.
- Do not override `nixpacks` with a Dockerfile unless you have a specific reason and user approval.

---

## 2. PORT Binding

Railway injects `$PORT` as an environment variable. Next.js respects it automatically in production.

```
# Railway sets this — you do NOT need to configure it
PORT=3000  # (or whatever Railway assigns)
```

**Rules:**
- **Never hardcode a port** in `next.config.js` or `package.json`.
- **Never add PORT to Railway environment variables manually** — Railway manages this.
- The `npm start` script (`next start`) reads `$PORT` automatically.
- In local development, Next.js defaults to `3000` — this is fine.

```json
// package.json — standard scripts, no port override
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

---

## 3. Environment Variable Management

### The Rule
- **Never commit `.env` to Git.** Environment variables are set in the Railway dashboard.
- **Mirror `.env.example`** — every key in `.env.example` must have a corresponding value set in Railway.
- All variables without `NEXT_PUBLIC_` prefix are **server-only** — never exposed to the browser.

### Setting Variables in Railway
1. Open Railway dashboard → select Billdog service
2. Go to **Variables** tab
3. Add each variable as a key-value pair
4. Railway automatically redeploys when variables change

### `.env.example` (Committed to Git — No Values)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Payment
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
PAYFAST_ITN_URL=

# App
NEXT_PUBLIC_APP_URL=
NODE_ENV=production
```

---

## 4. Required Environment Variables

Every variable below must be set in Railway before the app goes live:

### Supabase (Database + Auth)
| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | Public anon key (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin access, bypasses RLS |

### AI Services
| Variable | Exposure | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Server only | Claude API for bill analysis + letter generation |
| `VOYAGE_API_KEY` | Server only | Voyage AI for legislation embeddings |

### Email
| Variable | Exposure | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Server only | Sending dispute letters and notifications |
| `RESEND_FROM_EMAIL` | Server only | Sender address (e.g., `disputes@billdog.co.za`) |

### Payment
| Variable | Exposure | Purpose |
|---|---|---|
| `PAYFAST_MERCHANT_ID` | Server only | PayFast merchant identifier |
| `PAYFAST_MERCHANT_KEY` | Server only | PayFast merchant key |
| `PAYFAST_PASSPHRASE` | Server only | PayFast signature validation |
| `PAYFAST_ITN_URL` | Server only | ITN webhook callback URL |

### Application
| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Browser + Server | App base URL (`https://billdog.co.za`) |
| `NODE_ENV` | Server | Must be `production` on Railway |

### Pre-Launch Check
```bash
# Verify all required vars are set — run locally against Railway
railway variables
# Compare output against .env.example — every key must have a value
```

---

## 5. Custom Domain Setup

### Steps
1. **Railway dashboard** → Billdog service → **Settings** → **Networking**
2. Click **Add Custom Domain**
3. Enter `billdog.co.za`
4. Railway provides a **CNAME target** (e.g., `billdog-production.up.railway.app`)

### DNS Configuration (at Domain Registrar)
```
Type:  CNAME
Name:  @  (or billdog.co.za)
Value: [Railway-provided domain].up.railway.app
TTL:   300
```

For `www` subdomain:
```
Type:  CNAME
Name:  www
Value: [Railway-provided domain].up.railway.app
TTL:   300
```

### SSL
- **Automatic.** Railway provisions an SSL certificate via Let's Encrypt once DNS propagates.
- No manual certificate management needed.
- HTTPS is enforced automatically — HTTP redirects to HTTPS.

### Verification
- DNS propagation takes 5–30 minutes (can take up to 48 hours in rare cases).
- Check: `dig billdog.co.za CNAME` — should return the Railway domain.
- SSL will show as active in Railway dashboard once propagation completes.

---

## 6. Deployment Triggers

### Automatic Deploys
- Every **push to `main`** triggers an automatic deployment.
- Railway pulls the latest code, runs `npm run build`, and if successful, swaps the live service.
- If the build fails, the **previous deploy stays live** — no downtime.

### Manual Deploy
- Railway dashboard → Deployments → **Deploy** button
- Useful for redeploying after environment variable changes

### Rollback
- Railway dashboard → Deployments → click a previous successful deploy → **Redeploy**
- Instantly restores the previous version

---

## 7. Branch Preview Deployments

Feature branches can get preview deployments for testing before merging to `main`.

### Setup
1. Railway dashboard → Billdog service → **Settings**
2. Enable **PR Previews** (or create a separate service linked to feature branches)
3. Each PR gets a unique URL: `billdog-pr-42.up.railway.app`

### Rules
- Preview deployments use the **same environment variables** as production by default — be careful with payment and email services.
- Consider using test/sandbox credentials for preview environments.
- Preview URLs are temporary — they're destroyed when the PR is merged or closed.

---

## 8. Health Checks

Railway pings your service to confirm it's alive.

### Default Behaviour
- Railway sends HTTP requests to `/` (the landing page)
- If the response is `200`, the service is healthy
- If the service fails to respond, Railway restarts it (per `restartPolicyType`)

### Custom Health Check (Optional)
Create a dedicated health endpoint:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
```

Then configure in `railway.toml`:
```toml
[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 30
```

---

## 9. Viewing Logs

### Build Logs
1. Railway dashboard → Billdog service → **Deployments**
2. Click a deployment → **View Build Logs**
3. Shows: dependency installation, build output, TypeScript errors

### Runtime Logs
1. Railway dashboard → Billdog service → **Deployments**
2. Click the active deployment → **View Logs**
3. Shows: `console.log`, request logs, errors, uncaught exceptions

### What to Look For in Failed Builds
| Symptom | Likely Cause |
|---|---|
| `Module not found` | Missing dependency in `package.json` |
| `Type error` | TypeScript strict mode catching issues |
| `NEXT_PUBLIC_* is undefined` | Environment variable not set in Railway |
| `Build exceeded memory` | Too many dependencies or large assets |
| `npm install failed` | Lock file mismatch — delete `node_modules` and `package-lock.json`, reinstall |

---

## 10. Debugging Failed Builds

### Step-by-Step
1. **Read the full build log** — the error is usually in the last 20 lines.
2. **Check environment variables** — a missing `NEXT_PUBLIC_*` at build time causes undefined errors at build, not runtime.
3. **Reproduce locally** — run `npm run build` locally with the same env vars.
4. **Check `next.config.js`** — verify no config is referencing files/paths that don't exist.
5. **Check TypeScript** — `tsc --noEmit` locally to find type errors before pushing.

### Common Fixes
```bash
# Lock file issues
rm -rf node_modules package-lock.json
npm install
npm run build

# Memory issues (large builds)
# In Railway: set NODE_OPTIONS=--max-old-space-size=4096
```

---

## 11. Railway Plan & Cold Starts

### Free / Trial Tier
- Services **sleep after inactivity** — first request takes 5–10 seconds (cold start)
- Monthly execution hour limits
- **Not suitable for production**

### Starter Plan ($5/month)
- **No sleep** — service stays warm
- Enough for early-stage Billdog
- Upgrade before soft launch

### Pro Plan ($20/month)
- Higher resource limits
- Priority support
- Required when traffic grows

**Rule:** Upgrade to Starter plan **before** any user-facing launch. Cold starts on the free tier will kill the first-user experience.

---

## 12. Database — Supabase Is External

Billdog does **not** use a Railway-hosted database. The database is **Supabase** (managed PostgreSQL).

### What This Means
- Do not provision a Railway database service
- Do not add `DATABASE_URL` to Railway environment variables (Supabase handles this)
- All database connectivity goes through Supabase client libraries using `NEXT_PUBLIC_SUPABASE_URL` and keys
- Supabase has its own dashboard for schema management, migrations, and monitoring

### If Someone Suggests a Railway DB
Stop. Ask the user. Billdog's architecture explicitly uses Supabase for database, auth, and storage. A Railway DB would be a duplicate, conflicting data store.

---

## 13. Deployment Checklist

Before the first production deploy:

- [ ] `railway.toml` committed to project root
- [ ] All 14 environment variables set in Railway dashboard
- [ ] `npm run build` succeeds locally
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `.env` is in `.gitignore` (verified)
- [ ] Custom domain added in Railway settings
- [ ] DNS CNAME configured at registrar
- [ ] SSL certificate issued (automatic after DNS propagation)
- [ ] Health check endpoint responds 200
- [ ] Railway plan upgraded from free tier
- [ ] Architecture scanner run, `ARCHITECTURE.md` current
- [ ] Feature Registry (Section 9) statuses are accurate
