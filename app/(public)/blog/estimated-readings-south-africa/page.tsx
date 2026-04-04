import { Metadata } from 'next';
import Link from 'next/link';
import { BlogLayout } from '@/components/blog/BlogLayout';

export async function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'Disputing Estimated Readings in South Africa | Billdog',
  description: 'How to legally stop municipalities from charging you based on consecutive estimated meter readings.',
  alternates: { canonical: 'https://billdog.co.za/blog/estimated-readings-south-africa' }
};

export default function Page() {
  return (
    <BlogLayout title="How to Fight Consecutive Estimated Readings" author="Billdog Research Team" date="April 2026">
      <div className="bg-success/10 border-l-4 border-success p-4 mb-8">
        <p className="m-0 text-navy font-bold">
          <strong className="text-success uppercase tracking-widest text-xs block mb-1">Direct Answer:</strong>
          To fight consecutive estimated meter readings in South Africa, you must formally dispute the estimated charges under Section 102 of the Municipal Systems Act while simultaneously providing time-stamped photographic evidence of your actual meter readings to the municipality to force a billing correction.
        </p>
      </div>

      <div className="bg-off-white p-6 rounded-xl border border-light-grey mb-12">
        <h2 className="mt-0 tracking-wide font-display text-2xl">Table of Contents</h2>
        <ul className="m-0 p-0 list-none space-y-2 font-body text-sm">
          <li><a href="#problem">1. The Problem with Estimates</a></li>
          <li><a href="#solution">2. Forcing an Actual Reading</a></li>
        </ul>
      </div>

      <h2 id="problem">1. The Problem with Estimates</h2>
      <p>Municipalities like <Link href="/disputes/ekurhuleni">Ekurhuleni</Link> often lack the staffing to physically read meters monthly. They rely on multi-month estimates that eventually lead to massive catch-up bills.</p>
      
      <h2 id="solution">2. Forcing an Actual Reading</h2>
      <p>Start paying your average historical usage, submit a Section 102 dispute, and upload photo proof of your meter. This triggers an internal review freezing further inflated estimations.</p>
    </BlogLayout>
  );
}
