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
    closed: 'Closed'
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
    closed: 'bg-grey/10 text-grey'
  };
  return map[status] || 'bg-light-grey text-navy';
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return 'R0.00';
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

export function CaseCard({ caseRecord }: { caseRecord: Case }) {
  const statusClasses = getStatusClasses(caseRecord.status);
  
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

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-grey mb-1">Period</p>
          <p className="font-body text-base text-navy font-medium">{caseRecord.bill_period || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-grey mb-1">Total</p>
          <p className="font-body text-base text-navy font-medium">{formatCurrency(caseRecord.total_billed)}</p>
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
