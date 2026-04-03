import type { Metadata } from 'next';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'How It Works | Billdog',
  description:
    'Upload your municipal bill, our AI finds the errors, we send the dispute letter. Five simple steps to recover your money.',
  openGraph: {
    title: 'How It Works | Billdog',
    description:
      'Upload your bill. AI finds errors. We send the dispute letter. You get paid.',
    url: 'https://billdog.co.za/how-it-works',
  },
};

const STEPS = [
  {
    number: 1,
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    title: 'Upload Your Bill',
    description:
      'Take a photo or upload a PDF of your municipal bill. Our system accepts bills from all 8 South African metros.',
    detail: 'Supports PDF, JPG, and PNG. Takes less than 30 seconds.',
  },
  {
    number: 2,
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'AI Scans Every Line',
    description:
      'Our AI analyses every line item — water, electricity, rates, refuse, sewerage — and compares them against tariff schedules, usage patterns, and legal limits.',
    detail: 'Analysis completes in under 2 minutes.',
  },
  {
    number: 3,
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: 'Review Your Results',
    description:
      'See exactly which charges are wrong, how much you can recover, and the specific law that protects you. No legal jargon — plain English.',
    detail: 'Every error comes with a legal basis citation.',
  },
  {
    number: 4,
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'We Send the Letter',
    description:
      'A formal dispute letter citing Section 102 of the Municipal Systems Act is emailed directly to your municipality\'s complaints department. You can preview and edit it first.',
    detail: 'Delivered via tracked email with confirmation.',
  },
  {
    number: 5,
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'You Get Paid',
    description:
      'When the municipality corrects your bill, you save money. We only take 20% of what we recover — if we don\'t win, you don\'t pay. Ever.',
    detail: 'You only pay 20% of what we recover — nothing if we don\'t win.',
  },
] as const;

const TRUST_POINTS = [
  { label: 'Section 102 compliant', icon: '⚖️' },
  { label: 'AI-powered, legally-templated', icon: '🤖' },
  { label: 'POPIA compliant', icon: '🔒' },
  { label: 'No upfront cost', icon: '💰' },
];

export default function HowItWorksPage() {
  return (
    <article className="bg-off-white min-h-screen">
      {/* Hero Banner */}
      <section className="bg-navy relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue/10 rounded-full blur-[100px]" />

        <div className="relative max-w-[1200px] mx-auto px-6 md:px-[6%] pt-32 pb-16 text-center">
          <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
            How It Works
          </span>
          <h1 className="font-display text-4xl md:text-6xl text-white tracking-wider leading-tight">
            FROM UPLOAD TO <span className="text-orange">RECOVERY</span>
          </h1>
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
            Fighting your municipal bill shouldn&apos;t require a lawyer, a queue, or a prayer.
            Here&apos;s how Billdog does it in five steps.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <div className="bg-white border-b border-light-grey">
        <div className="max-w-[1200px] mx-auto flex justify-around items-center flex-wrap gap-5 py-5 px-6 md:px-[6%]">
          {TRUST_POINTS.map(({ label, icon }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="text-xl" aria-hidden="true">{icon}</span>
              <span className="text-grey text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%]">
          <div className="space-y-6">
            {STEPS.map(({ number, icon, title, description, detail }) => (
              <ScrollReveal key={number}>
                <div className="bg-white border border-light-grey rounded-2xl p-7 md:p-8 hover:shadow-xl transition-all duration-200 flex flex-col md:flex-row gap-6 items-start">
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-navy border-2 border-orange rounded-full flex items-center justify-center">
                      {icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-orange/10 text-orange text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Step {number}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl text-navy tracking-wide uppercase">
                      {title}
                    </h2>
                    <p className="mt-3 text-grey text-base leading-relaxed max-w-2xl">
                      {description}
                    </p>
                    <p className="mt-3 text-sm text-navy/60 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {detail}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%] text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-5xl text-white tracking-wide">
              READY TO <span className="text-orange">FIGHT BACK</span>?
            </h2>
            <p className="mt-4 text-white/60 text-lg max-w-lg mx-auto">
              Upload your bill now. Analysis takes under 2 minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="min-h-[44px] px-8 py-4 bg-orange text-white font-bold rounded-md hover:bg-orange-light hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)] active:translate-y-0 transition-all duration-200 text-center text-lg"
              >
                Dispute My Bill
              </a>
              <a
                href="/pricing"
                className="min-h-[44px] px-8 py-4 bg-transparent text-white font-bold border-2 border-white/30 rounded-md hover:border-white hover:bg-white/[0.08] hover:-translate-y-0.5 transition-all duration-200 text-center text-lg"
              >
                See Pricing
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </article>
  );
}
