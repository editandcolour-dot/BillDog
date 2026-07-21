import { describe, it, expect } from 'vitest';
import {
  findScheduleByPath,
  cronToPlainEnglish,
  EXPECTED_SCHEDULES,
  DAILY_WORKER_PATH,
} from '@/lib/qstash/schedule-check';

describe('cronToPlainEnglish', () => {
  it('translates a daily cron with the SAST equivalent', () => {
    expect(cronToPlainEnglish('0 4 * * *')).toBe('daily at 04:00 UTC (06:00 SAST)');
  });

  it('wraps SAST past midnight correctly', () => {
    expect(cronToPlainEnglish('30 22 * * *')).toBe('daily at 22:30 UTC (00:30 SAST)');
  });

  it('describes a monthly cron', () => {
    expect(cronToPlainEnglish('0 4 1 * *')).toBe('monthly on day 1 at 04:00 UTC (06:00 SAST)');
  });

  it('describes an every-N-minutes cron', () => {
    expect(cronToPlainEnglish('*/15 * * * *')).toBe('every 15 minutes');
  });

  it('flags unrecognised input instead of guessing', () => {
    expect(cronToPlainEnglish('garbage')).toContain('unrecognised');
  });
});

describe('findScheduleByPath', () => {
  const daily = { destination: 'https://billdog.co.za/api/autofetch/worker/daily', cron: '0 4 * * *' };
  const alert = { destination: 'https://billdog.co.za/api/autofetch/worker/monthly-alert', cron: '0 5 * * *' };

  it('finds the schedule targeting the requested worker path', () => {
    expect(findScheduleByPath([alert, daily], DAILY_WORKER_PATH)).toBe(daily);
    expect(findScheduleByPath([alert, daily], '/api/autofetch/worker/monthly-alert')).toBe(alert);
  });

  it('matches by URL pathname, not substring', () => {
    const decoy = { destination: 'https://evil.example/api/autofetch/worker/daily-fake', cron: '0 4 * * *' };
    expect(findScheduleByPath([decoy], DAILY_WORKER_PATH)).toBeNull();
  });

  it('returns null when nothing targets the path', () => {
    expect(findScheduleByPath([alert], DAILY_WORKER_PATH)).toBeNull();
  });
});

describe('EXPECTED_SCHEDULES', () => {
  it('expects the daily dispatcher at 04:00 UTC and monthly-alert at 05:00 UTC', () => {
    const byPath = Object.fromEntries(EXPECTED_SCHEDULES.map(e => [e.path, e.cron]));
    expect(byPath['/api/autofetch/worker/daily']).toBe('0 4 * * *');
    expect(byPath['/api/autofetch/worker/monthly-alert']).toBe('0 5 * * *');
  });

  it('every expectation targets an autofetch worker and has a translatable cron', () => {
    for (const e of EXPECTED_SCHEDULES) {
      expect(e.path.startsWith('/api/autofetch/worker/')).toBe(true);
      expect(cronToPlainEnglish(e.cron)).not.toContain('unrecognised');
    }
  });
});
