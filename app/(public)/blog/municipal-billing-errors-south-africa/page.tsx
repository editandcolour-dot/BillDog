import { Metadata } from 'next';
import Link from 'next/link';
import { BlogLayout } from '@/components/blog/BlogLayout';

export async function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'Common Municipal Billing Errors in SA | Billdog',
  description: 'Discover the most frequent municipal billing errors in South Africa and how to challenge them legally.',
  alternates: { canonical: 'https://billdog.co.za/blog/municipal-billing-errors-south-africa' }
};

export default function Page() {
  return (
    <BlogLayout title="7 Most Common Municipal Billing Errors in South Africa" author="Billdog Research Team" date="April 2026">
      <div className="bg-success/10 border-l-4 border-success p-4 mb-8">
        <p className="m-0 text-navy font-bold">
          <strong className="text-success uppercase tracking-widest text-xs block mb-1">Direct Answer:</strong>
          The most common municipal billing errors in South Africa include prolonged estimated meter readings, broken water meters registering phantom flow, incorrect property zoning valuations, double billing cycles, and unallocated electronic payments causing false arrears.
        </p>
      </div>

      <div className="bg-off-white p-6 rounded-xl border border-light-grey mb-12">
        <h2 className="mt-0 tracking-wide font-display text-2xl">Table of Contents</h2>
        <ul className="m-0 p-0 list-none space-y-2 font-body text-sm">
          <li><a href="#errors">1. Top Errors</a></li>
          <li><a href="#action">2. Corrective Action</a></li>
        </ul>
      </div>

      <h2 id="errors">1. Top Errors</h2>
      <p>Residents in <Link href="/disputes/tshwane">Tshwane</Link> frequently report massive hikes due to incorrect zoning, whereas coastal cities struggle with basic water estimates.</p>
      
      <h2 id="action">2. Corrective Action</h2>
      <p>Under Section 102 of the Municipal Systems Act, identifying these specific errors is step one; step two is ringfencing the rand value and submitting a formal dispute.</p>
    </BlogLayout>
  );
}
