'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function AnalysisResultsPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [caseData, setCaseData] = useState<any>(null);
  const [status, setStatus] = useState<'uploading' | 'analysing' | 'letter_ready' | 'closed' | 'error'>('uploading');
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const analysisTriggeredRef = useRef(false);

  const fetchCase = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}`);
      
      if (response.status === 401 || response.status === 403) {
        setError('Unauthorised. Please log in again.');
        return 'error';
      }

      if (!response.ok) {
        throw new Error('Failed to fetch case status');
      }

      const data = await response.json();
      
      if (data.case && data.case.status) {
        setCaseData(data.case);
        setStatus(data.case.status);
        return data.case.status;
      }
    } catch (err) {
      console.error('[Analysis] Polling error:', err);
    }
    return null;
  };

  const triggerAnalysis = async () => {
    if (analysisTriggeredRef.current) return;
    analysisTriggeredRef.current = true;
    
    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId })
      });
      
      if (res.status === 503) {
        setError('Analysis timed out. Please try again.');
        setStatus('error');
      } else if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Failed to analyse bill.');
        setStatus('error');
      }
    } catch (err) {
      console.error('[Analysis] Trigger failed:', err);
      setError('A network error occurred while analysing the bill.');
      setStatus('error');
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined = undefined;

    const initAndPoll = async () => {
      const currentStatus = await fetchCase();
      
      // Fire analysis on first mount if uploading
      if (currentStatus === 'uploading' && !analysisTriggeredRef.current) {
        triggerAnalysis();
      }

      // If we are actively processing, start polling
      if (currentStatus === 'uploading' || currentStatus === 'analysing') {
        intervalId = setInterval(async () => {
          const updatedStatus = await fetchCase();
          if (updatedStatus === 'letter_ready' || updatedStatus === 'closed' || updatedStatus === 'error') {
            clearInterval(intervalId);
          }
        }, 3000);
      }
    };

    initAndPoll();

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const handleRetry = () => {
    setError(null);
    setStatus('analysing');
    setIsRetrying(true);
    analysisTriggeredRef.current = false; // allow re-trigger
    triggerAnalysis().finally(() => setIsRetrying(false));
  };

  if (error || status === 'error') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-red-500 shadow-sm text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bebas text-navy mb-2 tracking-wide">Error Computing Analysis</h2>
          <p className="text-slate-600 font-medium mb-6">{error || 'An unexpected error occurred.'}</p>
          <Button variant="primary" onClick={handleRetry} className="w-full" disabled={isRetrying}>
            {isRetrying ? 'Retrying...' : 'Retry Analysis'}
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'uploading' || status === 'analysing') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full flex flex-col items-center">
          <div className="relative mb-8">
            <svg className="animate-spin h-20 w-20 text-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <svg className="w-8 h-8 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bebas text-navy mb-4 tracking-wide">Analysing your bill...</h1>
          <p className="text-slate-600 text-lg md:text-xl font-medium">
            This usually takes 30-60 seconds.
          </p>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-sm">
            We are applying legal algorithms and South African municipal prescriptions to verify every cent.
          </p>
        </div>
      </div>
    );
  }

  // No errors found
  if (status === 'closed') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-3xl font-bebas text-navy mb-4 tracking-wide">Analysis Complete</h2>
          <p className="text-slate-600 font-medium mb-8">Good news — no errors found on this bill! Your municipal account appears to be correctly balanced.</p>
          <Button variant="outline-light" onClick={() => router.push('/dashboard')} className="w-full">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // --- Render final results ---
  const formatCurrency = (val: number) => `R ${val.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const totalBilled = caseData?.total_billed || 0;
  const totalRecoverable = caseData?.recoverable || 0;
  const billPeriod = caseData?.bill_period || 'Unknown Period';
  const errors = caseData?.errors_found || [];
  const warnings = caseData?.prescription_warnings || [];

  // Determine global severity for banners
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasPrescribed = warnings.some((w: any) => w.status === 'prescribed');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasApproaching = warnings.some((w: any) => w.status === 'approaching');

  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-24 border-t-4 border-orange">
      <div className="max-w-3xl mx-auto px-6 pt-12">
        {/* Header Section */}
        <div className="mb-10 text-center">
          <h1 className="text-5xl md:text-6xl font-bebas text-navy tracking-wide mb-2">Analysis Complete</h1>
          <p className="text-slate-500 font-medium text-lg mb-8 uppercase tracking-widest">{billPeriod}</p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-w-[240px]">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Total Billed</p>
              <p className="text-3xl font-bebas text-navy tracking-wide">{formatCurrency(totalBilled)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-green-500 min-w-[240px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8"></div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Total Recoverable</p>
              <p className="text-4xl font-bebas text-green-500 tracking-wide">{formatCurrency(totalRecoverable)}</p>
            </div>
          </div>
        </div>

        {/* Global Warnings */}
        {hasPrescribed && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl mb-8 flex gap-4 shadow-sm">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-900 font-medium">Certain charges are outside the 3-year dispute window and cannot be legally recovered. See items below.</p>
          </div>
        )}

        {!hasPrescribed && hasApproaching && (
          <div className="bg-orange/10 border-l-4 border-orange p-4 rounded-r-xl mb-8 flex gap-4 shadow-sm">
            <svg className="w-6 h-6 text-orange flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-orange-900 font-medium">Some charges are approaching their legal prescription deadline. You must take action quickly.</p>
          </div>
        )}

        {/* Error Cards */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-navy mb-4">Identified Billing Errors ({errors.length})</h3>
          
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {errors.map((errorObj: any, idx: number) => {
            const warning = warnings[idx];
            const isPrescribed = warning?.status === 'prescribed';
            const isApproaching = warning?.status === 'approaching';

            return (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-navy truncate">{errorObj.line_item}</h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize mt-2">
                       {errorObj.service_type}
                    </span>
                  </div>
                  <div className="text-left md:text-right shrink-0">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Overcharge</p>
                    <p className={`text-2xl font-bebas tracking-wide ${errorObj.recoverable && !isPrescribed ? 'text-green-500' : 'text-slate-400'}`}>
                      {formatCurrency(errorObj.amount_charged - errorObj.expected_amount)}
                    </p>
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed mb-4">{errorObj.issue}</p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Legal Basis</p>
                  <p className="text-sm text-slate-600 italic">&quot;{errorObj.legal_basis}&quot;</p>
                </div>

                {isPrescribed ? (
                  <div className="flex items-center gap-2 mt-4 text-red-600 bg-red-50 p-3 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                    <span className="text-sm font-bold uppercase tracking-wide">Prescribed — Cannot Dispute</span>
                  </div>
                ) : isApproaching ? (
                  <div className="flex items-center gap-2 mt-4 text-orange bg-orange/10 p-3 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-sm font-bold uppercase tracking-wide">{warning.message}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center">
          {totalRecoverable > 0 ? (
             <Button variant="primary" onClick={() => router.push(`/letter/${caseId}`)} className="h-14 px-8 text-lg font-bold w-full md:w-auto shadow-lg shadow-orange/20">
               Generate Dispute Letter &rarr;
             </Button>
          ) : (
             <Button variant="outline-light" onClick={() => router.push('/dashboard')} className="h-14 px-8 text-lg font-bold w-full md:w-auto">
               Back to Dashboard
             </Button>
          )}
        </div>
      </div>
    </div>
  );
}
