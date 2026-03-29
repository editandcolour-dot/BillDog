import { Button } from '@/components/ui/Button';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

/**
 * Final CTA section — navy background with strong call to action.
 */
export function CtaSection() {
  return (
    <section
      className="bg-navy py-16 md:py-20 lg:py-24 relative overflow-hidden"
      aria-labelledby="cta-heading"
    >
      {/* Gradient glow (decorative) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange/[0.04] rounded-full blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%] text-center">
        <ScrollReveal>
          <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-4 block">
            Ready to Fight Back?
          </span>
          <h2
            id="cta-heading"
            className="font-display text-white tracking-wide text-[clamp(2.2rem,4vw,3.5rem)] mb-6"
          >
            YOUR MONEY. YOUR RIGHT.
          </h2>
          <p className="text-white/60 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-8">
            Upload your municipal bill and find out in under 2 minutes if
            you&apos;re being overcharged. No cost, no commitment.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button href="/signup" size="lg" className="w-full sm:w-auto">
              Dispute My Bill →
            </Button>
            <Button
              href="#how-it-works"
              variant="outline-dark"
              size="lg"
              className="w-full sm:w-auto"
            >
              See How It Works
            </Button>
          </div>
          <p className="mt-6 text-white/30 text-sm">
            No win, no fee. We only charge 20% of what we recover.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
