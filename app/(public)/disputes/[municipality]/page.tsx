import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { municipalitiesSeoData } from '@/lib/data/seo-municipalities';

interface PageProps {
  params: Promise<{ municipality: string }>;
}

export async function generateStaticParams() {
  return Object.keys(municipalitiesSeoData).map((slug) => ({
    municipality: slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { municipality } = await params;
  const data = municipalitiesSeoData[municipality];
  if (!data) return {};

  return {
    title: `${data.name} Billing Disputes | Billdog`,
    description: `Learn how to dispute your ${data.name} municipal bill. We generate AI powered legal letters citing Section 102. 20% success fee only.`,
    openGraph: {
      title: `${data.name} Billing Disputes | Billdog`,
      description: `Dispute ${data.name} bills without a lawyer. Section 102 compliant.`,
      url: `https://www.billdog.co.za/disputes/${data.slug}`,
    },
    alternates: {
      canonical: `https://www.billdog.co.za/disputes/${data.slug}`,
    }
  };
}

export default async function MunicipalitySEOPage({ params }: PageProps) {
  const { municipality } = await params;
  const data = municipalitiesSeoData[municipality];

  if (!data) notFound();

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  const jsonLdLocalBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: 'Billdog',
    url: `https://www.billdog.co.za/disputes/${data.slug}`,
    description: data.heroSubheadline,
    areaServed: {
      '@type': 'City',
      name: data.name
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdLocalBusiness) }}
      />

      <div className="bg-navy overflow-hidden">
        {/* HERO */}
        <section className="relative min-h-[80vh] flex items-center justify-center pt-32 pb-20 px-6">
          <div className="max-w-[1200px] mx-auto w-full relative z-10 text-center sm:text-left">
            <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">
              AI-Powered Billing Disputes
            </span>
            <h1 className="font-display text-4xl md:text-6xl text-white tracking-wider leading-tight max-w-4xl">
              {data.heroHeadline}
            </h1>
            <p className="mt-6 text-white/70 text-lg leading-relaxed max-w-2xl font-body">
              {data.heroSubheadline}
            </p>
            <div className="mt-10 flex gap-4 justify-center sm:justify-start">
              <Link href="/signup" className="min-h-[44px] px-8 py-3 bg-orange text-white font-body font-bold rounded-md hover:bg-orange-light transition-all focus:ring-2 focus:ring-orange focus:ring-offset-2 flex items-center justify-center">
                Check My {data.name} Bill →
              </Link>
            </div>
          </div>
        </section>

        {/* COMMON ERRORS */}
        <section className="py-20 md:py-28 bg-white px-6">
          <div className="max-w-[1200px] mx-auto">
            <span className="block mb-3 text-orange text-xs font-bold uppercase tracking-[2px]">
              Why Are You Overcharged?
            </span>
            <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] text-navy uppercase tracking-wide">
              Common {data.name} Errors
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {data.commonErrors.map((err, i) => (
                <div key={i} className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-orange/10 text-orange rounded-full flex items-center justify-center mb-4 font-bold font-display text-xl">{i+1}</div>
                  <h3 className="font-display text-xl text-navy tracking-wide mb-3">Billing Error</h3>
                  <p className="text-grey font-body text-sm leading-relaxed">{err}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-20 md:py-28 bg-off-white px-6 border-t border-light-grey">
          <div className="max-w-[1200px] mx-auto">
             <span className="block mb-3 text-orange text-xs font-bold uppercase tracking-[2px]">
              How It Works
            </span>
            <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] text-navy uppercase tracking-wide">
              Dispute in 5 Steps
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mt-12">
               {['Upload Bill', 'AI Analysis', 'Generate Letter', 'Review & Send', 'Resolution'].map((step, idx) => (
                  <div key={idx} className="text-center relative">
                    <div className="w-14 h-14 mx-auto bg-navy text-white font-display text-2xl flex items-center justify-center rounded-full border-2 border-orange mb-4">
                      {idx + 1}
                    </div>
                    <h3 className="font-body font-bold text-navy text-sm md:text-base">{step}</h3>
                  </div>
               ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 md:py-28 bg-white px-6 border-t border-light-grey">
          <div className="max-w-[800px] mx-auto">
             <span className="block mb-3 text-orange text-xs font-bold uppercase tracking-[2px]">
              {data.name} Guide
            </span>
            <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] text-navy uppercase tracking-wide">
              Frequently Asked Questions
            </h2>
            <div className="mt-12 space-y-6">
              {data.faq.map((f, i) => (
                 <div key={i} className="border border-light-grey p-6 rounded-2xl text-left bg-off-white/50">
                    <h3 className="font-body font-bold text-navy text-lg mb-3">{f.question}</h3>
                    <div className="inline-block bg-success/10 px-2 py-1 rounded text-xs border border-success/20 text-success mb-2 tracking-wide font-bold uppercase">Search Answer Preview</div>
                    <p className="font-body text-grey text-base leading-relaxed">{f.answer}</p>
                 </div>
              ))}
            </div>
          </div>
        </section>

        {/* OMBUDSMAN & REAL CASES */}
        <section className="py-16 bg-[#0B1F3A] text-white px-6">
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                   <h3 className="font-display text-3xl tracking-wide mb-4">Escalation Contact</h3>
                   <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <p className="font-body text-white/70 mb-2">If your dispute is ignored by {data.name}, you can try escalating here:</p>
                      <p className="font-body font-bold text-orange text-lg break-all">{data.ombudsman}</p>
                      <p className="text-xs text-white/40 mt-4">* Escalation contact — verify on municipality website before use.</p>
                   </div>
                </div>
                <div>
                    <h3 className="font-display text-3xl tracking-wide mb-4">In The News</h3>
                    <div className="space-y-4">
                        {data.newsCase.map((nc, idx) => (
                            <a key={idx} href={nc.url} className="block group bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/30 transition-all">
                                <p className="font-display text-xl group-hover:text-orange transition-colors">{nc.title}</p>
                                <span className="font-body text-xs text-white/50 uppercase tracking-widest">{nc.source} • {nc.date}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </section>
        
        {/* CTA */}
        <section className="py-20 bg-orange text-white text-center px-6">
           <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide">Ready To Check Your Bill?</h2>
           <p className="max-w-xl mx-auto mt-4 font-body font-bold text-white/90">Sign up now and upload your {data.name} bill.</p>
           <Link href="/signup" className="mt-8 inline-flex min-h-[44px] px-8 py-3 bg-navy text-white font-body font-bold rounded-md hover:bg-[#1A3052] transition-all">
              Start Your Dispute →
           </Link>
        </section>
      </div>
    </>
  );
}
