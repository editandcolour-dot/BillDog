'use client';

import { useEffect, useState, useCallback } from 'react';

interface ActiveJob {
  id: string;
  job_type: string;
  status: string;
  total_bills: number;
  processed_bills: number;
  created_at: string;
}

interface LastCompleted {
  id: string;
  job_type: string;
  status: string;
  processed_bills: number;
  completed_at: string;
  error_message: string | null;
}

interface JobStatus {
  active_job: ActiveJob | null;
  last_completed: LastCompleted | null;
}

const POLL_INTERVAL = 8000; // 8 seconds

/**
 * ProcessingBanner — shows a progress indicator when a scrape job is running.
 * Polls /api/autofetch/jobs/status every 8 seconds while a job is active.
 * Auto-dismisses when the job completes or after 10 seconds showing "complete".
 */
export function ProcessingBanner() {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/autofetch/jobs/status');
      if (!res.ok) return;
      const data = await res.json();
      setJobStatus(data);
    } catch {
      // Silently fail — banner is non-critical
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while there's an active job
  useEffect(() => {
    if (!jobStatus?.active_job) return;

    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [jobStatus?.active_job, fetchStatus]);

  // When an active job disappears and we have a recent completion, show "complete" briefly
  useEffect(() => {
    if (!jobStatus?.active_job && jobStatus?.last_completed) {
      const completedAt = new Date(jobStatus.last_completed.completed_at).getTime();
      const now = Date.now();
      const minutesAgo = (now - completedAt) / (1000 * 60);

      // Only show "complete" if it finished in the last 5 minutes
      if (minutesAgo < 5) {
        setShowComplete(true);
        const timer = setTimeout(() => {
          setShowComplete(false);
        }, 10000);
        return () => clearTimeout(timer);
      }
    }
  }, [jobStatus]);

  if (dismissed) return null;

  const activeJob = jobStatus?.active_job;

  // Show active job progress
  if (activeJob) {
    const progress = activeJob.total_bills > 0
      ? Math.round((activeJob.processed_bills / activeJob.total_bills) * 100)
      : 0;
    const jobLabel = activeJob.job_type === 'backfill' ? 'Analysing your bill history' : 'Fetching your latest bill';

    return (
      <div className="mb-6 bg-blue/5 border border-blue/20 rounded-xl p-4 flex items-center gap-4 animate-fade-up">
        {/* Spinner */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 border-3 border-blue/30 border-t-blue rounded-full animate-spin" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy">{jobLabel}</p>
          <p className="text-xs text-grey mt-0.5">
            {activeJob.processed_bills} of {activeJob.total_bills} bills processed
          </p>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-blue/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progress, 5)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show brief completion message
  if (showComplete && jobStatus?.last_completed) {
    const lc = jobStatus.last_completed;
    const isFailed = lc.status === 'failed';

    return (
      <div className={`mb-6 rounded-xl p-4 flex items-center justify-between gap-4 animate-fade-up ${
        isFailed
          ? 'bg-red-50 border border-red-200'
          : 'bg-success/5 border border-success/20'
      }`}>
        <div className="flex items-center gap-3">
          {isFailed ? (
            <span className="text-error text-lg">✕</span>
          ) : (
            <span className="text-success text-lg">✓</span>
          )}
          <p className="text-sm font-bold text-navy">
            {isFailed
              ? `Bill fetch failed: ${lc.error_message || 'Unknown error'}`
              : `${lc.processed_bills} bill${lc.processed_bills !== 1 ? 's' : ''} processed successfully`
            }
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs font-bold text-grey hover:text-navy transition-colors uppercase tracking-wide"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return null;
}
