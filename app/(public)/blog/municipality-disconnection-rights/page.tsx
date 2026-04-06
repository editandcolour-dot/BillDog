import { Metadata } from 'next';
import Link from 'next/link';
import { BlogLayout } from '@/components/blog/BlogLayout';

export async function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'Can the Municipality Disconnect My Services? | Billdog',
  description: 'Know your rights. Learn exactly when it is illegal for a South African municipality to disconnect your water or electricity.',
  alternates: { canonical: 'https://www.billdog.co.za/blog/municipality-disconnection-rights' }
};

export default function Page() {
  return (
    <BlogLayout title="Municipality Disconnection Rights in South Africa" author="Billdog Research Team" date="April 2026">
      <div className="bg-success/10 border-l-4 border-success p-4 mb-8">
        <p className="m-0 text-navy font-bold">
          <strong className="text-success uppercase tracking-widest text-xs block mb-1">Direct Answer:</strong>
          A municipality cannot legally disconnect your electricity or water if you have a formally registered dispute citing Section 102 of the Municipal Systems Act for a specific disputed amount, and you continue to pay your average undisputed usage. Disconnecting services under an active valid dispute is unlawful.
        </p>
      </div>

      <div className="bg-off-white p-6 rounded-xl border border-light-grey mb-12">
        <h2 className="mt-0 tracking-wide font-display text-2xl">Table of Contents</h2>
        <ul className="m-0 p-0 list-none space-y-2 font-body text-sm">
          <li><a href="#law">1. What the Law Says</a></li>
          <li><a href="#protection">2. How to Stay Protected</a></li>
        </ul>
      </div>

      <h2 id="law">1. What the Law Says</h2>
      <p>Under Section 102 of the Municipal Systems Act, credit control measures like disconnection are suspended strictly over the disputed amount. Municipalities covering areas like <Link href="/disputes/ethekwini">eThekwini</Link> refer to this.</p>
      
      <h2 id="protection">2. How to Stay Protected</h2>
      <p>Do not stop paying entirely. Pay your average bill, log a formal Section 102 letter, and keep your reference number handy to repel disconnection contractors.</p>
    </BlogLayout>
  );
}
