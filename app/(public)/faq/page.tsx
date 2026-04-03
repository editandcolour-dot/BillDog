import type { Metadata } from 'next';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'FAQ | Billdog',
  description:
    'Everything you need to know about disputing your municipal bill with Billdog. Common questions about pricing, process, legality, and more.',
  openGraph: {
    title: 'FAQ | Billdog',
    description:
      'Answers to common questions about Billdog\'s municipal bill dispute service.',
    url: 'https://billdog.co.za/faq',
  },
};

const GENERAL_FAQ = [
  {
    question: 'What is Billdog?',
    answer:
      'Billdog is an AI-powered service that helps South African property owners dispute errors on their municipal bills. We scan your bill for overcharges, generate a legally compliant dispute letter citing Section 102 of the Municipal Systems Act, and send it directly to your municipality.',
  },
  {
    question: 'How does Billdog find errors in my bill?',
    answer:
      'Our AI analyses every line item on your bill — water, electricity, rates, refuse, sewerage — and compares them against tariff schedules, usage patterns, and legal limits. We identify overcharges, estimated readings used instead of actual meter readings, duplicate entries, and charges for services not rendered.',
  },
  {
    question: 'Which municipalities do you support?',
    answer:
      'We support all 8 South African metropolitan municipalities: City of Cape Town, City of Johannesburg, City of Tshwane, eThekwini, Ekurhuleni, Nelson Mandela Bay, Buffalo City, and Mangaung. We are expanding to district municipalities soon.',
  },
  {
    question: 'Do I need to be the property owner?',
    answer:
      'Yes. To dispute a municipal bill under Section 102, you must be the account holder or have authorisation from the account holder. Tenants should contact their landlord or managing agent.',
  },
];

const PRICING_FAQ = [
  {
    question: 'What does Billdog cost?',
    answer:
      'Nothing upfront. Billdog charges a 20% success fee — we only charge you if we successfully recover money. If we find no errors, or if the dispute is unsuccessful, you pay R0. Ever.',
  },
  {
    question: 'When do I get charged?',
    answer:
      'Only after your municipality corrects your bill and you confirm the resolution in your Billdog dashboard. We use PayFast to securely store your card — your payment details are never stored on our servers.',
  },
  {
    question: 'Can I see an example?',
    answer:
      'Sure. If your bill has R3,200 in errors and the municipality corrects them, Billdog\'s fee is R640 (20% of R3,200). You keep R2,560. If the municipality doesn\'t correct the errors, you pay R0.',
  },
  {
    question: 'Are there any hidden fees?',
    answer:
      'No. No subscription fees, no setup fees, no analysis fees, no cancellation fees. The 20% success fee is the only charge, and it only applies on confirmed recovery.',
  },
];

const LEGAL_FAQ = [
  {
    question: 'Is disputing my bill legal?',
    answer:
      'Absolutely. Section 102 of the Municipal Systems Act (No. 32 of 2000) gives every property owner the explicit legal right to dispute billing errors. Municipalities are legally required to investigate and respond within 30 days.',
  },
  {
    question: 'Does Billdog use AI to generate the letters?',
    answer:
      'Yes — and we\'re transparent about it. "AI-powered analysis, legally-templated letters" is our approach. Our AI generates the dispute letter using a specialised legal template, citing relevant South African legislation. The result is a formal, legally compliant dispute letter.',
  },
  {
    question: 'What happens if the municipality ignores my dispute?',
    answer:
      'If a municipality fails to respond within 30 days, you have the right to escalate. The next steps are: Municipal Ombudsman → NERSA (for electricity disputes) → Public Protector. Billdog tracks your case and advises on escalation.',
  },
  {
    question: 'Can I dispute old bills?',
    answer:
      'Under the Prescription Act (No. 68 of 1969), municipal billing disputes generally have a 3-year window. Our system automatically checks whether your bill period falls within the disputable window and warns you if it doesn\'t.',
  },
];

const PRIVACY_FAQ = [
  {
    question: 'What data do you collect?',
    answer:
      'We collect your name, email, municipal account number, and the bill you upload. Your bill text is processed by our AI for analysis. We never sell your data. Full details are in our Privacy Policy.',
  },
  {
    question: 'Is my payment information safe?',
    answer:
      'Your card details are handled entirely by PayFast, a PCI-DSS compliant South African payment gateway. Billdog never stores, sees, or has access to your card numbers. We only store a tokenised reference.',
  },
  {
    question: 'Can I delete my data?',
    answer:
      'Yes. Under POPIA (Protection of Personal Information Act), you have the right to request deletion of all your personal data. You can do this from your account settings or by emailing privacy@billdog.co.za.',
  },
];

export default function FaqPage() {
  return (
    <article className="bg-off-white min-h-screen">
      {/* Hero */}
      <section className="bg-navy relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue/10 rounded-full blur-[100px]" />

        <div className="relative max-w-[1200px] mx-auto px-6 md:px-[6%] pt-32 pb-16 text-center">
          <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
            FAQ
          </span>
          <h1 className="font-display text-4xl md:text-6xl text-white tracking-wider leading-tight">
            GOT <span className="text-orange">QUESTIONS</span>?
          </h1>
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
            Everything you need to know about fighting your municipal bill with Billdog.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%]">

          {/* General */}
          <ScrollReveal>
            <div className="mb-16">
              <div className="text-center mb-8">
                <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
                  General
                </span>
                <h2 className="font-display text-navy tracking-wide text-[clamp(2rem,3.5vw,3rem)]">
                  ABOUT BILLDOG
                </h2>
              </div>
              <FaqAccordion items={[...GENERAL_FAQ]} />
            </div>
          </ScrollReveal>

          {/* Pricing */}
          <ScrollReveal>
            <div className="mb-16">
              <div className="text-center mb-8">
                <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
                  Costs
                </span>
                <h2 className="font-display text-navy tracking-wide text-[clamp(2rem,3.5vw,3rem)]">
                  PRICING & FEES
                </h2>
              </div>
              <FaqAccordion items={[...PRICING_FAQ]} />
            </div>
          </ScrollReveal>

          {/* Legal */}
          <ScrollReveal>
            <div className="mb-16">
              <div className="text-center mb-8">
                <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
                  Legal
                </span>
                <h2 className="font-display text-navy tracking-wide text-[clamp(2rem,3.5vw,3rem)]">
                  LAW & DISPUTES
                </h2>
              </div>
              <FaqAccordion items={[...LEGAL_FAQ]} />
            </div>
          </ScrollReveal>

          {/* Privacy */}
          <ScrollReveal>
            <div className="mb-16">
              <div className="text-center mb-8">
                <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
                  Privacy
                </span>
                <h2 className="font-display text-navy tracking-wide text-[clamp(2rem,3.5vw,3rem)]">
                  DATA & SECURITY
                </h2>
              </div>
              <FaqAccordion items={[...PRIVACY_FAQ]} />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%] text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-5xl text-white tracking-wide">
              STILL HAVE <span className="text-orange">QUESTIONS</span>?
            </h2>
            <p className="mt-4 text-white/60 text-lg max-w-lg mx-auto">
              Reach out to our team — we&apos;re here to help.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="inline-block min-h-[44px] px-8 py-4 bg-orange text-white font-bold rounded-md hover:bg-orange-light hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)] active:translate-y-0 transition-all duration-200 text-center text-lg"
              >
                Contact Us
              </a>
              <a
                href="/signup"
                className="inline-block min-h-[44px] px-8 py-4 bg-transparent text-white font-bold border-2 border-white/30 rounded-md hover:border-white hover:bg-white/[0.08] hover:-translate-y-0.5 transition-all duration-200 text-center text-lg"
              >
                Dispute My Bill
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </article>
  );
}
