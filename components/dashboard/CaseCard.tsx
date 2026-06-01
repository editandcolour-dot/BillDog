import Link from 'next/link';
import { Case, CaseStatus } from '@/types';

// Map the DB status to a display-friendly label
function getStatusLabel(status: CaseStatus): string {
  const map: Record<CaseStatus, string> = {
    uploading: 'Uploading',
    analysing: 'Analysing',
    letter_ready: 'Letter Ready',
    sent: 'Sent',
    acknowledged: 'Acknowledged',
    escalating: 'Escalating',
    resolved: 'Resolved',
    escalated: 'Escalated',
    closed: 'Closed',
    send_failed: 'Send Failed',
  };
  return map[status] || status;
}

// Map the DB status to design system badge colors
function getStatusClasses(status: CaseStatus): string {
  const map: Record<CaseStatus, string> = {
    uploading: 'bg-grey/10 text-grey',
    analysing: 'bg-blue/10 text-blue',
    letter_ready: 'bg-orange/10 text-orange',
    sent: 'bg-blue/10 text-blue',
    acknowledged: 'bg-blue/10 text-blue', // Map says blue/15 but standard tailwind is blue/10 unless custom defined
    escalating: 'bg-orange/10 text-orange',
    resolved: 'bg-success/10 text-success',
    escalated: 'bg-orange/10 text-orange', // Map says orange/15 but standard tailwind is orange/10
    closed: 'bg-grey/10 text-grey',
    send_failed: 'bg-red-500/10 text-red-500',
  };
  return map[status] || 'bg-light-grey text-navy';
}

// Deterministic ZAR formatter — Intl.NumberFormat('en-ZA') yields different
// glyphs in Node ICU vs browser ICU (e.g. "R 128 500,34" vs "R 128,500.34"),
// which causes React hydration mismatches. We format by hand so SSR === CSR.
function formatCurrency(amount: number | null): string {
  if (amount === null) return 'R 0.00';
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const [whole, fraction = '00'] = abs.toFixed(2).split('.');
  const withSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${negative ? '-' : ''}R ${withSeparators}.${fraction}`;
}

// Deterministic short-date formatter — same reasoning as formatCurrency.
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Render dates in Africa/Johannesburg (SAST = UTC+2, no DST) deterministically
// on both server and client. Shift the timestamp by +2h then read UTC fields —
// avoids Intl/toLocaleString drift between Node ICU and browser ICU.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
function formatRegisteredDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const sast = new Date(d.getTime() + SAST_OFFSET_MS);
  return `${sast.getUTCDate()} ${MONTHS_SHORT[sast.getUTCMonth()]} ${sast.getUTCFullYear()}`;
}

// Progress stepper — maps case status to a linear stage.
// "Awaiting" replaces the ambiguous "Response" — it's the active state after
// the letter is sent and before the municipality responds.
// Stage 6 uses a two-line label "Letter / Resolved" both to read more
// naturally ("their letter is resolved") and to stop "Resolved" crashing into
// "Awaiting" in narrow cards.
const STAGES = ['Upload', 'Analysis', 'Letter', 'Sent', 'Awaiting', 'Letter\nResolved'] as const;

function getStageIndex(status: CaseStatus): number {
  const map: Record<CaseStatus, number> = {
    uploading: 0,
    analysing: 1,
    letter_ready: 2,
    // `sent` means the letter has shipped — Sent is COMPLETE and we are now
    // actively awaiting a response. So the current stage is 4, not 3.
    sent: 4,
    acknowledged: 4,
    escalating: 4,
    escalated: 4,
    resolved: 5,
    closed: 5,
    send_failed: 2, // Failed at send — still at letter stage
  };
  return map[status] ?? 0;
}

export function CaseCard({ caseRecord }: { caseRecord: Case }) {
  const statusClasses = getStatusClasses(caseRecord.status);
  const currentStage = getStageIndex(caseRecord.status);
  
  return (
    <Link 
      href={`/case/${caseRecord.id}`}
      className="block bg-white border border-light-grey rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="block mb-1 text-xs font-bold uppercase tracking-[0.15em] text-orange">
            {caseRecord.municipality || 'Unknown Municipality'}
          </span>
          <h3 className="font-display text-xl text-navy tracking-wide line-clamp-1">
            Account {caseRecord.account_number}
          </h3>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusClasses}`}>
          {getStatusLabel(caseRecord.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-grey mb-1">Period</p>
          <p className="font-body text-sm text-navy font-medium truncate">{caseRecord.bill_period || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-grey mb-1">Total</p>
          <p className="font-body text-sm text-navy font-bold tabular-nums">{formatCurrency(caseRecord.total_billed)}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wide text-grey mb-1">Registered</p>
          <p className="font-body text-sm text-navy font-medium">{formatRegisteredDate(caseRecord.created_at)}</p>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="mb-4 pt-3 border-t border-light-grey">
        <div className="flex items-start justify-between gap-1.5">
          {STAGES.map((stage, i) => {
            const isCompleted = i < currentStage;
            const isCurrent = i === currentStage;
            return (
              <div key={stage} className="flex flex-col items-center flex-1 min-w-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isCompleted
                    ? 'bg-success text-white'
                    : isCurrent
                    ? 'bg-orange text-white animate-pulse'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  {isCompleted ? '✓' : (i + 1)}
                </div>
                <span className={`mt-1 text-[9px] font-bold uppercase tracking-wide leading-tight text-center whitespace-pre-line ${
                  isCompleted ? 'text-success' : isCurrent ? 'text-orange' : 'text-slate-300'
                }`}>
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-light-grey flex justify-between items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-grey mb-1">Recoverable</p>
          <p className="font-body text-lg text-success font-bold">{formatCurrency(caseRecord.recoverable)}</p>
        </div>
        <div className="text-blue text-sm font-bold group-hover:translate-x-1 transition-transform">
          View Detail →
        </div>
      </div>
    </Link>
  );
}
