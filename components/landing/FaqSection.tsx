import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

/** FAQ items — 6 questions. */
const FAQ_ITEMS = [
  {
    question: 'How does Billdog find errors in my municipal bill?',
    answer:
      'We use AI-powered analysis to scan every line item on your bill — water, electricity, rates, refuse, sewerage — and compare them against your usage history, tariff schedules, and legal limits. Our system identifies overcharges, estimated readings, duplicate entries, and charges for services not rendered.',
  },
  {
    question: 'What does it cost?',
    answer:
      'Nothing upfront. Billdog operates on a 20% success fee — we only charge if we successfully recover money for you. If we don\'t find errors or the dispute is unsuccessful, you pay nothing. Ever.',
  },
  {
    question: 'Is this legal?',
    answer:
      'Absolutely. Section 102 of the Municipal Systems Act (No. 32 of 2000) gives every property owner the legal right to dispute billing errors. We generate formal dispute letters citing the relevant legislation and send them directly to your municipality\'s complaints department.',
  },
  {
    question: 'How long does it take?',
    answer:
      'Bill analysis takes under 2 minutes. Once your dispute letter is sent, municipalities are generally expected to respond within 30 days. Most corrections happen within 2-4 weeks. We track your case and notify you at every step.',
  },
  {
    question: 'What types of bills can I dispute?',
    answer:
      'Any South African municipal bill — water, electricity, rates, refuse removal, sewerage, and other municipal charges. We support all 8 metropolitan municipalities and are expanding to district municipalities.',
  },
  {
    question: 'What if my bill is correct?',
    answer:
      'If our analysis finds no errors, we\'ll tell you — and you won\'t be charged anything. We\'d rather be honest than generate unnecessary disputes. Your trust matters more than a fee.',
  },
] as const;

/**
 * FAQ section with accessible accordion.
 */
export function FaqSection() {
  return (
    <section
      id="faq"
      className="bg-white py-16 md:py-20 lg:py-24"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[6%]">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
              FAQ
            </span>
            <h2
              id="faq-heading"
              className="font-display text-navy tracking-wide text-[clamp(2.2rem,4vw,3.5rem)]"
            >
              COMMON QUESTIONS
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <FaqAccordion items={[...FAQ_ITEMS]} />
        </ScrollReveal>
      </div>
    </section>
  );
}
