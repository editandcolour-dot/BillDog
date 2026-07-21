/**
 * check:schedules — deploy gate for every QStash schedule this system needs.
 *
 * The schedule list lives in code (EXPECTED_SCHEDULES in
 * lib/qstash/schedule-check.ts) so the dashboard can no longer silently
 * drift from what the workers require.
 *
 *   npm run check:schedules            verify (default) — exits:
 *     0  every expected schedule found and active (literal cron + plain English printed)
 *     1  at least one expected schedule missing or paused
 *     2  cannot verify (no QSTASH_TOKEN / API error)
 *
 *   npm run check:schedules -- --create
 *     creates each missing schedule against ${NEXT_PUBLIC_APP_URL}.
 *     Refuses when NEXT_PUBLIC_APP_URL is unset or localhost.
 */
import fs from 'fs';
import path from 'path';
import { getQstashClient } from '../lib/qstash/client';
import {
  findScheduleByPath,
  cronToPlainEnglish,
  EXPECTED_SCHEDULES,
} from '../lib/qstash/schedule-check';

// Load env from .env.local (no dotenv dependency in this repo).
function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();
  const wantCreate = process.argv.includes('--create');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  console.log('── check:schedules ───────────────────────────');

  let schedules: Array<{ scheduleId: string; cron: string; destination: string; paused?: boolean }>;
  try {
    schedules = (await getQstashClient().schedules.list()) as typeof schedules;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Could not list QStash schedules: ${msg}`);
    process.exitCode = 2;
    return;
  }

  console.log(`${schedules.length} schedule(s) registered in QStash:`);
  for (const s of schedules) {
    console.log(`  [${s.scheduleId}] "${s.cron}" -> ${s.destination}${s.paused ? '  (PAUSED)' : ''}`);
  }

  let anyBroken = false;

  for (const expected of EXPECTED_SCHEDULES) {
    console.log(`\nExpected: ${expected.path} — ${expected.purpose}`);
    const found = findScheduleByPath(schedules, expected.path);

    if (!found) {
      if (wantCreate) {
        if (!appUrl || appUrl.includes('localhost')) {
          console.error(`  Refusing to create: NEXT_PUBLIC_APP_URL is ${appUrl ?? 'unset'} — set the production URL first.`);
          process.exitCode = 2;
          return;
        }
        const destination = `${appUrl}${expected.path}`;
        const created = await getQstashClient().schedules.create({
          destination,
          cron: expected.cron,
          retries: 3,
        });
        console.log(`  CREATED [${created.scheduleId}]: "${expected.cron}" -> ${destination}`);
        console.log(`  In plain English: ${cronToPlainEnglish(expected.cron)}`);
        continue;
      }
      console.error(`  MISSING — no schedule targets ${expected.path}. Run with --create to register "${expected.cron}" (${cronToPlainEnglish(expected.cron)}).`);
      anyBroken = true;
      continue;
    }

    console.log(`  FOUND [${found.scheduleId}]`);
    console.log(`  Literal cron:     "${found.cron}"`);
    console.log(`  In plain English: ${cronToPlainEnglish(found.cron)}`);
    console.log(`  Destination:      ${found.destination}`);
    if (appUrl && !found.destination.startsWith(appUrl)) {
      console.warn(`  WARNING: destination host differs from NEXT_PUBLIC_APP_URL (${appUrl}).`);
    }
    if (found.cron !== expected.cron) {
      console.warn(`  NOTE: cron differs from the code expectation "${expected.cron}" — dashboard wins, but confirm it is intentional.`);
    }
    if (found.paused) {
      console.error('  PAUSED — this schedule is NOT firing.');
      anyBroken = true;
    }
  }

  if (anyBroken) {
    process.exitCode = 1;
    return;
  }
  console.log('\nAll expected schedules are present and active.');
  process.exitCode = 0;
}

main();
