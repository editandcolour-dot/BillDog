import { ScrollReveal } from '@/components/ui/ScrollReveal';

/** Launch messaging — honest, building trust over numbers. */
const FEATURES = [
  {
    value: '60s',
    label: 'AI analysis in under 60 seconds',
    description: 'Identify errors and calculate what you are owed instantly',
  },
  {
    value: '102',
    label: 'Section 102 legal protection',
    description: 'Disputes fully compliant with the Municipal Systems Act',
  },
  {
    value: '20%',
    label: 'Success fee only if we win — zero upfront',
    description: 'No risk to you. We only charge a 20% fee when you recover money',
  },
] as const;

/**
 * Launch section — 3 feature cards on dark background.
 */
export function StatsSection() {
  return (
    <section
      className="bg-navy py-16 md:py-20 lg:py-24"
      aria-labelledby="launch-heading"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%]">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
              Launching in South Africa
            </span>
            <h2
              id="launch-heading"
              className="font-display text-white tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]"
            >
              BE AMONG THE FIRST TO DISPUTE YOUR BILL
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {FEATURES.map(({ value, label, description }) => (
            <ScrollReveal key={label}>
              <div className="bg-white/5 border border-white/[0.08] rounded-2xl p-7 text-center hover:-translate-y-1 hover:border-white/20 transition-all duration-200">
                <p className="font-display text-[3rem] md:text-[3.8rem] text-orange leading-none">
                  {value}
                </p>
                <p className="mt-4 text-white font-bold text-base">
                  {label}
                </p>
                <p className="mt-1 text-white/40 text-sm">{description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
