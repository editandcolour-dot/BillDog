// TODO: Add PayFast card tokenization gate here 
// before /upload access (Phase: Payments)
// Requires full PayFast hosted payment integration
// See skills/payfast.md for implementation details

import { OnboardingForm, Municipality } from '@/components/forms/OnboardingForm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Complete Profile | Billdog',
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if onboarding is already complete
  const { data: profile } = await supabase
    .from('profiles')
    .select('municipality')
    .eq('id', user.id)
    .single();

  if (profile?.municipality) {
    redirect('/dashboard');
  }

  // Fetch municipalities for dropdown
  const { data: rawMunicipalities } = await supabase
    .from('municipalities')
    .select('id, name')
    .order('name');
    
  const municipalities: Municipality[] = rawMunicipalities || [];

  const userEmail = user?.email || '';
  const userFullName = user?.user_metadata?.full_name || '';

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-navy rounded-lg shadow-xl p-8 border border-white/10">
        <h1 className="font-display text-3xl sm:text-4xl text-white tracking-wide uppercase mb-2">
          Complete Your Profile
        </h1>
        <p className="text-white/70 mb-8 text-sm sm:text-base">
          Just a few more details so we can process your bill disputes correctly.
        </p>
        
        <OnboardingForm 
          municipalities={municipalities} 
          userId={user.id} 
          userEmail={userEmail}
          userFullName={userFullName}
        />
      </div>
    </div>
  );
}
