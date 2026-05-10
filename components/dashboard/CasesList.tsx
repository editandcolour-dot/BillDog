'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CaseCard } from '@/components/dashboard/CaseCard';
import { Trash2 } from 'lucide-react';
import type { Case } from '@/types';

interface CasesListProps {
  initialCases: Case[];
}

export function CasesList({ initialCases }: CasesListProps) {
  const router = useRouter();
  const [cases, setCases] = useState(initialCases);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectionMode = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const deletable = cases.filter((c) => c.status !== 'resolved');
    setSelectedIds(new Set(deletable.map((c) => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setError(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/cases/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_ids: Array.from(selectedIds) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete cases');
        setDeleting(false);
        return;
      }

      // Remove deleted cases from the local list
      const deletedSet = new Set(data.deleted || []);
      setCases((prev) => prev.filter((c) => !deletedSet.has(c.id)));
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (cases.length === 0) {
    return (
      <div className="bg-white border border-light-grey rounded-2xl p-10 md:p-16 text-center shadow-sm hover:shadow-md transition-shadow">
        <h3 className="font-display text-3xl text-navy tracking-wide mb-4">No Cases Found</h3>
        <p className="font-body text-grey mb-8 text-lg max-w-lg mx-auto">
          You haven&apos;t initiated any municipal billing disputes yet. Upload your first PDF bill to start dragging back what you&apos;re owed.
        </p>
        <Link 
          href="/upload" 
          className="inline-flex min-h-[44px] px-8 py-3 bg-navy hover:bg-navy/90 text-white font-bold rounded-md transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          Start First Dispute
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Selection toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          {selectionMode ? (
            <>
              <span className="text-sm font-bold text-navy">
                {selectedIds.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs font-bold uppercase tracking-wide text-grey hover:text-navy transition-colors"
              >
                Clear
              </button>
              <button
                onClick={selectAll}
                className="text-xs font-bold uppercase tracking-wide text-blue hover:text-navy transition-colors"
              >
                Select all
              </button>
            </>
          ) : (
            <button
              onClick={selectAll}
              className="text-xs font-bold uppercase tracking-wide text-grey hover:text-navy transition-colors"
            >
              Select cases
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {selectionMode && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 min-h-[40px] px-5 py-2 bg-error hover:bg-red-600 text-white font-bold rounded-md transition-all disabled:opacity-50 text-sm uppercase tracking-wide"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : `Delete ${selectedIds.size}`}
            </button>
          )}
          <Link
            href="/upload"
            className="w-full sm:w-auto min-h-[40px] px-6 py-2 bg-orange hover:bg-orange-light text-white font-bold rounded-md transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 flex items-center justify-center shadow-md text-sm"
          >
            Upload New Bill
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-error rounded-lg text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {/* Cases grid with selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cases.map((caseRecord) => (
          <div key={caseRecord.id} className="relative">
            {/* Selection checkbox overlay */}
            <div className="absolute top-3 left-3 z-10">
              <label className="cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.has(caseRecord.id)}
                  onChange={() => toggleSelect(caseRecord.id)}
                  disabled={caseRecord.status === 'resolved'}
                  className="w-5 h-5 rounded border-2 border-light-grey accent-orange cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </label>
            </div>

            <div className={`transition-all duration-200 ${
              selectedIds.has(caseRecord.id)
                ? 'ring-2 ring-orange ring-offset-2 rounded-2xl'
                : ''
            }`}>
              <CaseCard caseRecord={caseRecord} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
