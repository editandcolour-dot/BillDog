import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CasesList } from '@/components/dashboard/CasesList';
import { ProcessingBanner } from '@/components/dashboard/ProcessingBanner';
import { DashboardActionCards } from '@/components/dashboard/DashboardActionCards';
import type { Case } from '@/types';

export const metadata = {
  title: 'Dashboard | Billdog',
  description: 'Track your active municipal billing disputes.',
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's name to personalize the header
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  // Check if user has connected a municipality for autofetch
  const { data: credential } = await supabase
    .from('autofetch_credentials')
    .select('id, municipality_name, status')
    .eq('user_id', user.id)
    .maybeSingle();

  const hasAutofetch = !!credential;

  // Fetch non-deleted cases for this user
  const { data: casesData, error } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const cases = (casesData as Case[] | null) || [];

  if (error) {
    console.error('[Dashboard] Error fetching cases:', error);
    return (
      <main className="min-h-[calc(100vh-80px)] bg-off-white py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-4 md:px-[6%] animate-fade-up">
          <h1 className="font-display text-4xl text-navy uppercase tracking-wide">Cases Dashboard</h1>
          <p className="mt-4 text-error bg-error/10 p-4 rounded-lg font-body">
            Could not load cases at this time. Please try again later.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-off-white py-12 md:py-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%] animate-fade-up">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-6">
          <div>
            <span className="block mb-2 text-xs font-bold uppercase tracking-[0.15em] text-orange">
              Tracking
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-navy tracking-wide uppercase">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
            </h1>
          </div>
        </div>

        {/* Action cards — Connect Municipality + Upload Manually */}
        <DashboardActionCards hasAutofetch={hasAutofetch} />

        {/* Processing banner — shows when a scrape job is running */}
        <ProcessingBanner />

        {/* Cases list with multi-select + bulk delete */}
        <CasesList initialCases={cases} />
      </div>
    </main>
  );
}
