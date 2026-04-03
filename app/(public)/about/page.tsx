import type { Metadata } from 'next';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'About | Billdog',
  description:
    'Billdog is an AI-powered municipal billing dispute service built for South African property owners.',
  openGraph: {
    title: 'About | Billdog',
    description: 'AI-powered billing disputes for South African property owners.',
    url: 'https://billdog.co.za/about',
  },
};

const VALUES = [
  {
    title: 'Transparency First',
    description:
      'We tell you exactly what we find, how we find it, and what it costs. If your bill is correct, we say so — and you pay nothing.',
    emoji: '👁️',
  },
  {
    title: 'AI + Law',
    description:
      'Our AI is trained on SA municipal legislation — the Municipal Systems Act, Prescription Act, and Electricity Regulation Act.',
    emoji: '⚖️',
  },
  {
    title: 'Consumer Champion',
    description:
      'Municipalities hold the power. You hold the bill. We level the playing field with technology, not lawyers.',
    emoji: '🛡️',
  },
  {
    title: 'Privacy by Design',
    description:
      'We collect only what we need. Your card is handled by PayFast. Your data rights are protected by POPIA.',
    emoji: '🔒',
  },
];

export default function AboutPage() {
  return (
    <article className="bg-off-white min-h-screen">
      {/* Hero */}
      <section className="bg-navy relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue/10 rounded-full blur-[100px]" />
        <div className="relative max-w-[1200px] mx-auto px-6 md:px-[6%] pt-32 pb-16 text-center">
          <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">About</span>
          <h1 className="font-display text-4xl md:text-6xl text-white tracking-wider leading-tight">
            BUILT FOR <span className="text-orange">SOUTH AFRICA</span>
          </h1>
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
            Many South Africans overpay their municipality every month. Most don&apos;t know.
            The ones who do can&apos;t face the queue. Billdog fixes that.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%]">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-12">
              <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">Our Mission</span>
              <h2 className="font-display text-navy tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]">
                MAKE MUNICIPALITIES ACCOUNTABLE
              </h2>
            </div>
            <div className="max-w-3xl mx-auto bg-white border border-light-grey rounded-2xl p-7 md:p-10 space-y-6">
              <p className="text-grey text-base md:text-lg leading-relaxed">
                South African municipalities issue <strong className="text-navy">millions of bills every month</strong>.
                Many contain errors — estimated readings, charges for unconnected services, duplicate entries, and tariff miscalculations.
              </p>
              <p className="text-grey text-base md:text-lg leading-relaxed">
                Section 102 of the Municipal Systems Act gives every property owner the <strong className="text-navy">legal right to dispute</strong> these errors.
                But the process is slow, confusing, and designed to discourage complaints.
              </p>
              <p className="text-grey text-base md:text-lg leading-relaxed">
                <strong className="text-navy">Billdog changes that.</strong> We use AI to scan your bill in under 2 minutes,
                identify every error, cite the exact legislation, and send a formal dispute letter to your municipality.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* AI Transparency */}
      <section className="bg-white py-16 md:py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%]">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">Our Technology</span>
              <h2 className="font-display text-navy tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]">
                AI-POWERED. LEGALLY-TEMPLATED.
              </h2>
              <p className="mt-4 text-grey text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                We believe AI should be disclosed as a feature, not hidden as a shortcut.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Bill Parsing', desc: 'We extract text from your bill using OCR for photos and PDF parsing for documents.' },
              { step: '02', title: 'Error Detection', desc: 'Our AI compares each charge against tariff schedules, legal limits, and common error patterns.' },
              { step: '03', title: 'Legal Letter', desc: 'We search SA legislation using RAG to cite the correct act and section for every disputed item.' },
            ].map(({ step, title, desc }) => (
              <ScrollReveal key={step}>
                <div className="bg-off-white border border-light-grey rounded-2xl p-7 h-full">
                  <span className="font-display text-3xl text-orange">{step}</span>
                  <h3 className="mt-3 font-display text-xl text-navy tracking-wide uppercase">{title}</h3>
                  <p className="mt-3 text-grey text-sm leading-relaxed">{desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%]">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">Our Values</span>
              <h2 className="font-display text-navy tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]">
                WHAT WE STAND FOR
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {VALUES.map(({ title, description, emoji }) => (
              <ScrollReveal key={title}>
                <div className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 h-full">
                  <div className="w-12 h-12 bg-orange/10 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">{emoji}</span>
                  </div>
                  <h3 className="font-display text-xl text-navy tracking-wide uppercase">{title}</h3>
                  <p className="mt-3 text-grey text-sm leading-relaxed">{description}</p>
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
              JOIN THE <span className="text-orange">FIGHT</span>
            </h2>
            <p className="mt-4 text-white/60 text-lg max-w-lg mx-auto">
              Your municipality doesn&apos;t get to overcharge you unchallenged.
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
