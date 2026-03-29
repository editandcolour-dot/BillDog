import Image from 'next/image';
import Link from 'next/link';



import { createClient } from '@/lib/supabase/server';

/** Navigation links displayed on desktop. */
const NAV_LINKS = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Real Cases', href: '/#real-cases' },
  { label: 'FAQ', href: '/#faq' },
] as const;

/**
 * Site navigation — fixed top, navy background with backdrop blur.
 * Mobile: logo + CTA only. Desktop: logo + nav links + CTA.
 */
export async function Nav() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const ctaLabel = session ? 'Dashboard →' : 'Upload My Bill →';
  const ctaHref = session ? '/dashboard' : '/signup';

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav
        aria-label="Main navigation"
        className="bg-navy/95 backdrop-blur-md border-b border-white/[0.06]"
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%] h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" aria-label="Billdog home">
            <Image
              src="/logo.svg"
              alt="Billdog logo"
              width={168}
              height={42}
              priority
              className="h-[36px] w-auto sm:h-[42px]"
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="min-h-[44px] flex items-center text-white/70 hover:text-white text-sm font-medium transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
            <Link 
              href={ctaHref}
              className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 bg-orange hover:bg-orange-light text-white font-bold rounded-md transition-all duration-200 hover:-translate-y-0.5 shadow-md text-sm"
            >
              {ctaLabel}
            </Link>
          </div>

          {/* Mobile: CTA only */}
          <div className="flex md:hidden items-center">
            <Link 
              href={ctaHref}
              className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 bg-orange hover:bg-orange-light text-white font-bold rounded-md transition-all duration-200 hover:-translate-y-0.5 shadow-md text-sm"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
