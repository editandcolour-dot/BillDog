import { Button } from '@/components/ui/Button';

/**
 * Hero section — full-viewport, navy background, gradient glows.
 * Floating bill card hidden on mobile.
 */
export function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative min-h-screen bg-navy overflow-hidden"
    >
      {/* Gradient glows (decorative) */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange/[0.06] rounded-full blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue/[0.08] rounded-full blur-[100px]"
        aria-hidden="true"
      />

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%] pt-28 md:pt-32 pb-16 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div className="opacity-0 animate-fade-up">
            <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-4 block">
              AI-Powered Billing Disputes
            </span>
            <h1
              id="hero-heading"
              className="font-display text-white tracking-wider leading-[1.1] text-[clamp(2.5rem,8vw,5rem)]"
            >
              YOUR MUNICIPALITY GOT IT{' '}
              <span className="text-orange">WRONG</span>
            </h1>
            <p className="mt-6 text-white/60 text-base sm:text-lg leading-relaxed max-w-lg">
              No lawyers. No queues. No nonsense. Just results.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button href="/signup" className="w-full sm:w-auto">
                Dispute My Bill →
              </Button>
              <Button
                href="#how-it-works"
                variant="outline-dark"
                className="w-full sm:w-auto"
              >
                See How It Works
              </Button>
            </div>
            <p className="mt-4 text-white/40 text-sm">
              AI-powered analysis, human-reviewed letters
            </p>
          </div>

          {/* Floating bill card — desktop only, decorative */}
          <div
            className="hidden lg:block motion-safe:animate-float"
            aria-hidden="true"
          >
            <div className="bg-white/5 border border-white/[0.08] rounded-2xl p-7 backdrop-blur-sm max-w-sm ml-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/40 text-xs font-bold uppercase tracking-wider">
                  Bill Analysis
                </span>
                <span className="bg-success/10 text-success text-xs font-bold px-3 py-1 rounded-full">
                  3 Errors Found
                </span>
              </div>
              <div className="space-y-3">
                <BillLineItem
                  label="Water (estimated)"
                  amount="R2,340"
                  isError
                />
                <BillLineItem
                  label="Refuse removal"
                  amount="R890"
                  isError
                />
                <BillLineItem label="Rates" amount="R1,250" />
                <BillLineItem
                  label="Sewerage (duplicate)"
                  amount="R760"
                  isError
                />
              </div>
              <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-white/40 text-sm">Recoverable</span>
                <span className="font-display text-2xl text-success">
                  R3,990
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Single line item in the floating bill card. */
function BillLineItem({
  label,
  amount,
  isError = false,
}: {
  label: string;
  amount: string;
  isError?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
      <span className="text-white/60 text-sm">{label}</span>
      <span
        className={`text-sm font-bold ${isError ? 'text-error' : 'text-white/80'}`}
      >
        {amount}
      </span>
    </div>
  );
}
