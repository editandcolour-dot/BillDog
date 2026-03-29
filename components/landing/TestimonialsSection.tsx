import { ScrollReveal } from '@/components/ui/ScrollReveal';

/**
 * Illustrative testimonial examples.
 * Clearly labelled as illustrative — not real customer testimonials (DD-004).
 */
const TESTIMONIALS = [
  {
    name: 'Thandi M.',
    location: 'Johannesburg',
    quote:
      'I was paying R3,200 a month for water I wasn\'t using. Billdog found the estimated readings and got me a R14,000 refund.',
    recovered: 'R14,000',
    avatar: 'TM',
  },
  {
    name: 'Johan v.d. Berg',
    location: 'Cape Town',
    quote:
      'The municipality had been double-charging me for refuse for 6 months. I never would have caught it without the AI analysis.',
    recovered: 'R5,340',
    avatar: 'JB',
  },
  {
    name: 'Priya N.',
    location: 'Durban',
    quote:
      'As a pensioner on a fixed income, every rand counts. Billdog found R8,200 in overcharges on my electricity and got it corrected within 3 weeks.',
    recovered: 'R8,200',
    avatar: 'PN',
  },
] as const;

export function TestimonialsSection() {
  return (
    <section
      className="bg-off-white py-16 md:py-20 lg:py-24"
      aria-labelledby="testimonials-heading"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%]">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
              Success Stories
            </span>
            <h2
              id="testimonials-heading"
              className="font-display text-navy tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]"
            >
              WE FIGHT. YOU SAVE.
            </h2>
            <p className="mt-3 text-grey text-sm italic">
              Illustrative examples based on common billing error patterns
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map(
            ({ name, location, quote, recovered, avatar }) => (
              <ScrollReveal key={name}>
                <div className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 h-full flex flex-col">
                  {/* Quote */}
                  <blockquote className="text-grey text-base leading-relaxed flex-grow">
                    &ldquo;{quote}&rdquo;
                  </blockquote>

                  {/* Author + recovered */}
                  <div className="mt-6 pt-4 border-t border-light-grey flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-navy rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {avatar}
                        </span>
                      </div>
                      <div>
                        <p className="text-navy font-bold text-sm">{name}</p>
                        <p className="text-grey text-xs">{location}</p>
                      </div>
                    </div>
                    <span className="font-display text-xl text-success">
                      {recovered}
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
