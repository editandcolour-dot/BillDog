import { describe, it, expect } from 'vitest';
import { findDailySchedule, cronToPlainEnglish } from '@/lib/qstash/schedule-check';

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

describe('findDailySchedule', () => {
  const daily = { destination: 'https://billdog.co.za/api/autofetch/worker/daily', cron: '0 4 * * *' };
  const other = { destination: 'https://billdog.co.za/api/autofetch/worker/monthly-alert', cron: '0 6 * * *' };

  it('finds the schedule targeting the daily worker path', () => {
    expect(findDailySchedule([other, daily])).toBe(daily);
  });

  it('matches by URL pathname, not substring', () => {
    const decoy = { destination: 'https://evil.example/api/autofetch/worker/daily-fake', cron: '0 4 * * *' };
    expect(findDailySchedule([decoy])).toBeNull();
  });

  it('returns null when nothing targets the daily worker', () => {
    expect(findDailySchedule([other])).toBeNull();
  });
});
