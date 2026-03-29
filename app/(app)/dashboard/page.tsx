import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CaseCard } from '@/components/dashboard/CaseCard';
import { Case } from '@/types';

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

  // Fetch all cases for this user
  const { data: casesData, error } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const cases = casesData as Case[] | null;

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
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <div>
            <span className="block mb-2 text-xs font-bold uppercase tracking-[0.15em] text-orange">
              Tracking
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-navy tracking-wide uppercase">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
            </h1>
          </div>
          
          <Link 
            href="/upload" 
            className="w-full sm:w-auto min-h-[44px] px-8 py-3 bg-orange hover:bg-orange-light text-white font-bold rounded-md transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 flex items-center justify-center shadow-md"
          >
            Upload New Bill
          </Link>
        </div>

        {(!cases || cases.length === 0) ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((caseRecord) => (
              <CaseCard key={caseRecord.id} caseRecord={caseRecord} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
