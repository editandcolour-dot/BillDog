import { Metadata } from 'next';
import Link from 'next/link';
import { BlogLayout } from '@/components/blog/BlogLayout';

export async function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'Section 102 Municipal Systems Act Explained | Billdog',
  description: 'Understand how Section 102 of the Municipal Systems Act protects South African ratepayers during billing disputes.',
  alternates: { canonical: 'https://billdog.co.za/blog/section-102-municipal-systems-act' }
};

export default function Page() {
  return (
    <BlogLayout title="What is Section 102 of the Municipal Systems Act?" author="Billdog Research Team" date="April 2026">
      <div className="bg-success/10 border-l-4 border-success p-4 mb-8">
        <p className="m-0 text-navy font-bold">
          <strong className="text-success uppercase tracking-widest text-xs block mb-1">Direct Answer:</strong>
          Section 102 of the Municipal Systems Act (Act 32 of 2000) is South African legislation that allows a municipality to consolidate accounts, but strictly prohibits them from implementing debt collection or disconnecting services for a specific amount if there is a formal dispute registered by the ratepayer for that exact amount.
        </p>
      </div>

      <div className="bg-off-white p-6 rounded-xl border border-light-grey mb-12">
        <h2 className="mt-0 tracking-wide font-display text-2xl">Table of Contents</h2>
        <ul className="m-0 p-0 list-none space-y-2 font-body text-sm">
          <li><a href="#definition">1. The Definition of Section 102</a></li>
          <li><a href="#protection">2. How it Protects You</a></li>
        </ul>
      </div>

      <h2 id="definition">1. The Definition of Section 102</h2>
      <p>Section 102 is the cornerstone of municipal law that ensures you cannot be bullied into paying an estimated or incorrect bill under threat of having your water or electricity shut off. By quoting this act, you invoke statutory protection.</p>
      
      <h2 id="protection">2. How it Protects You</h2>
      <p>If eThekwini or <Link href="/disputes/cape-town">City of Cape Town</Link> makes a billing error, you must explicitly write a letter citing Section 102 and dispute the specific overcharged amount while paying the undisputed average.</p>
    </BlogLayout>
  );
}
