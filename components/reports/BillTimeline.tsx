import React from 'react';

interface TimelineProps {
  bills: {
    bill_period: string;
    errors: { recoverable: boolean }[];
  }[];
}

export function BillTimeline({ bills }: TimelineProps) {
  if (!bills || bills.length === 0) return null;

  // Filter valid periods and sort by period
  const sorted = bills
    .filter(b => b && typeof b.bill_period === 'string')
    .sort((a, b) => a.bill_period.localeCompare(b.bill_period));

  const errorCount = sorted.filter(b => b.errors.length > 0).length;

  return (
    <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-xl font-bold text-navy">Timeline Overview</h3>
          <p className="text-slate-500 font-medium">{errorCount} of {sorted.length} months contain billing errors</p>
        </div>
      </div>

      <div className="relative flex items-center justify-between overflow-x-auto pb-4 pt-2 hide-scrollbar">
        {/* Continuous background line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -mt-0.5 -z-10" />

        {sorted.map((bill, index) => {
          const hasError = bill.errors.length > 0;
          const isClean = !hasError;
          const parts = bill.bill_period.split('-');
          let shortMonth = bill.bill_period.substring(0, 3);
          let yearStr = parts[0] ? parts[0].slice(-2) : '';

          if (parts.length >= 2) {
            const yNum = parseInt(parts[0], 10);
            const mNum = parseInt(parts[1], 10);
            if (!isNaN(yNum) && !isNaN(mNum)) {
              const d = new Date(yNum, mNum - 1);
              if (!isNaN(d.getTime())) {
                shortMonth = d.toLocaleString('default', { month: 'short' });
                yearStr = parts[0].slice(-2);
              }
            }
          }

          return (
            <div key={index} className="flex flex-col items-center min-w-[50px] group relative z-10">
              {/* Tooltip */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-navy text-white text-xs font-bold py-1 px-2 rounded whitespace-nowrap pointer-events-none">
                {bill.bill_period}
              </div>
              
              {/* Node */}
              <div 
                className={`w-4 h-4 rounded-full border-2 bg-white transition-colors
                  ${hasError ? 'border-orange' : 'border-green-500'}
                `}
              />
              
              {/* Label */}
              <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
                {shortMonth}
              </span>
              <span className="text-[9px] text-slate-300">
                {yearStr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
