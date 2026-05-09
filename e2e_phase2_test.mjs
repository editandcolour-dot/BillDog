/**
 * Phase 2 E2E Test Script — Run against live Railway
 *
 * Auth: admin magic link OTP → session → Supabase SSR cookies
 * (Exact same approach proven in Phase 1 E2E.)
 *
 * Usage:
 *   node e2e_phase2_test.mjs              — Tests 1, 3, 4, 5, 6
 *   node e2e_phase2_test.mjs 1            — Test 1 only (fetchLatestBill)
 *   node e2e_phase2_test.mjs 2            — Test 2 only (fetchBillHistory 36mo)
 *   node e2e_phase2_test.mjs history      — Alias for Test 2
 *
 * SECURITY: Portal credentials never logged. Only loaded from .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ssrUtils = require('@supabase/ssr/dist/main/utils');

// ============================================================================
// Load .env.local
// ============================================================================

const envFile = readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) return;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (val) env[key] = val;
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = 'https://www.billdog.co.za';
const JASON_EMAIL = 'jason.ripplemedia@gmail.com';
const COCT_MUNICIPALITY_ID = 'f3761d68-8358-496a-8294-accfb839114d';

const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];
const COOKIE_BASE = `sb-${PROJECT_REF}-auth-token`;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================================
// Auth — admin OTP → session → Supabase SSR cookies (proven in Phase 1)
// ============================================================================

async function getAuthCookie() {
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: JASON_EMAIL,
  });
  if (linkErr) throw new Error(`Magic link failed: ${linkErr.message}`);

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authErr } = await anonClient.auth.verifyOtp({
    email: JASON_EMAIL,
    token: linkData.properties.email_otp,
    type: 'magiclink',
  });
  if (authErr) throw new Error(`OTP verify failed: ${authErr.message}`);

  const session = authData.session;
  console.log(`✅ Authenticated as ${authData.user.email} (${authData.user.id})`);

  const sessionJSON = JSON.stringify(session);
  const encoded = 'base64-' + ssrUtils.stringToBase64URL(sessionJSON);
  const chunks = ssrUtils.createChunks(COOKIE_BASE, encoded);
  const cookieStr = chunks.map(c => `${c.name}=${c.value}`).join('; ');
  console.log(`   Cookie: ${chunks.length} chunk(s), ${cookieStr.length} chars total`);

  return { cookieStr, userId: authData.user.id };
}

// ============================================================================
// HTTP helper
// ============================================================================

async function api(method, path, body, cookieStr, timeoutMs = 120_000) {
  const url = `${APP_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieStr },
      signal: controller.signal,
    };
    if (body) options.body = JSON.stringify(body);

    const start = Date.now();
    const res = await fetch(url, options);
    const elapsed = Date.now() - start;

    let data;
    try { data = await res.json(); } catch { data = null; }

    return { status: res.status, data, elapsed };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Test 1: fetchLatestBill (debug endpoint)
// ============================================================================

async function test1(cookieStr) {
  console.log('\n══════════════════════════════════════════');
  console.log('  TEST 1: fetchLatestBill (direct scraper)');
  console.log('══════════════════════════════════════════\n');

  const { status, data, elapsed } = await api(
    'POST',
    '/api/autofetch/debug/test-scraper',
    { method: 'fetchLatestBill', portal_username: env.TEST_COCT_USERNAME, portal_password: env.TEST_COCT_PASSWORD },
    cookieStr,
    180_000
  );

  console.log(`Status: ${status} (${elapsed}ms)`);
  console.log('Response:', JSON.stringify(data, null, 2));

  const pass = status === 200 && data?.success === true;
  console.log(pass ? '\n✅ TEST 1 PASSED' : '\n❌ TEST 1 FAILED');
  return {
    pass,
    period: data?.bill?.period || 'N/A',
    filename: data?.bill?.filename || 'N/A',
    sizeBytes: data?.bill?.size_bytes || 0,
    elapsed,
  };
}

// ============================================================================
// Test 2: fetchBillHistory 36 months (debug endpoint)
// ============================================================================

async function test2(cookieStr) {
  console.log('\n══════════════════════════════════════════');
  console.log('  TEST 2: fetchBillHistory (36 months)');
  console.log('══════════════════════════════════════════\n');

  console.log('⏳ This test downloads up to 36 bills sequentially (2s delay each).');
  console.log('   Expected: 2-10 minutes depending on bill count.\n');

  const { status, data, elapsed } = await api(
    'POST',
    '/api/autofetch/debug/test-scraper',
    { method: 'fetchBillHistory', monthsBack: 36, portal_username: env.TEST_COCT_USERNAME, portal_password: env.TEST_COCT_PASSWORD },
    cookieStr,
    600_000 // 10 min timeout
  );

  console.log(`Status: ${status} (${elapsed}ms = ${(elapsed / 1000).toFixed(1)}s)`);
  if (data?.bills) {
    console.log(`Bills found: ${data.bill_count}`);
    data.bills.forEach((b, i) => {
      console.log(`  ${i + 1}. period="${b.period}", file="${b.filename}", size=${b.size_bytes} bytes`);
    });
  } else {
    console.log('Response:', JSON.stringify(data, null, 2));
  }

  const pass = status === 200 && data?.success === true;
  console.log(pass ? '\n✅ TEST 2 PASSED' : '\n❌ TEST 2 FAILED');
  return {
    pass,
    billCount: data?.bill_count || 0,
    bills: data?.bills || [],
    elapsed,
  };
}

// ============================================================================
// Test 3: Worker route — POST /api/autofetch/worker/fetch-latest
// ============================================================================

async function test3(cookieStr, userId) {
  console.log('\n══════════════════════════════════════════');
  console.log('  TEST 3: Worker fetch-latest (full pipeline)');
  console.log('══════════════════════════════════════════\n');

  // Step 0: Ensure consent exists (required by credential endpoint)
  console.log('Step 3a: Ensuring autofetch consent...');
  const { status: consentStatus } = await api(
    'POST', '/api/autofetch/consent', {}, cookieStr
  );
  console.log(`Consent: ${consentStatus}`);

  // Step A: Re-create credential (Phase 1 revoked it)
  console.log('\nStep 3b: Creating fresh credential...');
  const portalUser = env.TEST_COCT_USERNAME;
  const portalPass = env.TEST_COCT_PASSWORD;

  if (!portalUser || !portalPass) {
    console.error('❌ TEST_COCT_USERNAME and TEST_COCT_PASSWORD must be set in .env.local');
    return { pass: false, error: 'missing env vars' };
  }

  const { status: credStatus, data: credData, elapsed: credElapsed } = await api(
    'POST',
    '/api/autofetch/credentials',
    {
      municipality_id: COCT_MUNICIPALITY_ID,
      portal_username: portalUser,
      portal_password: portalPass,
    },
    cookieStr,
    180_000
  );

  console.log(`Credential creation: ${credStatus} (${credElapsed}ms)`);
  console.log('Response:', JSON.stringify(credData, null, 2));

  if (credStatus !== 200 || !credData?.credential_id) {
    console.error('❌ Credential creation failed — cannot continue');
    return { pass: false, credStatus, credData };
  }

  const credentialId = credData.credential_id;
  console.log(`\nCredential ID: ${credentialId}`);

  // Step B: Call worker
  console.log('\nStep 3b: Calling worker/fetch-latest...');
  const { status, data, elapsed } = await api(
    'POST',
    '/api/autofetch/worker/fetch-latest',
    { credential_id: credentialId },
    cookieStr,
    180_000
  );

  console.log(`Worker: ${status} (${elapsed}ms)`);
  console.log('Response:', JSON.stringify(data, null, 2));

  // Step C: Verify DB state
  console.log('\nStep 3c: Verifying DB state...');

  if (data?.case_bill_id) {
    const { data: caseBill } = await adminClient
      .from('case_bills')
      .select('id, case_id, bill_url, bill_period, parse_status, analysis_status, original_filename, file_size_bytes')
      .eq('id', data.case_bill_id)
      .single();
    console.log('case_bills row:', JSON.stringify(caseBill, null, 2));
  }

  if (data?.job_id) {
    const { data: scrapedBill } = await adminClient
      .from('scraped_bills')
      .select('id, job_id, bill_period, status, bill_url, case_bill_id')
      .eq('job_id', data.job_id)
      .limit(1)
      .single();
    console.log('scraped_bills row:', JSON.stringify(scrapedBill, null, 2));

    const { data: job } = await adminClient
      .from('scrape_jobs')
      .select('id, status, processed_bills, total_bills, completed_at')
      .eq('id', data.job_id)
      .single();
    console.log('scrape_jobs row:', JSON.stringify(job, null, 2));
  }

  const pass = status === 200 && data?.success === true;
  console.log(pass ? '\n✅ TEST 3 PASSED' : '\n❌ TEST 3 FAILED');
  return { pass, credentialId, data, elapsed };
}

// ============================================================================
// Test 4: Dedup — second worker call should skip
// ============================================================================

async function test4(cookieStr, credentialId) {
  console.log('\n══════════════════════════════════════════');
  console.log('  TEST 4: Dedup verification');
  console.log('══════════════════════════════════════════\n');

  if (!credentialId) {
    console.error('❌ No credential ID from Test 3');
    return { pass: false };
  }

  console.log('Calling worker again with same credential...');
  const { status, data, elapsed } = await api(
    'POST',
    '/api/autofetch/worker/fetch-latest',
    { credential_id: credentialId },
    cookieStr,
    180_000
  );

  console.log(`Status: ${status} (${elapsed}ms)`);
  console.log('Response:', JSON.stringify(data, null, 2));

  // Should be 200 with skipped=true
  const pass = status === 200 && data?.success === true && data?.skipped === true;
  console.log(pass ? '\n✅ TEST 4 PASSED' : '\n❌ TEST 4 FAILED');
  return { pass, skipped: data?.skipped, message: data?.message, elapsed };
}

// ============================================================================
// Test 5: GET /api/autofetch/jobs
// ============================================================================

async function test5(cookieStr, credentialId) {
  console.log('\n══════════════════════════════════════════');
  console.log('  TEST 5: GET /api/autofetch/jobs');
  console.log('══════════════════════════════════════════\n');

  // Unfiltered
  const { status, data, elapsed } = await api('GET', '/api/autofetch/jobs', null, cookieStr);
  console.log(`Status: ${status} (${elapsed}ms)`);
  console.log(`Jobs count: ${data?.jobs?.length || 0}`);
  (data?.jobs || []).forEach((j, i) => {
    console.log(`  ${i + 1}. id=${j.id}, type=${j.job_type}, status=${j.status}, processed=${j.processed_bills}/${j.total_bills}`);
  });

  // Filtered
  if (credentialId) {
    const { status: fStatus, data: fData } = await api(
      'GET', `/api/autofetch/jobs?credential_id=${credentialId}`, null, cookieStr
    );
    console.log(`\nFiltered (credential_id): ${fStatus}, count=${fData?.jobs?.length || 0}`);
  }

  const pass = status === 200 && Array.isArray(data?.jobs);
  console.log(pass ? '\n✅ TEST 5 PASSED' : '\n❌ TEST 5 FAILED');
  return { pass, jobCount: data?.jobs?.length || 0, elapsed };
}

// ============================================================================
// Test 6: Retry rate limiting
// ============================================================================

async function test6(cookieStr, userId) {
  console.log('\n══════════════════════════════════════════');
  console.log('  TEST 6: Retry rate limiting');
  console.log('══════════════════════════════════════════\n');

  // Find a job to mark as failed
  const { data: jobs } = await adminClient
    .from('scrape_jobs')
    .select('id, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!jobs?.length) {
    console.error('❌ No jobs found to test retry');
    return { pass: false };
  }

  const testJobId = jobs[0].id;
  console.log(`Using job ${testJobId} (current status: ${jobs[0].status})`);

  // Mark as failed
  if (jobs[0].status !== 'failed') {
    await adminClient
      .from('scrape_jobs')
      .update({ status: 'failed', error_message: 'Manually failed for retry test' })
      .eq('id', testJobId);
    console.log('Marked as failed for testing');
  }

  // 4 retries
  const retries = [];
  for (let i = 1; i <= 4; i++) {
    const { status, data, elapsed } = await api(
      'POST', `/api/autofetch/jobs/${testJobId}/retry`, {}, cookieStr
    );
    console.log(`  Retry ${i}: ${status} (${elapsed}ms) — ${JSON.stringify(data)}`);
    retries.push({ attempt: i, status });
  }

  const first3 = retries.slice(0, 3).every(r => r.status === 200);
  const fourthIs429 = retries[3]?.status === 429;

  console.log(`\nFirst 3 succeeded: ${first3}`);
  console.log(`4th returned 429: ${fourthIs429}`);

  const pass = first3 && fourthIs429;
  console.log(pass ? '\n✅ TEST 6 PASSED' : '\n❌ TEST 6 FAILED');
  return { pass, retries };
}

// ============================================================================
// Main
// ============================================================================

const testArg = process.argv[2] || 'fast';

try {
  const { cookieStr, userId } = await getAuthCookie();
  const results = {};

  if (testArg === '1') {
    results.test1 = await test1(cookieStr);
  } else if (testArg === '2' || testArg === 'history') {
    results.test2 = await test2(cookieStr);
  } else if (testArg === 'fast' || testArg === 'all') {
    // Test 1: fetchLatestBill
    results.test1 = await test1(cookieStr);

    // Test 2: skip by default (too long), include if 'all'
    if (testArg === 'all') {
      results.test2 = await test2(cookieStr);
    } else {
      console.log('\n⏭️  Test 2 (fetchBillHistory 36mo) skipped — use "all" or "2" to run');
    }

    // Test 3: Worker
    results.test3 = await test3(cookieStr, userId);
    const credentialId = results.test3?.credentialId;

    // Test 4: Dedup
    if (credentialId) {
      results.test4 = await test4(cookieStr, credentialId);
    }

    // Test 5: GET jobs
    results.test5 = await test5(cookieStr, credentialId);

    // Test 6: Retry rate limit
    results.test6 = await test6(cookieStr, userId);
  }

  // Summary
  console.log('\n══════════════════════════════════════════');
  console.log('  RESULTS SUMMARY');
  console.log('══════════════════════════════════════════\n');
  for (const [test, result] of Object.entries(results)) {
    const icon = result.pass === true ? '✅' : result.pass === 'skipped' ? '⏭️' : '❌';
    console.log(`  ${icon} ${test}: ${result.pass ? 'PASSED' : 'FAILED'}`);
    if (result.period) console.log(`     period: ${result.period}`);
    if (result.billCount != null) console.log(`     bills: ${result.billCount}`);
    if (result.elapsed) console.log(`     elapsed: ${(result.elapsed / 1000).toFixed(1)}s`);
  }

} catch (err) {
  console.error('FATAL:', err.message);
  process.exit(1);
}
