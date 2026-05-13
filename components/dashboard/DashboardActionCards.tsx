import Link from 'next/link';

interface DashboardActionCardsProps {
  hasAutofetch: boolean;
}

/**
 * Dashboard action cards — "Connect Municipality" and "Upload Bill Manually".
 * 
 * Shows a prominent recovery path for users who haven't set up autofetch,
 * and always shows the manual upload fallback option.
 */
export function DashboardActionCards({ hasAutofetch }: DashboardActionCardsProps) {
  return (
    <div className={`grid gap-4 mb-8 ${hasAutofetch ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
      {/* Connect Municipality — only show if not connected */}
      {!hasAutofetch && (
        <Link
          href="/onboarding/auto-fetch"
          className="group relative overflow-hidden bg-gradient-to-br from-navy to-[#132d52] text-white rounded-2xl p-6 md:p-8 border border-white/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          {/* Decorative circle */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-orange/10 group-hover:bg-orange/20 transition-colors duration-300" />
          <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-blue/10 group-hover:bg-blue/20 transition-colors duration-300" />

          <div className="relative z-10 flex items-start gap-5">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl tracking-wide uppercase mb-1">
                Connect Municipality
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Link your municipal account for automatic bill fetching. We&apos;ll
                scrape, analyse, and flag overcharges — hands-free.
              </p>
              <span className="inline-flex items-center gap-1.5 mt-3 text-orange text-sm font-bold group-hover:gap-3 transition-all duration-200">
                Set up now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Upload Bill Manually — always visible */}
      <Link
        href="/upload"
        className="group relative overflow-hidden bg-white text-navy rounded-2xl p-6 md:p-8 border border-light-grey shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      >
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-navy/5 flex items-center justify-center group-hover:bg-orange/10 transition-colors duration-300">
            <svg className="w-6 h-6 text-navy group-hover:text-orange transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl tracking-wide uppercase mb-1">
              Upload Bill Manually
            </h3>
            <p className="text-grey text-sm leading-relaxed">
              Drop a PDF or photo of your municipal bill. We&apos;ll analyse it for
              overcharges and generate a dispute letter in minutes.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-3 text-orange text-sm font-bold group-hover:gap-3 transition-all duration-200">
              Upload now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
