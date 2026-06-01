import Link from 'next/link';

interface DashboardActionCardsProps {
  hasAutofetch: boolean;
  /** True when the user IS connected but the saved password no longer works
   *  (e.g. they changed it on the municipal portal). Triggers a Reconnect banner. */
  autofetchStale?: boolean;
  /** Municipality name used in the stale banner copy. */
  staleMunicipalityName?: string | null;
}

/**
 * Dashboard action cards â€” "Connect Municipality" and "Upload Bill Manually".
 *
 * States:
 *   - not connected  â†’ Connect Municipality CTA + Upload Manually side-by-side
 *   - connected fine â†’ Upload Manually only (no card needed for a healthy connection)
 *   - connected but stale â†’ bright orange "Reconnect" banner + Upload Manually
 */
export function DashboardActionCards({
  hasAutofetch,
  autofetchStale = false,
  staleMunicipalityName = null,
}: DashboardActionCardsProps) {
  const showConnectCta = !hasAutofetch;
  const muniName = staleMunicipalityName || 'your municipality';

  return (
    <>
      {/* Stale credential banner — highest priority */}
      {autofetchStale && (
        <Link
          href="/account#auto-fetch"
          className="group block mb-4 rounded-2xl border-l-4 border-orange bg-orange/5 hover:bg-orange/10 p-5 md:p-6 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg tracking-wide uppercase text-navy mb-1">
                Reconnect {muniName}
              </h3>
              <p className="text-sm text-grey leading-relaxed">
                Your saved {muniName} password no longer works — most likely because
                it was changed on the portal. We&apos;ve paused bill monitoring until
                you re-enter the current password. Your existing bills are safe.
              </p>
              <span className="inline-flex items-center gap-1.5 mt-2 text-orange text-sm font-bold group-hover:gap-3 transition-all duration-200">
                Reconnect now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </div>
          </div>
        </Link>
      )}

      <div className={`grid gap-4 mb-8 ${showConnectCta ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Connect Municipality — only when not connected */}
        {showConnectCta && (
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
    </>
  );
}
