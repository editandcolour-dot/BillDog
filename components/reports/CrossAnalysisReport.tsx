import React from 'react';
import type { CrossAnalysis } from '@/types/analysis';

const formatCurrency = (val: number) => `R ${val.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CrossAnalysisReport({ crossAnalysis }: { crossAnalysis: CrossAnalysis }) {
  if (!crossAnalysis) return null;

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border-2 border-orange relative overflow-hidden mb-8">
      <div className="absolute top-0 right-0 w-24 h-24 bg-orange/5 rounded-bl-full -mr-12 -mt-12"></div>
      
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-orange/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bebas text-navy tracking-wide">Cross-Bill Pattern Analysis</h2>
          <p className="text-slate-600 font-medium">{crossAnalysis.trend_summary}</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {crossAnalysis.recurring_errors.map((err, idx) => (
          <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p className="font-bold text-navy">{err.issue}</p>
              <p className="text-sm text-slate-500 mt-1">Affected {err.months_affected.length} month(s)</p>
            </div>
            <div className="text-left md:text-right flex-shrink-0">
              <p className="font-bebas text-xl text-orange tracking-wide">{formatCurrency(err.total_overcharged)}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Impact</p>
            </div>
          </div>
        ))}
      </div>

      {crossAnalysis.prescription_risk.at_risk_amount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex gap-3 mt-4">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-red-900 font-bold text-sm">Prescription Risk Warning</p>
            <p className="text-red-800 text-sm mt-1">
              {formatCurrency(crossAnalysis.prescription_risk.at_risk_amount)} of these errors are approaching the 3-year limit. Act quickly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
