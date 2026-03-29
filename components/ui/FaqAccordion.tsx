'use client';

import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

/**
 * Accessible FAQ accordion with aria-expanded/aria-controls.
 * Supports keyboard navigation.
 */
export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggleItem(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const triggerId = `faq-trigger-${index}`;
        const panelId = `faq-panel-${index}`;

        return (
          <div
            key={triggerId}
            className="bg-white border border-light-grey rounded-2xl overflow-hidden transition-all duration-200"
          >
            <button
              id={triggerId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggleItem(index)}
              className="w-full min-h-[44px] flex items-center justify-between px-6 py-5 text-left text-navy font-bold text-base md:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-inset"
            >
              <span>{item.question}</span>
              <svg
                className={`w-5 h-5 text-orange shrink-0 ml-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="px-6 pb-5"
            >
              <p className="text-grey text-base leading-relaxed">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
