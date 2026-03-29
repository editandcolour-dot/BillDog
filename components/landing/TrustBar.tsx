/**
 * Trust bar — sits below hero to build credibility.
 * 5 trust items with icons.
 */

/** SVG icons as inline components (decorative — aria-hidden). */
function ShieldIcon() {
  return (
    <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 01-6.001 0M18 7l-3 9m3-9l-6-2M12 5V3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/** Trust items configuration. */
const TRUST_ITEMS = [
  { icon: ShieldIcon, label: 'Section 102 Compliant' },
  { icon: BoltIcon, label: 'AI-Powered Analysis' },
  { icon: ScaleIcon, label: 'Human-Reviewed Letters' },
  { icon: LockIcon, label: 'POPIA Compliant' },
  { icon: CurrencyIcon, label: 'No Win, No Fee' },
] as const;

export function TrustBar() {
  return (
    <section className="bg-off-white border-b border-light-grey" aria-label="Trust indicators">
      <div className="max-w-[1200px] mx-auto grid grid-cols-2 sm:grid-cols-3 md:flex md:justify-around gap-4 py-6 md:py-7 px-4 sm:px-6 md:px-[6%]">
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-navy/10 rounded-lg flex items-center justify-center shrink-0">
              <Icon />
            </div>
            <span className="text-grey text-xs sm:text-sm font-medium">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
