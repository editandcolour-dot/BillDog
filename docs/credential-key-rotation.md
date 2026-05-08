# Credential Encryption Key Rotation Runbook

> **Purpose:** Rotate the AES-256-GCM key used to encrypt municipal portal credentials.
> **Frequency:** Manual, as needed (key compromise, scheduled rotation policy).
> **Owner:** Jason / infrastructure lead.

---

## Prerequisites

- Access to Railway dashboard (production environment variables)
- Access to Supabase dashboard or `psql` connection (to run queries)
- Node.js 20+ installed locally
- `.env.local` with current `MUNICIPAL_CRED_ENCRYPTION_KEY` and Supabase service role key

---

## Procedure

### Step 1: Generate New Key

```bash
openssl rand -hex 32
```

Save the output. This is your new key. **Do not commit it anywhere.**

### Step 2: Run Rotation Script

```bash
# From project root
MUNICIPAL_CRED_ENCRYPTION_KEY_OLD=<current_key> \
MUNICIPAL_CRED_ENCRYPTION_KEY_NEW=<new_key> \
npx tsx scripts/rotate-credential-key.ts
```

The script (to be created alongside this runbook when rotation is first needed):
1. Connects to Supabase via service role
2. Reads all non-revoked `municipal_credentials` rows
3. For each row: decrypt with old key → re-encrypt with new key → update row
4. Reports: total rows, success count, failure count

### Step 3: Update Railway Environment

1. Open Railway dashboard → Service → Variables
2. Click **"+ New Variable"** (do NOT use Raw Editor — known Railway bug)
3. Set `MUNICIPAL_CRED_ENCRYPTION_KEY` = `<new_key>`
4. Click **Deploy** to trigger redeployment

### Step 4: Verify

After deployment completes:

1. **Existing credentials:** Hit `GET /api/autofetch/jobs` for a test user — should return without errors (proves decryption works)
2. **New credentials:** Submit test credentials via `POST /api/autofetch/credentials` — should encrypt with new key and verify successfully
3. **Spot check:** Query a `municipal_credentials` row and confirm `encrypted_credentials` and `encryption_iv` are present and non-null

### Step 5: Retain Old Key (24h Rollback Window)

Keep the old key in a secure location (password manager, not in code) for **24 hours**.

If any decryption failures surface in logs within 24h:
1. Revert `MUNICIPAL_CRED_ENCRYPTION_KEY` in Railway to the old key
2. Investigate which rows failed rotation
3. Re-run rotation script for failed rows
4. Re-deploy with new key

### Step 6: Destroy Old Key

After 24h with zero decryption errors:
- Delete the old key from your password manager / secure storage
- It should no longer exist anywhere

---

## Failure Scenarios

| Scenario | Action |
|---|---|
| Rotation script fails mid-run | Re-run — script is idempotent (decrypt-old then encrypt-new per row) |
| Railway deployment fails | Old key is still active, no data loss |
| Decryption errors after deploy | Revert Railway env to old key, investigate |
| Key compromise suspected | Rotate immediately, then notify affected users to update portal passwords |

---

## Security Notes

- The rotation script must run in a trusted environment (local machine or secure CI, never in browser)
- Never log either the old or new key
- Never store keys in version control, `.env` files committed to git, or chat logs
- The old key and new key should never both be present in Railway env vars simultaneously
