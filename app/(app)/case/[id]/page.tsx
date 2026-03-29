import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { CaseTimeline } from '@/components/dashboard/CaseTimeline';
import { Case, CaseEvent } from '@/types';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, ShieldAlert } from 'lucide-react';

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the specific case along with user ownership verification via RLS
  const { data: caseRecord, error: caseError } = await supabase
    .from('cases')
    .select('*')
    .eq('id', params.id)
    .single();

  if (caseError || !caseRecord || caseRecord.user_id !== user.id) {
    notFound();
  }

  // Fetch the events sequence
  const { data: events } = await supabase
    .from('case_events')
    .select('*')
    .eq('case_id', params.id)
    .order('created_at', { ascending: true });

  const caseEventsData = (events || []) as CaseEvent[];
  const c = caseRecord as Case;

  const totalBilled = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(c.total_billed || 0);
  const totalRecoverable = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(c.recoverable || 0);

  return (
    <main className="min-h-screen bg-off-white py-12 md:py-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%] animate-fade-up">
        
        {/* Breadcrumb / Back Navigation */}
        <Link 
          href="/dashboard"
          className="inline-flex items-center text-sm font-bold uppercase tracking-wide text-grey hover:text-navy transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
        
        {/* Top Header Section */}
        <div className="bg-navy rounded-3xl p-8 md:p-12 mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          
          <div className="relative z-10 w-full md:w-2/3">
            <span className="inline-flex px-3 py-1 bg-white/10 text-white border border-white/20 rounded-full text-xs font-bold uppercase tracking-wide mb-6">
              Case {c.id.split('-')[0]}
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-white uppercase tracking-wide leading-[1.1]">
              Account {c.account_number}
            </h1>
            <p className="font-body text-white/70 text-lg mt-2">
              Disputing {c.municipality} for period: <span className="text-white font-bold">{c.bill_period || 'Unknown'}</span>
            </p>
          </div>

          <div className="relative z-10 bg-white/10 border border-white/20 p-6 rounded-2xl min-w-[240px]">
            <p className="text-xs font-bold uppercase tracking-wide text-white/70 mb-1">Potential Recovery</p>
            <p className="font-display text-4xl text-success tracking-wide">{totalRecoverable}</p>
            
            <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center text-sm">
              <span className="text-white/70">Total Billed:</span>
              <span className="text-white font-bold">{totalBilled}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Timeline Column */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-light-grey rounded-3xl p-8 md:p-10 mb-8">
              <h2 className="font-display text-2xl md:text-3xl text-navy uppercase tracking-wide mb-8">
                Execution Timeline
              </h2>
              
              {!caseEventsData.length ? (
                <div className="bg-off-white text-grey p-6 rounded-xl text-center font-body text-sm border border-light-grey">
                  No timeline events recorded yet.
                </div>
              ) : (
                <CaseTimeline events={caseEventsData} />
              )}
            </div>
          </div>

          {/* Sidebar Metrics/Details Column */}
          <div className="space-y-8">
            <div className="bg-white border border-light-grey rounded-2xl p-6 md:p-8">
              <h3 className="font-display text-xl text-navy uppercase tracking-wide mb-6 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange" />
                Case Metadata
              </h3>
              
              <ul className="space-y-5 text-sm font-body">
                <li className="flex flex-col gap-1">
                  <span className="text-grey uppercase font-bold text-xs tracking-wide">Status</span>
                  <span className="text-navy font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue" />
                    {c.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="text-grey uppercase font-bold text-xs tracking-wide">Created</span>
                  <span className="text-navy font-medium">
                    {new Date(c.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </li>
                {c.letter_sent_at && (
                  <li className="flex flex-col gap-1">
                    <span className="text-grey uppercase font-bold text-xs tracking-wide">Letter Sent On</span>
                    <span className="text-navy font-medium text-blue">
                      {new Date(c.letter_sent_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </li>
                )}
                <li className="flex flex-col gap-1">
                  <span className="text-grey uppercase font-bold text-xs tracking-wide">Recipient Email</span>
                  <span className="text-navy font-medium">
                    {c.municipality_email || 'Awaiting dispatch'}
                  </span>
                </li>
              </ul>
            </div>

            {/* Quick Actions / Link back to generated letter if appropriate */}
            {(c.status === 'letter_ready' || c.status === 'sent') && (
              <div className="bg-navy rounded-2xl p-6 md:p-8 relative overflow-hidden text-center">
                <h3 className="font-display text-2xl text-white uppercase tracking-wide mb-3">View Letter</h3>
                <p className="text-white/70 text-sm mb-6 font-body">Review the legal arguments generated by Billdog for this specific dispute.</p>
                <Link 
                  href={`/letter/${c.id}`}
                  className="bg-white hover:bg-off-white text-navy font-bold uppercase tracking-wide text-sm py-3 px-6 rounded-md w-full inline-flex justify-center transition-all hover:shadow-lg"
                >
                  Open Dispute Draft <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </div>
            )}
            
          </div>

        </div>

      </div>
    </main>
  );
}
