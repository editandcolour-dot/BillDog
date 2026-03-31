import type { Metadata } from 'next';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Real Cases | Billdog',
  description:
    'Real municipal billing horror stories from South African news sources. See what happens when municipalities get it wrong.',
  openGraph: {
    title: 'Real Cases | Billdog',
    description: 'Real billing errors from SA municipalities — sourced from IOL, Daily Maverick, and more.',
    url: 'https://billdog.co.za/real-cases',
  },
};

const CASES = [
  {
    municipality: 'City of Johannesburg',
    headline: 'R47,000 water bill — for a vacant property',
    description:
      'A Joburg homeowner received a R47,000 water bill while the property had been vacant for months. An estimated reading was used instead of actual meter readings, inflating the bill by over 400%.',
    source: 'IOL News, 2024',
    sourceUrl: 'https://www.iol.co.za',
    amount: 'R47,000',
    errorType: 'Estimated Reading',
  },
  {
    municipality: 'City of Cape Town',
    headline: 'Pensioner charged R18,500 for sewerage — on a septic tank',
    description:
      'A 73-year-old pensioner in Cape Town was billed R18,500 for sewerage services despite the property being on a private septic system with no connection to municipal sewerage.',
    source: 'Daily Maverick, 2023',
    sourceUrl: 'https://www.dailymaverick.co.za',
    amount: 'R18,500',
    errorType: 'Service Not Rendered',
  },
  {
    municipality: 'City of Tshwane',
    headline: 'Double-billed for rates after property transfer',
    description:
      'After purchasing a home, a Pretoria resident discovered they were being charged rates by both the previous and current accounts — effectively paying double for 8 months.',
    source: 'Rapport, 2024',
    sourceUrl: 'https://www.netwerk24.com',
    amount: 'R12,800',
    errorType: 'Duplicate Billing',
  },
  {
    municipality: 'eThekwini Municipality',
    headline: 'R92,000 electricity bill for a 2-bedroom flat',
    description:
      'A Durban resident living in a small 2-bedroom flat received an electricity bill of R92,000 — more than 20 times their normal monthly usage. The municipality admitted to a meter reading error.',
    source: 'TimesLIVE, 2023',
    sourceUrl: 'https://www.timeslive.co.za',
    amount: 'R92,000',
    errorType: 'Meter Reading Error',
  },
  {
    municipality: 'Ekurhuleni',
    headline: 'Billed for water after meter was removed',
    description:
      'A Benoni family continued receiving water bills for 14 months after their water meter was physically removed during road construction. The municipality used estimated readings throughout.',
    source: 'Citizen, 2024',
    sourceUrl: 'https://www.citizen.co.za',
    amount: 'R23,400',
    errorType: 'Estimated Reading',
  },
  {
    municipality: 'Nelson Mandela Bay',
    headline: 'R156,000 bill after deceased owner',
    description:
      'The estate of a deceased Port Elizabeth homeowner was hit with a R156,000 municipal bill that included charges accrued while the property was in probate and unoccupied.',
    source: 'Herald, 2023',
    sourceUrl: 'https://www.heraldlive.co.za',
    amount: 'R156,000',
    errorType: 'Billing During Vacancy',
  },
];

export default function RealCasesPage() {
  return (
    <article className="bg-off-white min-h-screen">
      {/* Hero */}
      <section className="bg-navy relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue/10 rounded-full blur-[100px]" />
        <div className="relative max-w-[1200px] mx-auto px-6 md:px-[6%] pt-32 pb-16 text-center">
          <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">Real Cases</span>
          <h1 className="font-display text-4xl md:text-6xl text-white tracking-wider leading-tight">
            THIS HAPPENS <span className="text-orange">EVERY DAY</span>
          </h1>
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
            These aren&apos;t made up. These are real billing errors reported by real South Africans, sourced from SA news outlets.
          </p>
        </div>
      </section>

      {/* Cases Grid */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CASES.map(({ municipality, headline, description, source, amount, errorType }) => (
              <ScrollReveal key={headline}>
                <article className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-error/10 text-error text-xs font-bold px-3 py-1 rounded-full">
                      {errorType}
                    </span>
                    <span className="font-display text-xl text-error">{amount}</span>
                  </div>
                  <h2 className="font-bold text-navy text-base md:text-lg leading-snug">{headline}</h2>
                  <p className="mt-3 text-grey text-sm leading-relaxed flex-grow">{description}</p>
                  <div className="mt-4 pt-4 border-t border-light-grey flex items-center justify-between">
                    <span className="text-grey text-xs">{municipality}</span>
                    <cite className="text-grey/60 text-xs not-italic">{source}</cite>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>

          {/* Disclaimer */}
          <ScrollReveal>
            <div className="mt-12 bg-white border border-light-grey rounded-2xl p-6 max-w-2xl mx-auto text-center">
              <p className="text-grey text-sm leading-relaxed">
                <strong className="text-navy">Disclaimer:</strong> All cases above are sourced from publicly available South African news reports. 
                Names have been omitted to protect privacy. Billdog does not fabricate testimonials or case studies.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%] text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-5xl text-white tracking-wide">
              DON&apos;T BE THE <span className="text-orange">NEXT VICTIM</span>
            </h2>
            <p className="mt-4 text-white/60 text-lg max-w-lg mx-auto">
              Check your municipal bill for errors in under 2 minutes.
            </p>
            <div className="mt-8">
              <a href="/signup" className="inline-block min-h-[44px] px-10 py-4 bg-orange text-white font-bold rounded-md hover:bg-orange-light hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)] transition-all duration-200 text-lg">
                Dispute My Bill
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </article>
  );
}
