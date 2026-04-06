import {
  CtaSection,
  FaqSection,
  HeroSection,
  HowItWorksSection,
  RealCasesSection,
  StatsSection,
  TrustBar,
} from '@/components/landing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billdog — Fight Your Municipal Bill',
  description:
    'AI-powered municipal billing dispute service for South African property owners. Upload your bill and find out in under 2 minutes if you\'re being overcharged.',
  openGraph: {
    title: 'Billdog — Fight Your Municipal Bill',
    description:
      'Your municipality got it wrong. We\'ll make it right. No lawyers. No queues. No nonsense.',
    url: 'https://billdog.co.za',
    images: ['/og-image.png'],
  },
};

/**
 * Landing page — the first thing users see (Step 1 of user flow).
 * Section order: Hero → Trust → Stats → How It Works → Real Cases →
 * FAQ → Final CTA
 */
export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Billdog',
    url: 'https://billdog.co.za',
    logo: 'https://billdog.co.za/logo.svg',
    description: 'AI-powered municipal billing dispute service for South African property owners.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <TrustBar />
      <StatsSection />
      <HowItWorksSection />
      <RealCasesSection />

      <FaqSection />
      <CtaSection />
    </>
  );
}
