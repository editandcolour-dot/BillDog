'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function LetterPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [caseData, setCaseData] = useState<any>(null);
  const [letterContent, setLetterContent] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [status, setStatus] = useState<'loading' | 'generating' | 'ready' | 'saving' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasCard, setHasCard] = useState<boolean>(false);

  const generationTriggeredRef = useRef(false);

  const fetchCase = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}`);
      if (!response.ok) {
        setError('Failed to load case.');
        setStatus('error');
        return null;
      }
      const data = await response.json();
      if (data.userEmail) {
        setUserEmail(data.userEmail);
      }
      if (data.case) {
        setCaseData(data.case);
        setHasCard(data.hasCard);
        return data.case;
      }
    } catch {
      setError('Network error loading case.');
      setStatus('error');
    }
    return null;
  }, [caseId]);

  const triggerGeneration = useCallback(async () => {
    if (generationTriggeredRef.current) return;
    generationTriggeredRef.current = true;
    setStatus('generating');

    try {
      const res = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Failed to generate letter.');
        setStatus('error');
        return;
      }

      // Re-fetch case to get the generated letter
      const updatedCase = await fetchCase();
      if (updatedCase?.letter_content) {
        setLetterContent(updatedCase.letter_content);
        setStatus('ready');
      }
    } catch {
      setError('Network error during letter generation.');
      setStatus('error');
    }
  }, [caseId, fetchCase]);

  useEffect(() => {
    const init = async () => {
      const caseResult = await fetchCase();
      if (!caseResult) return;

      if (caseResult.letter_content) {
        // Letter already generated
        setLetterContent(caseResult.letter_content);
        setStatus('ready');
      } else if (caseResult.errors_found && caseResult.errors_found.length > 0) {
        // Has errors but no letter — trigger generation
        triggerGeneration();
      } else {
        setError('No billing errors found. Please run analysis first.');
        setStatus('error');
      }
    };

    init();
  }, [fetchCase, triggerGeneration]);

  const handleSave = async (): Promise<boolean> => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/letter`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter_content: letterContent }),
      });

      if (!res.ok) {
        setSaveMessage('Failed to save changes.');
        setIsSaving(false);
        return false;
      } else {
        setSaveMessage('Changes saved.');
        setTimeout(() => setSaveMessage(null), 3000);
        setIsSaving(false);
        return true;
      }
    } catch {
      setSaveMessage('Network error while saving.');
      setIsSaving(false);
      return false;
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setSendError(null);

    try {
      // 1. Explicitly save any final edits
      const saved = await handleSave();
      if (!saved) {
        setSendError('We could not save your final edits. Please try again.');
        setIsSending(false);
        return;
      }

      // 2. Issue send request
      const sendRes = await fetch('/api/send-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });

      if (!sendRes.ok) {
        const errorData = await sendRes.json().catch(() => ({}));
        setSendError(errorData.error || 'Failed to send the dispute letter to the municipality.');
        setIsSending(false);
        return;
      }

      // 3. Navigate to success
      router.push(`/success?caseId=${caseId}`);

    } catch {
      setSendError('Network error while attempting to send.');
      setIsSending(false);
    }
  };

  const handleProceed = async () => {
    if (hasCard) {
      await handleSend();
    } else {
      setIsSending(true);
      try {
        const res = await fetch('/api/payfast/tokenise');
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setSendError('Failed to initialize payment gateway.');
          setIsSending(false);
        }
      } catch {
        setSendError('Network error initializing payment gateway.');
        setIsSending(false);
      }
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus('generating');
    generationTriggeredRef.current = false;
    triggerGeneration();
  };

  // Count words
  const wordCount = letterContent.trim().split(/\s+/).filter(Boolean).length;

  // Count prescribed exclusions
  const prescriptionWarnings = caseData?.prescription_warnings || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prescribedCount = prescriptionWarnings.filter((w: any) => w.status === 'prescribed').length;
  
  const parsedErrors = typeof caseData?.errors_found === 'string' 
    ? JSON.parse(caseData.errors_found) 
    : caseData?.errors_found || [];

  const watermarkSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><text x='10' y='80' transform='rotate(-35 80 60)' fill='%230B1F3A' font-size='14' font-weight='600' font-family='sans-serif'>${encodeURIComponent(userEmail || 'Billdog User')}</text></svg>`;

  // --- Error State ---
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-red-500 shadow-sm text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bebas text-navy mb-2 tracking-wide">Letter Generation Failed</h2>
          <p className="text-slate-600 font-medium mb-6">{error || 'An unexpected error occurred.'}</p>
          <Button variant="primary" onClick={handleRetry} className="w-full mb-3">
            Retry Generation
          </Button>
          <Button variant="outline-light" onClick={() => router.push(`/analysis/${caseId}`)} className="w-full">
            Back to Analysis
          </Button>
        </div>
      </div>
    );
  }

  // --- Loading / Generating State ---
  if (status === 'loading' || status === 'generating') {
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bebas text-navy mb-4 tracking-wide">
            {status === 'loading' ? 'Loading case...' : 'Drafting your dispute letter...'}
          </h1>
          <p className="text-slate-600 text-lg md:text-xl font-medium">
            This usually takes 15-30 seconds.
          </p>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-sm">
            We are citing South African legislation and drafting a formal Section 102 dispute letter for your municipality.
          </p>
        </div>
      </div>
    );
  }

  // --- Ready State — Letter Preview ---
  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-24 border-t-4 border-orange">
      <div className="max-w-7xl mx-auto px-6 pt-12">
        <div className="mb-10 text-center">
          <h1 className="text-5xl md:text-6xl font-bebas text-navy tracking-wide mb-2">Your Dispute Letter</h1>
          <p className="text-slate-500 font-medium text-lg uppercase tracking-widest">
            {caseData?.bill_period || 'Billing Dispute'}
          </p>
        </div>

        {prescribedCount > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl mb-6 max-w-3xl mx-auto shadow-sm flex gap-4">
            <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-blue-900 font-medium text-sm leading-relaxed">
              {prescribedCount} item{prescribedCount > 1 ? 's were' : ' was'} excluded from this letter because {prescribedCount > 1 ? 'they fall' : 'it falls'} outside the 3-year dispute window.
            </p>
          </div>
        )}

        {sendError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl mb-6 max-w-3xl mx-auto shadow-sm">
            <p className="text-red-900 font-medium text-sm">{sendError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left: Interactive Letter Preview */}
          <div className="lg:col-span-2 select-none">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
              <div className="bg-navy px-6 py-3 flex items-center justify-between z-30 relative">
                <span className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
                  </svg>
                  Formal Dispute Letter
                </span>
                {saveMessage && (
                  <span className="text-green-300 text-sm font-medium">{saveMessage}</span>
                )}
              </div>
              
              <div className="relative isolate bg-white">
                <textarea
                  id="letter-content"
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  onCopy={(e) => { e.preventDefault(); return false; }}
                  onCut={(e) => { e.preventDefault(); return false; }}
                  className="w-full min-h-[600px] p-8 pb-12 bg-transparent border-0 font-mono text-base font-medium text-slate-900 leading-relaxed resize-y focus:outline-none focus:ring-0 relative z-10"
                  style={{ fontFamily: "'Courier New', Courier, monospace" }}
                  spellCheck
                  disabled={isSending}
                />
                <div 
                  className="absolute inset-0 z-20 pointer-events-none"
                  style={{
                    backgroundImage: `url("${watermarkSvg}")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '160px 120px',
                    opacity: 0.06
                  }}
                />
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between z-30 relative">
                <span className="text-slate-400 text-xs font-medium">{wordCount} words</span>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isSending}
                  className="text-slate-500 text-xs font-medium hover:text-navy transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {isSaving ? 'Saving...' : 'Save edits'}
                </button>
              </div>
            </div>

            <div className="mt-10 mb-6 flex flex-col items-center">
              <Button
                variant="primary"
                onClick={handleProceed}
                disabled={isSending || isSaving}
                className="w-full sm:w-auto h-16 px-12 text-xl font-bold uppercase tracking-wider shadow-[0_8px_24px_rgba(249,115,22,0.35)]"
              >
                {isSending ? 'Please Wait...' : (hasCard ? 'Send Dispute Letter →' : '💳 Add Card to Continue')}
              </Button>
              
              <div className="mt-5 max-w-sm mx-auto text-center flex gap-3 text-left bg-slate-100/50 p-4 rounded-xl border border-slate-200/60">
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-500 text-[13px] leading-relaxed font-medium text-left">
                  This letter is personalized to your account. Sending through Billdog ensures correct delivery, tracking and escalation if ignored.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Legal Basis Panel with Blur overlay */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-28 h-auto min-h-[400px]">
              <div className="bg-slate-50 border-b border-light-grey px-6 py-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-navy opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <h3 className="font-bebas text-navy text-xl tracking-wide m-0">Legal Basis</h3>
              </div>
              
              <div className="relative isolate p-6">
                <div style={{ filter: 'blur(5px)', opacity: 0.6 }} className="space-y-6 pointer-events-none select-none">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {parsedErrors.map((err: any, i: number) => (
                    <div key={i} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                      <p className="text-navy font-bold text-sm mb-1">{err.line_item || 'Disputed Charge'}</p>
                      <p className="text-slate-600 text-sm leading-relaxed">{err.legal_basis || 'Section 102 of the Municipal Systems Act 32 of 2000'}</p>
                    </div>
                  ))}
                  {parsedErrors.length === 0 && (
                    <div>
                      <p className="text-navy font-bold text-sm mb-1">General Dispute</p>
                      <p className="text-slate-600 text-sm">Section 102 of the Municipal Systems Act 32 of 2000</p>
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center text-center px-6 py-8 z-10 backdrop-blur-[2px]">
                  <div className="w-14 h-14 bg-navy rounded-full flex items-center justify-center mb-5 shadow-lg relative border-4 border-white">
                    <svg className="w-6 h-6 text-orange" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h4 className="font-bold text-navy text-[17px] mb-2 px-4 shadow-sm">
                    Protected Legal IP
                  </h4>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed max-w-[200px] mt-1">
                    Send via Billdog to reveal the full legal citations.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
