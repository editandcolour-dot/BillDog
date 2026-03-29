'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { completeOnboardingAction } from '@/app/actions/auth';

export interface Municipality {
  id: string;
  name: string;
}

export function OnboardingForm({ 
  municipalities, 
  userId, 
  userEmail, 
  userFullName 
}: { 
  municipalities: Municipality[]; 
  userId: string;
  userEmail: string;
  userFullName: string;
}) {
  const [municipality, setMunicipality] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [propertyType, setPropertyType] = useState('residential');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!municipality || !accountNumber || !propertyType) {
      setError('Please fill out all fields.');
      setIsLoading(false);
      return;
    }

    try {
      await completeOnboardingAction({
        userId,
        userEmail,
        userFullName,
        municipality,
        accountNumber,
        propertyType
      });

      router.push('/upload');
    } catch (error) {
      console.error('[Auth]', error);
      setError('Failed to save your profile. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 text-red-100 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm text-white/70 mb-1 block" htmlFor="municipality">Municipality</label>
        <select
          id="municipality"
          required
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
          className="w-full px-4 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange appearance-none"
        >
          <option value="" disabled className="text-navy">Select your municipality</option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.name} className="text-navy">
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-white/70 mb-1 block" htmlFor="accountNumber">Municipal Account Number</label>
        <input
          id="accountNumber"
          type="text"
          required
          placeholder="e.g. 1002345678"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="w-full px-4 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        />
      </div>

      <div>
        <label className="text-sm text-white/70 mb-2 block">Property Type</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-white">
            <input
              type="radio"
              name="propertyType"
              value="residential"
              checked={propertyType === 'residential'}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-4 h-4 text-orange focus-visible:ring-orange"
            />
            Residential
          </label>
          <label className="flex items-center gap-2 text-white">
            <input
              type="radio"
              name="propertyType"
              value="commercial"
              checked={propertyType === 'commercial'}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-4 h-4 text-orange focus-visible:ring-orange"
            />
            Commercial
          </label>
        </div>
      </div>

      <Button type="submit" variant="primary" className="w-full mt-6" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Continue to Upload'}
      </Button>
    </form>
  );
}
