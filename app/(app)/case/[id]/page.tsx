import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { CaseTimeline } from '@/components/dashboard/CaseTimeline';
import { Case, CaseEvent } from '@/types';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, ShieldAlert } from 'lucide-react';
import { ConfirmResolution } from '@/components/cases/ConfirmResolution';
import { PublicProtectorModal } from '@/components/cases/PublicProtectorModal';
import { DeleteCaseButton } from '@/components/cases/DeleteCaseButton';
import { EscalationTimeline } from '@/components/cases/EscalationTimeline';
import { DisputeGateBanner } from '@/components/cases/DisputeGateBanner';
import { lookupWardCouncillor } from '@/lib/escalation/wardCouncillorLookup';

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const caseId = resolvedParams.id;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the specific case along with user ownership verification via RLS
  const { data: caseRecord, error: caseError } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (caseError || !caseRecord || caseRecord.user_id !== user.id) {
    notFound();
  }

  // Fetch the events sequence
  const { data: events } = await supabase
    .from('case_events')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  const caseEventsData = (events || []) as CaseEvent[];
  const c = caseRecord as Case;

  const totalBilled = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(c.total_billed || 0);
  const totalRecoverable = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(c.recoverable || 0);

  // Fetch prior letters for Escalation Timeline
  const { data: priorLettersData } = await supabase
    .from('escalation_letters')
    .select('*')
    .eq('case_id', caseId)
    .order('step', { ascending: true });

  // Extract property address from bill text for ward councillor lookup
  let propertyAddress = '';
  if (c.escalation_step >= 1) {
    const { extractAddressFromCoctBill } = await import('@/lib/parsers/extract-address');
    const { data: latestBill } = await supabase
      .from('case_bills')
      .select('bill_text')
      .eq('case_id', caseId)
      .not('bill_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (latestBill?.bill_text) {
      propertyAddress = extractAddressFromCoctBill(latestBill.bill_text);
    }
  }
  const wardCouncillor = c.escalation_step >= 1 ? await lookupWardCouncillor(c.municipality, propertyAddress) : null;

  // Gate state — show banner if user can't yet submit a dispute on this case.
  const { data: profileGate } = await supabase
    .from('profiles')
    .select('mandate_revoked_at')
    .eq('id', user.id)
    .single();
  const mandateRevoked = !!profileGate?.mandate_revoked_at;
  const idCaptured = !!c.id_collected_at;
  const showGateBanner = (mandateRevoked || !idCaptured)
    && ['analysing', 'letter_ready', 'sent'].includes(c.status);

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
            {showGateBanner && (
              <DisputeGateBanner
                caseId={c.id}
                mandateRevoked={mandateRevoked}
                idCaptured={idCaptured}
              />
            )}
            {c.escalation_step === 5 && !c.id_collected_at && (
              <div className="mb-8">
                <PublicProtectorModal caseId={c.id} />
              </div>
            )}
            
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

            <div className="bg-white border border-light-grey rounded-3xl p-8 md:p-10 mb-8">
              <h2 className="font-display text-2xl md:text-3xl text-navy uppercase tracking-wide mb-8">
                Dispute Timeline
              </h2>
              <EscalationTimeline 
                caseRecord={c} 
                priorLetters={priorLettersData || []} 
                wardCouncillor={wardCouncillor} 
              />
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
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      c.status === 'letter_ready' ? 'bg-orange animate-pulse' :
                      c.status === 'resolved' || c.status === 'closed' ? 'bg-success' :
                      c.status === 'sent' || c.status === 'acknowledged' ? 'bg-blue' :
                      c.status === 'escalated' ? 'bg-error' :
                      'bg-grey'
                    }`} />
                    {c.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="text-grey uppercase font-bold text-xs tracking-wide">Registered</span>
                  <span className="text-navy font-medium">
                    {new Date(c.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(c.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
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

            {/* Next step hint + View Letter CTA */}
            {(c.status === 'letter_ready' || c.status === 'sent' || c.status === 'acknowledged' || c.status === 'escalated') && (
              <>
                {c.status === 'letter_ready' && (
                  <div className="bg-orange/5 border border-orange/20 rounded-xl px-4 py-3 text-sm text-navy font-body">
                    <span className="font-bold">👇 Next step:</span> Your dispute letter is ready. Open it, review the legal arguments, then send it to {c.municipality || 'your municipality'}.
                  </div>
                )}
                <div className="bg-navy rounded-2xl p-6 md:p-8 relative overflow-hidden text-center">
                  <h3 className="font-display text-2xl text-white uppercase tracking-wide mb-3">View Letter</h3>
                  <p className="text-white/70 text-sm mb-6 font-body">
                    {c.status === 'letter_ready'
                      ? 'Your dispute letter is ready to review and send.'
                      : 'Review the legal arguments generated by Billdog for this dispute.'}
                  </p>
                  <Link 
                    href={`/letter/${c.id}`}
                    className="relative bg-orange hover:bg-orange-light text-white font-bold uppercase tracking-wide text-sm py-3.5 px-8 rounded-md w-full inline-flex justify-center items-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg min-h-[48px]"
                  >
                    {c.status === 'letter_ready' && (
                      <span className="absolute inset-0 rounded-md animate-ping bg-orange/30 pointer-events-none" />
                    )}
                    <span className="relative z-10 flex items-center">
                      {c.status === 'letter_ready' ? 'Review & Send Letter' : 'Open Dispute Draft'}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </span>
                  </Link>
                </div>
              </>
            )}

            {/* Resolution Form */}
            {(c.status === 'sent' || c.status === 'acknowledged' || c.status === 'escalated') && (
              <ConfirmResolution caseId={c.id} />
            )}
            
            {(c.status === 'resolved' || c.status === 'closed') && (
              <div className="bg-success/10 border border-success/30 rounded-2xl p-6 md:p-8 text-center">
                <div className="w-12 h-12 bg-success text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-display text-2xl text-success uppercase tracking-wide mb-2">Case Resolved</h3>
                <p className="text-grey text-sm font-body">
                  Amount recovered: R{c.amount_recovered?.toFixed(2) || '0.00'}
                </p>
                <p className="text-grey text-sm font-body mt-1">
                  Success fee: R{c.fee_charged?.toFixed(2) || '0.00'}
                </p>
              </div>
            )}

            {/* Danger Zone — Delete Case (de-emphasized) */}
            {c.status !== 'resolved' && (
              <div className="pt-4 mt-4 border-t border-light-grey">
                <p className="text-xs text-grey uppercase tracking-wider font-bold mb-3">Danger Zone</p>
                <DeleteCaseButton caseId={c.id} caseStatus={c.status} />
              </div>
            )}
            
          </div>

        </div>

      </div>
    </main>
  );
}
