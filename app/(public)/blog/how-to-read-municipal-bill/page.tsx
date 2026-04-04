import { Metadata } from 'next';
import Link from 'next/link';
import { BlogLayout } from '@/components/blog/BlogLayout';

export async function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'How to Read Your Municipal Bill | Billdog',
  description: 'A step-by-step guide to decoding complex South African municipality bills and identifying overcharges.',
  alternates: { canonical: 'https://billdog.co.za/blog/how-to-read-municipal-bill' }
};

export default function Page() {
  return (
    <BlogLayout title="How to Read Your South African Municipal Bill" author="Billdog Research Team" date="April 2026">
      <div className="bg-success/10 border-l-4 border-success p-4 mb-8">
        <p className="m-0 text-navy font-bold">
          <strong className="text-success uppercase tracking-widest text-xs block mb-1">Direct Answer:</strong>
          To read your municipal bill, locate the "Billing Period" to ensure you aren't being double-charged, check the "Meter Reading" section to see if readings are marked with an "E" for Estimated rather than Actual, and verify your "Property Valuation" to ensure rates are calculated correctly.
        </p>
      </div>

      <div className="bg-off-white p-6 rounded-xl border border-light-grey mb-12">
        <h2 className="mt-0 tracking-wide font-display text-2xl">Table of Contents</h2>
        <ul className="m-0 p-0 list-none space-y-2 font-body text-sm">
          <li><a href="#estimates">1. Identifying Estimated Readings</a></li>
          <li><a href="#disputing">2. Launching a Dispute</a></li>
        </ul>
      </div>

      <h2 id="estimates">1. Identifying Estimated Readings</h2>
      <p>Look carefully at your line items. If your water usage has a massive spike, municipalities like <Link href="/disputes/johannesburg">Johannesburg</Link> often base this on broken meter estimates. An "E" signifies an estimate.</p>
      
      <h2 id="disputing">2. Launching a Dispute</h2>
      <p>Once you spot the error, you must utilize Section 102 of the Municipal Systems Act to freeze the debt collection on that exact line item.</p>
    </BlogLayout>
  );
}
