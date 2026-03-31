import type { Metadata } from 'next';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Pricing | Billdog',
  description:
    'Billdog operates on a 20% success fee. No upfront costs. You only pay when we recover money for you.',
  openGraph: {
    title: 'Pricing | Billdog',
    description:
      'No upfront costs. 20% success fee — only if we win. See how it works with a real example.',
    url: 'https://billdog.co.za/pricing',
  },
};

export default function PricingPage() {
  return (
    <article className="bg-off-white min-h-screen">
      {/* Hero */}
      <section className="bg-navy relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue/10 rounded-full blur-[100px]" />

        <div className="relative max-w-[1200px] mx-auto px-6 md:px-[6%] pt-32 pb-16 text-center">
          <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
            Pricing
          </span>
          <h1 className="font-display text-4xl md:text-6xl text-white tracking-wider leading-tight">
            WE ONLY WIN IF <span className="text-orange">YOU WIN</span>
          </h1>
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
            Zero upfront cost. Zero risk. We take 20% of what we recover — and only if we actually recover it.
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%]">
          <ScrollReveal>
            <div className="max-w-xl mx-auto">
              <div className="bg-white border-2 border-orange rounded-2xl overflow-hidden shadow-xl">
                {/* Card Header */}
                <div className="bg-navy px-8 py-8 text-center">
                  <span className="text-orange text-xs font-bold uppercase tracking-[2px] block mb-2">
                    Success Fee
                  </span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-display text-[5rem] md:text-[6rem] text-white leading-none">20</span>
                    <span className="font-display text-3xl text-orange">%</span>
                  </div>
                  <p className="mt-2 text-white/50 text-sm font-medium">
                    of recovered amount — only on success
                  </p>
                </div>

                {/* Benefits */}
                <div className="px-8 py-8 space-y-4">
                  {[
                    'Free bill analysis',
                    'Free letter generation',
                    'Free case tracking',
                    'No charge if no recovery',
                    'No subscriptions or hidden fees',
                    'Card stored securely via PayFast',
                  ].map((benefit) => (
                    <div key={benefit} className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-grey font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="px-8 pb-8">
                  <a
                    href="/signup"
                    className="block w-full min-h-[44px] px-7 py-4 bg-orange text-white font-bold rounded-md hover:bg-orange-light hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)] active:translate-y-0 transition-all duration-200 text-center text-lg"
                  >
                    Start Free Analysis →
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Worked Example */}
          <ScrollReveal>
            <div className="mt-16 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
                  Worked Example
                </span>
                <h2 className="font-display text-navy tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]">
                  SEE THE MATHS
                </h2>
              </div>

              <div className="bg-white border border-light-grey rounded-2xl p-7 md:p-8 space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-light-grey">
                  <span className="text-grey font-medium">Total billed by municipality</span>
                  <span className="text-navy font-bold text-lg">R8,450.00</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-light-grey">
                  <span className="text-grey font-medium">Errors identified</span>
                  <span className="text-error font-bold text-lg">3 overcharges</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-light-grey">
                  <span className="text-grey font-medium">Total overcharged</span>
                  <span className="text-error font-bold text-lg">R3,200.00</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-light-grey">
                  <span className="text-grey font-medium">Billdog fee (20%)</span>
                  <span className="text-navy font-bold text-lg">R640.00</span>
                </div>
                <div className="flex justify-between items-center bg-success/5 rounded-xl p-4">
                  <span className="text-navy font-bold text-lg">You keep</span>
                  <span className="text-success font-bold text-2xl font-display">R2,560.00</span>
                </div>
              </div>

              <p className="mt-6 text-center text-grey text-sm leading-relaxed">
                If we find no errors or the dispute is unsuccessful, you pay R0.
                <br />
                Your card is only charged after you confirm the municipality has corrected the bill.
              </p>
            </div>
          </ScrollReveal>

          {/* Comparison */}
          <ScrollReveal>
            <div className="mt-16 max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
                  Compare
                </span>
                <h2 className="font-display text-navy tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]">
                  WHY BILLDOG WINS
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-navy">
                      <th className="py-4 pr-4 text-navy font-bold text-sm uppercase tracking-wider" />
                      <th className="py-4 px-4 text-navy font-bold text-sm uppercase tracking-wider text-center">
                        Billdog
                      </th>
                      <th className="py-4 px-4 text-grey font-bold text-sm uppercase tracking-wider text-center">
                        DIY
                      </th>
                      <th className="py-4 pl-4 text-grey font-bold text-sm uppercase tracking-wider text-center">
                        Attorney
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      { feature: 'Speed', billdog: '< 2 minutes', diy: 'Hours/days', attorney: 'Weeks' },
                      { feature: 'Upfront cost', billdog: 'R0', diy: 'R0', attorney: 'R2,000+' },
                      { feature: 'Legal accuracy', billdog: 'AI + legislation', diy: 'Guesswork', attorney: 'Expert' },
                      { feature: 'Bill tracking', billdog: 'Automated', diy: 'Manual', attorney: 'Manual' },
                      { feature: 'Success rate', billdog: '94%', diy: '< 30%', attorney: '85%' },
                    ].map(({ feature, billdog, diy, attorney }) => (
                      <tr key={feature} className="border-b border-light-grey">
                        <td className="py-4 pr-4 text-navy font-medium">{feature}</td>
                        <td className="py-4 px-4 text-center font-bold text-navy">{billdog}</td>
                        <td className="py-4 px-4 text-center text-grey">{diy}</td>
                        <td className="py-4 pl-4 text-center text-grey">{attorney}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-navy py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%] text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-5xl text-white tracking-wide">
              FOUND MONEY <span className="text-orange">WAITING</span>
            </h2>
            <p className="mt-4 text-white/60 text-lg max-w-lg mx-auto">
              Most South Africans overpay their municipality without knowing it. Find out in under 2 minutes.
            </p>
            <div className="mt-8">
              <a
                href="/signup"
                className="inline-block min-h-[44px] px-10 py-4 bg-orange text-white font-bold rounded-md hover:bg-orange-light hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)] active:translate-y-0 transition-all duration-200 text-lg"
              >
                Dispute My Bill — It&apos;s Free
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </article>
  );
}
