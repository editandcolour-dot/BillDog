import Image from 'next/image';
import Link from 'next/link';

/** Footer link groups. */
const FOOTER_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'POPIA Compliance', href: '/popia' },
  { label: 'Contact', href: '/contact' },
] as const;

/** Current year for copyright. */
const CURRENT_YEAR = new Date().getFullYear();

/**
 * Site footer — dark background, logo + legal links + disclaimer.
 */
export function Footer() {
  return (
    <footer className="bg-footer-dark">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%] py-12 md:py-16">
        {/* Top row: logo + links */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          {/* Logo */}
          <Link href="/" aria-label="Billdog home">
            <Image
              src="/logo.svg"
              alt="Billdog logo"
              width={144}
              height={36}
              className="h-[36px] w-auto"
            />
          </Link>

          {/* Footer nav */}
          <nav aria-label="Footer links">
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {FOOTER_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="min-h-[44px] flex items-center text-white/50 hover:text-white text-sm transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-white/30 text-sm leading-relaxed max-w-2xl">
          Billdog is not a law firm and does not provide legal advice. We
          use AI-powered analysis to identify potential billing errors and
          generate dispute letters based on applicable legislation. Results
          are not guaranteed.
        </p>

        {/* Copyright */}
        <p className="mt-6 pt-6 border-t border-white/[0.06] text-white/30 text-sm text-center">
          © {CURRENT_YEAR} Billdog (Pty) Ltd. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
