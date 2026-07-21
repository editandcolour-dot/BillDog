/**
 * check:schedules — deploy gate for the autofetch daily trigger.
 *
 * The daily dispatcher (/api/autofetch/worker/daily) is fired by a QStash
 * schedule that historically existed ONLY in the Upstash dashboard — invisible
 * to the repo, unverifiable, and silently able to rot. This script makes it
 * observable:
 *
 *   npm run check:schedules            verify (default) — exits:
 *     0  schedule found and active (prints literal cron + plain English)
 *     1  schedule missing or paused
 *     2  cannot verify (no QSTASH_TOKEN / API error)
 *
 *   npm run check:schedules -- --create
 *     creates the missing schedule: cron "0 4 * * *" (daily 04:00 UTC =
 *     06:00 SAST) -> ${NEXT_PUBLIC_APP_URL}/api/autofetch/worker/daily.
 *     Refuses when NEXT_PUBLIC_APP_URL is unset or localhost.
 */
import fs from 'fs';
import path from 'path';
import { getQstashClient } from '../lib/qstash/client';
import {
  findDailySchedule,
  cronToPlainEnglish,
  DAILY_WORKER_PATH,
} from '../lib/qstash/schedule-check';

const DAILY_CRON = '0 4 * * *'; // 04:00 UTC = 06:00 SAST, no DST in SA

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

  const daily = findDailySchedule(schedules);

  if (!daily) {
    if (wantCreate) {
      if (!appUrl || appUrl.includes('localhost')) {
        console.error(`Refusing to create: NEXT_PUBLIC_APP_URL is ${appUrl ?? 'unset'} — set the production URL first.`);
        process.exitCode = 2;
        return;
      }
      const destination = `${appUrl}${DAILY_WORKER_PATH}`;
      const created = await getQstashClient().schedules.create({
        destination,
        cron: DAILY_CRON,
        retries: 3,
      });
      console.log(`CREATED schedule ${created.scheduleId}: "${DAILY_CRON}" -> ${destination}`);
      console.log(`  In plain English: ${cronToPlainEnglish(DAILY_CRON)}`);
      process.exitCode = 0;
      return;
    }
    console.error(`MISSING: no QStash schedule targets ${DAILY_WORKER_PATH} — the daily autofetch loop has NO trigger.`);
    console.error('Run with --create to register it (cron "0 4 * * *", daily 04:00 UTC / 06:00 SAST).');
    process.exitCode = 1;
    return;
  }

  console.log(`FOUND daily dispatcher schedule [${daily.scheduleId}]`);
  console.log(`  Literal cron:     "${daily.cron}"`);
  console.log(`  In plain English: ${cronToPlainEnglish(daily.cron)}`);
  console.log(`  Destination:      ${daily.destination}`);
  if (appUrl && !daily.destination.startsWith(appUrl)) {
    console.warn(`  WARNING: destination host differs from NEXT_PUBLIC_APP_URL (${appUrl}).`);
  }
  if (daily.paused) {
    console.error('  PAUSED — the daily loop is NOT firing.');
    process.exitCode = 1;
    return;
  }
  console.log('Schedule is present and active.');
  process.exitCode = 0;
}

main();
