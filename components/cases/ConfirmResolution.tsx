'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface ConfirmResolutionProps {
  caseId: string;
}

export function ConfirmResolution({ caseId }: ConfirmResolutionProps) {
  const router = useRouter();
  const [amountRecovered, setAmountRecovered] = useState<string>('');
  const [isCharging, setIsCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = parseFloat(amountRecovered || '0');
  const fee = Math.round(amount * 0.20 * 100) / 100;
  const net = amount - fee;

  const handleConfirm = async () => {
    if (amount <= 0 || isNaN(amount)) {
      setError('Please enter a valid recovered amount.');
      return;
    }
    
    setIsCharging(true);
    setError(null);

    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'resolved', 
          amount_recovered: amount 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Failed to process resolution and charge.');
        setIsCharging(false);
        return;
      }

      router.refresh(); // Refresh the page to show new status
    } catch {
      setError('Network error investigating charge.');
      setIsCharging(false);
    }
  };

  return (
    <div className="bg-white border border-light-grey rounded-2xl p-6 shadow-sm mt-8">
      <h3 className="font-display text-xl text-navy uppercase tracking-wide">Confirm Resolution</h3>
      <p className="text-sm text-grey mb-4 mt-1 font-medium leading-relaxed">
        If the municipality has corrected your account, enter the total credited amount to resolve the case and process the Billdog success fee.
      </p>

      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-grey mb-2">Amount Recovered (Rands)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy font-bold">R</span>
          <input 
            type="number" 
            className="w-full h-12 pl-8 pr-4 border border-light-grey rounded-lg focus:border-orange focus:ring-1 focus:ring-orange text-navy font-bold"
            placeholder="0.00"
            value={amountRecovered}
            onChange={(e) => setAmountRecovered(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex justify-between text-base">
          <span className="text-grey font-medium">Amount recovered</span>
          <span className="text-navy font-bold">R{amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base">
          <span className="text-grey font-medium">Billdog fee (20%)</span>
          <span className="text-navy font-bold">R{fee.toFixed(2)}</span>
        </div>
        <hr className="border-light-grey my-2" />
        <div className="flex justify-between text-base pt-1">
          <span className="text-navy uppercase font-bold text-sm tracking-wide">You keep</span>
          <span className="text-success font-display text-xl tracking-wide">R{net.toFixed(2)}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-md line-clamp-3">
          {error}
        </div>
      )}

      <Button 
        variant="primary" 
        onClick={handleConfirm} 
        disabled={isCharging || amount <= 0}
        className="mt-6 w-full"
      >
        {isCharging ? 'Processing...' : `Confirm & Charge R${fee.toFixed(2)}`}
      </Button>
      <p className="mt-3 text-grey text-xs text-center font-medium">
        By confirming, you authorise Billdog to charge your saved card.
      </p>
    </div>
  );
}
