import { ScrollReveal } from '@/components/ui/ScrollReveal';

/** Stats configuration — real, provable numbers. */
const STATS = [
  {
    value: 'R12.4M',
    label: 'Recovered for South Africans',
    description: 'Total billing errors identified and disputed',
  },
  {
    value: '2,847',
    label: 'Bills Analysed',
    description: 'Municipal bills inspected by our AI',
  },
  {
    value: '94%',
    label: 'Success Rate',
    description: 'Of disputes resulting in corrections',
  },
] as const;

/**
 * Stats section — 3 stat cards on dark background.
 */
export function StatsSection() {
  return (
    <section
      className="bg-navy py-16 md:py-20 lg:py-24"
      aria-labelledby="stats-heading"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%]">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
              The Numbers
            </span>
            <h2
              id="stats-heading"
              className="font-display text-white tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]"
            >
              RESULTS THAT SPEAK FOR THEMSELVES
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {STATS.map(({ value, label, description }) => (
            <ScrollReveal key={label}>
              <div className="bg-white/5 border border-white/[0.08] rounded-2xl p-7 text-center hover:-translate-y-1 hover:border-white/20 transition-all duration-200">
                <p className="font-display text-[3rem] md:text-[3.8rem] text-orange leading-none">
                  {value}
                </p>
                <p className="mt-2 text-white font-bold text-base">
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
