import { Metadata } from 'next';
import Link from 'next/link';
import { BlogLayout } from '@/components/blog/BlogLayout';

export async function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'Municipal Complaint Ignored? Escalate It | Billdog',
  description: 'What to do when your South African municipality ignores your formal billing dispute.',
  alternates: { canonical: 'https://billdog.co.za/blog/municipality-complaint-not-resolved' }
};

export default function Page() {
  return (
    <BlogLayout title="What To Do When The Municipality Ignores You" author="Billdog Research Team" date="April 2026">
      <div className="bg-success/10 border-l-4 border-success p-4 mb-8">
        <p className="m-0 text-navy font-bold">
          <strong className="text-success uppercase tracking-widest text-xs block mb-1">Direct Answer:</strong>
          If a South African municipality ignores your Section 102 billing dispute for over 30 days, your next legal step is to escalate the complaint in writing to the Municipal Ombudsman, and if still unresolved, formally escalate to the Public Protector of South Africa.
        </p>
      </div>

      <div className="bg-off-white p-6 rounded-xl border border-light-grey mb-12">
        <h2 className="mt-0 tracking-wide font-display text-2xl">Table of Contents</h2>
        <ul className="m-0 p-0 list-none space-y-2 font-body text-sm">
          <li><a href="#ombudsman">1. The Ombudsman</a></li>
          <li><a href="#public-protector">2. Public Protector</a></li>
        </ul>
      </div>

      <h2 id="ombudsman">1. The Ombudsman</h2>
      <p>If you live in <Link href="/disputes/cape-town">Cape Town</Link> or similar metros, the Ombudsman acts as an internal regulator demanding answers from the revenue department on your behalf.</p>
      
      <h2 id="public-protector">2. Public Protector</h2>
      <p>As a final resort, the Public Protector has the constitutional mandate to investigate severe maladministration in all spheres of government, including municipal billing.</p>
    </BlogLayout>
  );
}
