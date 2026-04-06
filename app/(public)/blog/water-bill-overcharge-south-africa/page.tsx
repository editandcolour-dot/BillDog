import { Metadata } from 'next';
import Link from 'next/link';
import { BlogLayout } from '@/components/blog/BlogLayout';

export async function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'Water Bill Overcharges in South Africa | Billdog',
  description: 'How to dispute an impossibly high water bill caused by leaks, meter errors, or municipal failures.',
  alternates: { canonical: 'https://www.billdog.co.za/blog/water-bill-overcharge-south-africa' }
};

export default function Page() {
  return (
    <BlogLayout title="Disputing a Massive Water Bill Overcharge" author="Billdog Research Team" date="April 2026">
      <div className="bg-success/10 border-l-4 border-success p-4 mb-8">
        <p className="m-0 text-navy font-bold">
          <strong className="text-success uppercase tracking-widest text-xs block mb-1">Direct Answer:</strong>
          To dispute a massive water bill overcharge, first hire a registered plumber to certify your property has no underground leaks, then submit this plumbing certificate alongside a formal Section 102 dispute to your municipality, forcing them to investigate their meter infrastructure for faults.
        </p>
      </div>

      <div className="bg-off-white p-6 rounded-xl border border-light-grey mb-12">
        <h2 className="mt-0 tracking-wide font-display text-2xl">Table of Contents</h2>
        <ul className="m-0 p-0 list-none space-y-2 font-body text-sm">
          <li><a href="#leaks">1. Ruling Out Leaks</a></li>
          <li><a href="#disputing">2. Disputing the Meter</a></li>
        </ul>
      </div>

      <h2 id="leaks">1. Ruling Out Leaks</h2>
      <p>The first defense by <Link href="/disputes/nelson-mandela-bay">Nelson Mandela Bay</Link> and others will always be that you have a leak. Prove them wrong with a compliance certificate.</p>
      
      <h2 id="disputing">2. Disputing the Meter</h2>
      <p>Once leaks are ruled out, invoke Section 102. The municipality must then prove the meter is functionally sound or reverse the charges.</p>
    </BlogLayout>
  );
}
