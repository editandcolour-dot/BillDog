/**
 * Pure helpers for verifying the autofetch QStash schedules.
 * Used by scripts/check-schedules.ts (the deploy gate) and unit tests —
 * no network or env access here.
 */

export const DAILY_WORKER_PATH = '/api/autofetch/worker/daily';
export const MONTHLY_ALERT_PATH = '/api/autofetch/worker/monthly-alert';

export interface ScheduleExpectation {
  path: string;        // worker route pathname
  cron: string;        // UTC cron the schedule should run on
  purpose: string;     // one-line human description for gate output
}

/**
 * Every QStash schedule this system requires. check:schedules verifies each
 * and (with --create) registers the missing ones — the single code-side truth
 * for what must exist in the dashboard.
 */
export const EXPECTED_SCHEDULES: ScheduleExpectation[] = [
  {
    path: DAILY_WORKER_PATH,
    cron: '0 4 * * *', // 04:00 UTC = 06:00 SAST
    purpose: 'daily autofetch dispatcher (fans out due credentials to fetch-latest)',
  },
  {
    path: MONTHLY_ALERT_PATH,
    cron: '0 5 * * *', // 05:00 UTC = 07:00 SAST, an hour after the dispatcher
    purpose: 'failure-rate admin alert (100% failed fetch jobs in 24h)',
  },
];

/**
 * Find the schedule whose destination targets the given worker path.
 * Matches by URL pathname (never substring) so a look-alike destination
 * cannot satisfy the gate.
 */
export function findScheduleByPath<T extends { destination: string }>(
  schedules: T[],
  workerPath: string
): T | null {
  for (const s of schedules) {
    try {
      if (new URL(s.destination).pathname === workerPath) return s;
    } catch {
      // Not a parseable URL — cannot be a valid destination match.
    }
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Plain-English rendering of the common 5-field cron shapes. QStash crons run
 * in UTC; South Africa is UTC+2 with no DST, so the SAST equivalent is shown
 * for the time-of-day shapes. Unrecognised input is flagged, never guessed.
 */
export function cronToPlainEnglish(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return `"${cron}" (unrecognised cron format)`;
  const [min, hour, dom, mon, dow] = parts;

  const timePhrase = (h: number, m: number) =>
    `${pad(h)}:${pad(m)} UTC (${pad((h + 2) % 24)}:${pad(m)} SAST)`;

  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && mon === '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(min, 10);
    if (dom === '*' && dow === '*') return `daily at ${timePhrase(h, m)}`;
    if (/^\d+$/.test(dom) && dow === '*') return `monthly on day ${parseInt(dom, 10)} at ${timePhrase(h, m)}`;
    if (dom === '*' && /^\d+$/.test(dow)) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `weekly on ${days[parseInt(dow, 10) % 7]} at ${timePhrase(h, m)}`;
    }
  }

  if (/^\*\/\d+$/.test(min) && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return `every ${min.slice(2)} minutes`;
  }

  return `"${cron}" (custom schedule, UTC)`;
}
