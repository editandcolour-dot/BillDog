import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';
import { AppNav } from '@/components/layout/AppNav';
import { SkipLink } from '@/components/layout/SkipLink';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFF]">
      <SkipLink />
      <AppNav userName={profile?.full_name || 'User'} />
      <main id="main-content" className="flex-grow pt-[72px]">
        {children}
      </main>
      <div className="bg-navy">
        <Footer />
      </div>
    </div>
  );
}
