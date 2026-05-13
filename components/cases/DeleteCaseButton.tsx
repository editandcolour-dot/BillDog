'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface DeleteCaseButtonProps {
  caseId: string;
  caseStatus: string;
}

export function DeleteCaseButton({ caseId, caseStatus }: DeleteCaseButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show delete button for resolved cases
  if (caseStatus === 'resolved') return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });

      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to delete case.');
        setDeleting(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 md:p-8">
        <h3 className="font-display text-xl text-error uppercase tracking-wide mb-2">Delete This Case?</h3>
        <p className="text-sm text-red-900/70 mb-6 font-body">
          This will permanently delete this dispute, all uploaded bills, and the generated letter.
          This action cannot be undone.
        </p>

        {error && (
          <div className="bg-red-100 text-error p-3 rounded-lg text-sm font-medium mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 min-h-[44px] px-4 py-3 bg-error hover:bg-red-600 text-white font-bold rounded-md transition-all disabled:opacity-50 text-sm"
          >
            {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
          </button>
          <button
            onClick={() => { setShowConfirm(false); setError(null); }}
            disabled={deleting}
            className="flex-1 min-h-[44px] px-4 py-3 bg-white border border-slate-200 text-navy font-bold rounded-md hover:bg-slate-50 transition-all disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="w-full min-h-[40px] px-3 py-2 bg-white border border-red-100 text-error/70 hover:text-error font-medium rounded-xl hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
    >
      <Trash2 className="w-3.5 h-3.5" />
      Delete Case
    </button>
  );
}
