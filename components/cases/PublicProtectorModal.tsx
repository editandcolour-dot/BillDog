'use client';

import React, { useState } from 'react';
import { ShieldAlert, Loader2, Info } from 'lucide-react';
import { validateSAID } from '@/lib/validators/sa-id';
import { useRouter } from 'next/navigation';

interface Props {
  caseId: string;
}

export function PublicProtectorModal({ caseId }: Props) {
  const router = useRouter();
  const [idNumber, setIdNumber] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If the user hasn't explicitly triggered this from a button or if it's auto-mounted
  // This modal acts as an inline card or an overlay. We'll build it as an inline card 
  // blocking the rest of the stage advancement.
  
  const handleSubmit = async () => {
    setError('');

    // 1. Client-side validation
    if (!consent) {
      setError('You must consent to temporary storage out of necessity.');
      return;
    }

    const validation = validateSAID(idNumber);
    if (!validation.isValid) {
      setError(validation.message || 'Invalid South African ID Number.');
      return;
    }

    // 2. Submit to Vault
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cases/submit-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, idNumber, consent })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to securely store ID');
      }

      // Success
      router.refresh();
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border-2 border-orange/40 rounded-3xl p-6 md:p-10 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-orange"></div>
      
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-orange/10 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-orange" />
        </div>
        <div>
          <h2 className="font-display text-2xl text-navy uppercase tracking-wide">
            One more step to escalate to the Public Protector
          </h2>
        </div>
      </div>

      <p className="text-slate-600 font-body text-base md:text-lg mb-8">
        The Public Protector legally requires your South African ID number to file a formal complaint. 
        As an independent ombudsman, they cannot process anonymous or incomplete submissions.
      </p>

      <div className="bg-[#F8FAFF] p-6 rounded-2xl border border-blue/20 mb-8 space-y-6">
        <div>
          <label className="block font-bold text-navy uppercase tracking-wide text-sm mb-2">
            South African ID Number
          </label>
          <input 
            type="text" 
            placeholder="e.g. 9001015000080"
            maxLength={13}
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
            className="w-full h-14 bg-white border-2 border-slate-200 rounded-xl px-4 font-body text-lg focus:outline-none focus:border-navy transition-colors placeholder:text-slate-300"
          />
        </div>

        <label className="flex items-start gap-4 cursor-pointer group">
          <div className="relative flex items-center justify-center">
            <input 
              type="checkbox" 
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="peer appearance-none w-6 h-6 border-2 border-slate-300 rounded focus:outline-none checked:bg-navy checked:border-navy transition-colors cursor-pointer" 
            />
            <svg className="absolute w-4 h-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="select-none">
            <span className="block font-bold text-navy text-sm mb-1 uppercase tracking-wide">
              I consent to temporary storage of my ID
            </span>
            <span className="text-slate-500 text-sm font-body">
              Your ID will be heavily encrypted in a secure vault solely for this filing, and will be automatically and permanently deleted within 30 days or when this case closes.
            </span>
          </div>
        </label>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200 flex items-center gap-3 font-medium">
          <Info className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || idNumber.length !== 13 || !consent}
        className="w-full h-14 bg-navy text-white rounded-xl font-display text-lg tracking-wide uppercase hover:bg-blue transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            Encrypting and Submitting...
          </>
        ) : (
          'Submit and file complaint'
        )}
      </button>

      <div className="mt-6 text-center text-xs text-slate-400 font-body flex items-center justify-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        POPIA Compliant • AES-256-GCM Vault Encryption
      </div>
    </div>
  );
}
