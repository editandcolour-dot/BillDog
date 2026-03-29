import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default async function SuccessPage({ searchParams }: { searchParams: { caseId?: string } }) {
  const caseId = searchParams.caseId;

  if (!caseId) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: caseRecord } = await supabase
    .from('cases')
    .select('id, user_id, status, municipality_email')
    .eq('id', caseId)
    .single();

  if (!caseRecord || caseRecord.user_id !== user.id) {
    redirect('/dashboard');
  }

  const municipalityEmail = caseRecord.municipality_email || 'the municipal dispute office';

  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-24 border-t-4 border-[#10B981]">
      <div className="max-w-2xl mx-auto px-6 pt-16">
        
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-6xl font-bebas text-navy tracking-wide mb-4">
            Your dispute letter has been sent.
          </h1>
          <p className="text-xl text-slate-600 font-medium">
            Here&apos;s what happens next:
          </p>
        </div>

        {/* Next Steps List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mb-8">
          <ol className="space-y-6">
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
              <p className="text-slate-700 leading-relaxed font-medium pt-1">
                Your municipality receives the letter at <strong className="text-navy">{municipalityEmail}</strong> — typically within minutes.
              </p>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
              <p className="text-slate-700 leading-relaxed font-medium pt-1">
                They have <strong>30 days</strong> to investigate and respond in terms of Section 102 of the Municipal Systems Act.
              </p>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
              <p className="text-slate-700 leading-relaxed font-medium pt-1">
                They <strong>CANNOT</strong> disconnect your services while the dispute is under investigation.
              </p>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
              <p className="text-slate-700 leading-relaxed font-medium pt-1">
                We&apos;ll update your case status when they respond.
              </p>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold text-sm">5</div>
              <p className="text-slate-700 leading-relaxed font-medium pt-1">
                If they don&apos;t respond within 30 days — we escalate to the Municipal Ombudsman.
              </p>
            </li>
          </ol>
        </div>

        {/* Important Note Banner */}
        <div className="bg-orange/10 border-l-4 border-orange p-5 rounded-r-xl mb-10 shadow-sm flex items-start gap-4">
          <svg className="w-8 h-8 text-orange flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-orange-900 font-bold text-sm uppercase tracking-wider mb-1">Important Note</h3>
            <p className="text-orange-900 font-medium text-[15px] leading-relaxed">
              Keep paying the undisputed portion of your account while the dispute is active. This prevents disconnection and demonstrates good faith.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={`/case/${caseId}`} passHref className="w-full sm:w-auto">
            <Button variant="primary" className="w-full h-14 px-8 text-lg font-bold shadow-lg shadow-orange/20">
              View My Case
            </Button>
          </Link>
          <Link href="/dashboard" passHref className="w-full sm:w-auto">
            <Button variant="outline-light" className="w-full h-14 px-8 text-lg font-bold">
              Go to Dashboard
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
