import { ScrollReveal } from '@/components/ui/ScrollReveal';

/** 5-step process. */
const STEPS = [
  {
    number: 1,
    title: 'Upload Your Bill',
    description: 'Photo or PDF — our AI handles both. Takes 30 seconds.',
  },
  {
    number: 2,
    title: 'AI Analysis',
    description:
      'We scan every line item for overcharges, estimates, and duplicate entries.',
  },
  {
    number: 3,
    title: 'Review Results',
    description:
      'See exactly what\'s wrong, how much you can recover, and the legal basis.',
  },
  {
    number: 4,
    title: 'We Send the Letter',
    description:
      'A formal dispute letter citing Section 102 is emailed to your municipality.',
  },
  {
    number: 5,
    title: 'You Get Paid',
    description:
      'When the municipality corrects the bill, you save. We take 20% of what we recover — only if we win.',
  },
] as const;

/**
 * How It Works — 5-step process with numbered circles and connecting line.
 */
export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="bg-off-white py-16 md:py-20 lg:py-24"
      aria-labelledby="how-heading"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%]">
        <ScrollReveal>
          <div className="text-center mb-14">
            <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
              How It Works
            </span>
            <h2
              id="how-heading"
              className="font-display text-navy tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]"
            >
              FIVE SIMPLE STEPS
            </h2>
          </div>
        </ScrollReveal>

        <div className="relative">
          {/* Connecting line — desktop only */}
          <div
            className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-orange to-blue"
            aria-hidden="true"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-5">
            {STEPS.map(({ number, title, description }) => (
              <ScrollReveal
                key={number}
                className={number === 5 ? 'col-span-2 md:col-span-1' : ''}
              >
                <div className="text-center relative">
                  <div className="w-16 h-16 mx-auto bg-navy border-2 border-orange rounded-full flex items-center justify-center">
                    <span className="font-display text-2xl text-white">
                      {number}
                    </span>
                  </div>
                  <h3 className="mt-5 font-bold text-navy text-base lg:text-lg">
                    {title}
                  </h3>
                  <p className="mt-2 text-grey text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
