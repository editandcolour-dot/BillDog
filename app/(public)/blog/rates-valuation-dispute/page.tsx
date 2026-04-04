import { Metadata } from 'next';
import Link from 'next/link';
import { BlogLayout } from '@/components/blog/BlogLayout';

export async function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'Property Rates Valuation Disputes | Billdog',
  description: 'Step-by-step guide on how to object to your municipal property valuation and lower your monthly rates.',
  alternates: { canonical: 'https://billdog.co.za/blog/rates-valuation-dispute' }
};

export default function Page() {
  return (
    <BlogLayout title="How to Dispute Municipal Property Rates Valuation" author="Billdog Research Team" date="April 2026">
      <div className="bg-success/10 border-l-4 border-success p-4 mb-8">
        <p className="m-0 text-navy font-bold">
          <strong className="text-success uppercase tracking-widest text-xs block mb-1">Direct Answer:</strong>
          To dispute an incorrect municipal property rates valuation, you must lodge a formal objection during the municipality's designated General Valuation Roll inspection period, supplying private valuation reports or comparative market analyses to prove the inflated municipal assessment is incorrect.
        </p>
      </div>

      <div className="bg-off-white p-6 rounded-xl border border-light-grey mb-12">
        <h2 className="mt-0 tracking-wide font-display text-2xl">Table of Contents</h2>
        <ul className="m-0 p-0 list-none space-y-2 font-body text-sm">
          <li><a href="#roll">1. The Valuation Roll</a></li>
          <li><a href="#objection">2. Making an Objection</a></li>
        </ul>
      </div>

      <h2 id="roll">1. The Valuation Roll</h2>
      <p>Municipalities like <Link href="/disputes/buffalo-city">Buffalo City</Link> release valuation rolls periodically. Your rates are tied to this base value.</p>
      
      <h2 id="objection">2. Making an Objection</h2>
      <p>You cannot use a standard Section 102 billing dispute for property valuations outside of the objection window unless there was a gross administrative misclassification (e.g., residential billed as commercial).</p>
    </BlogLayout>
  );
}
