'use client';

import { useState } from 'react';
import { isValidSaIdNumber } from '@/lib/popia/luhn';
import { Button } from '@/components/ui/Button';

interface CaptureIdModalProps {
  caseId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function CaptureIdModal({ caseId, onSuccess, onClose }: CaptureIdModalProps) {
  const [id, setId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    if (!isValidSaIdNumber(id)) {
      setErr('That does not look like a valid SA ID number.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/capture-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_number: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || 'Failed to save ID. Please try again.');
        setBusy(false);
        return;
      }
      onSuccess();
    } catch {
      setErr('Network error. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8">
        <h2 className="font-display text-2xl text-navy uppercase tracking-wide mb-2">
          ID Verification Required
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Your municipality requires your SA ID number to verify you are the
          account holder before they will review the dispute.
        </p>

        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
          SA ID Number (13 digits)
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={13}
          value={id}
          onChange={(e) => setId(e.target.value.replace(/\D/g, ''))}
          className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-xl px-4 font-mono text-navy focus:bg-white focus:border-orange focus:ring-0 transition-all outline-none"
          placeholder="0000000000000"
        />

        {err && (
          <p className="mt-2 text-sm text-error font-medium">{err}</p>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Required to verify your identity to your municipality. Encrypted at
          rest in Supabase Vault. Auto-deleted 30 days after case resolution.
          Never shown to Billdog staff.
        </p>

        <div className="flex gap-3 mt-6">
          <Button onClick={submit} variant="primary" disabled={busy} className="flex-1">
            {busy ? 'Saving…' : 'Save & Continue'}
          </Button>
          <Button onClick={onClose} variant="outline-dark" disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
