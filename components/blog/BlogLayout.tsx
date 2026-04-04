import Link from 'next/link';

interface BlogLayoutProps {
  title: string;
  author: string;
  date: string;
  jsonLdFaq?: any;
  children: React.ReactNode;
}

export function BlogLayout({ title, author, date, jsonLdFaq, children }: BlogLayoutProps) {
  return (
    <>
      {jsonLdFaq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
      )}
      <div className="bg-white text-navy font-body selection:bg-orange selection:text-white pb-32">
        <header className="bg-navy pt-32 pb-16 px-6 relative overflow-hidden">
             <div className="max-w-[800px] mx-auto text-center relative z-10">
                 <span className="text-orange font-bold uppercase tracking-widest text-xs mb-4 block">Billdog Legislation Guide</span>
                 <h1 className="font-display text-4xl md:text-5xl text-white tracking-wide leading-tight mb-6">{title}</h1>
                 <p className="text-white/60 text-sm uppercase tracking-widest font-body">By {author} • {date}</p>
             </div>
        </header>

        <main className="max-w-[800px] mx-auto px-6 mt-12 bg-white prose prose-lg prose-headings:font-display prose-headings:text-navy prose-h2:text-3xl prose-h3:text-2xl prose-a:text-orange prose-a:no-underline hover:prose-a:underline prose-p:text-grey prose-p:leading-relaxed">
            {children}
        </main>

        <section className="max-w-[800px] mx-auto px-6 mt-16 pt-16 border-t border-light-grey">
           <div className="bg-off-white rounded-2xl p-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="font-display text-3xl text-navy tracking-wide mb-2">Ready to Dispute Your Bill?</h3>
                    <p className="font-body text-grey text-base max-w-md">Our AI generates Section 102 compliant letters that municipalities cannot ignore. We only take a 20% success fee if we win.</p>
                </div>
                <Link href="/signup" className="shrink-0 min-h-[44px] px-8 py-3 bg-orange text-white font-body font-bold rounded-md hover:bg-orange-light transition-all flex items-center justify-center whitespace-nowrap">
                    Check My Bill →
                </Link>
           </div>
        </section>
      </div>
    </>
  );
}
