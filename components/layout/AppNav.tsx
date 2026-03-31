'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AppNav({ userName }: { userName: string }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="fixed top-0 w-full bg-navy whitespace-nowrap z-50 py-4 px-4 sm:px-6 lg:px-8 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" aria-label="Dashboard Home" className="flex items-center gap-1">
          <Image
            src="/bulldog-mascot.png"
            alt="Billdog mascot"
            width={48}
            height={48}
            priority
            className="h-[40px] w-[40px] sm:h-[48px] sm:w-[48px] object-cover"
          />
          <span className="font-display text-xl sm:text-2xl tracking-wide text-white -ml-[6px] sm:-ml-[8px]">
            BILL<span className="text-orange">DOG</span>
          </span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="text-white/80 text-sm hidden sm:inline-block">
            {userName}
          </span>
          <Link href="/settings" className="text-sm font-medium text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange rounded-sm">
            Settings
          </Link>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-orange hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
