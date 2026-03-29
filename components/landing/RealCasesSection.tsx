import { ScrollReveal } from '@/components/ui/ScrollReveal';

/** Real case stories — sourced from news (DD-004: no fake testimonials). */
const REAL_CASES = [
  {
    municipality: 'City of Johannesburg',
    headline: 'R47,000 water bill — for a vacant property',
    description:
      'A Joburg homeowner received a R47,000 water bill while the property had been vacant for months. An estimated reading was used instead of actual meter readings, inflating the bill by over 400%.',
    source: 'IOL News, 2024',
    amount: 'R47,000',
    errorType: 'Estimated Reading',
  },
  {
    municipality: 'City of Cape Town',
    headline: 'Pensioner charged R18,500 for sewerage — on a septic tank',
    description:
      'A 73-year-old pensioner in Cape Town was billed R18,500 for sewerage services despite the property being on a private septic system with no connection to municipal sewerage.',
    source: 'Daily Maverick, 2023',
    amount: 'R18,500',
    errorType: 'Service Not Rendered',
  },
  {
    municipality: 'City of Tshwane',
    headline: 'Double-billed for rates after property transfer',
    description:
      'After purchasing a home, a Pretoria resident discovered they were being charged rates by both the previous and current accounts — effectively paying double for 8 months.',
    source: 'Rapport, 2024',
    amount: 'R12,800',
    errorType: 'Duplicate Billing',
  },
] as const;

/**
 * Real Cases section — sourced horror stories with card layout.
 */
export function RealCasesSection() {
  return (
    <section
      id="real-cases"
      className="bg-white py-16 md:py-20 lg:py-24"
      aria-labelledby="cases-heading"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%]">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
              Real Cases
            </span>
            <h2
              id="cases-heading"
              className="font-display text-navy tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]"
            >
              THIS HAPPENS EVERY DAY
            </h2>
            <p className="mt-4 text-grey text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Municipal billing errors affect thousands of South Africans.
              These are real stories from real people.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REAL_CASES.map(
            ({ municipality, headline, description, source, amount, errorType }) => (
              <ScrollReveal key={headline}>
                <article className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-error/10 text-error text-xs font-bold px-3 py-1 rounded-full">
                      {errorType}
                    </span>
                    <span className="font-display text-xl text-error">
                      {amount}
                    </span>
                  </div>
                  <h3 className="font-bold text-navy text-base md:text-lg leading-snug">
                    {headline}
                  </h3>
                  <p className="mt-3 text-grey text-sm leading-relaxed flex-grow">
                    {description}
                  </p>
                  <div className="mt-4 pt-4 border-t border-light-grey flex items-center justify-between">
                    <span className="text-grey text-xs">{municipality}</span>
                    <cite className="text-grey/60 text-xs not-italic">
                      {source}
                    </cite>
                  </div>
                </article>
              </ScrollReveal>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
