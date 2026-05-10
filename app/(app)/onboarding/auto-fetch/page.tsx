import { AutoFetchForm } from '@/components/forms/AutoFetchForm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getMetros, getOtherOption } from '@/lib/municipalities/sa-metros';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connect Your Municipality | Billdog',
  description: 'Connect your municipal portal account so Billdog can automatically fetch and analyse your bills.',
};

export default async function AutoFetchOnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user already has active credentials → redirect to /account
  const { data: existingCreds } = await supabase
    .from('municipal_credentials')
    .select('id, municipality_id')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .limit(1);

  if (existingCreds && existingCreds.length > 0) {
    redirect('/account');
  }

  const metros = getMetros();
  const otherOption = getOtherOption();

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-navy rounded-2xl shadow-xl p-8 border border-white/10">
        <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block text-center">
          Auto-Fetch Setup
        </span>
        <h1 className="font-display text-3xl sm:text-4xl text-white tracking-wide uppercase mb-2 text-center">
          Connect Your Municipality
        </h1>
        <p className="text-white/60 mb-8 text-sm sm:text-base text-center">
          We&apos;ll automatically fetch your bills every month, analyse them for errors, 
          and notify you if we find recoverable overcharges.
        </p>
        
        <AutoFetchForm 
          metros={metros} 
          otherOption={otherOption}
          userId={user.id} 
        />
      </div>
    </div>
  );
}
