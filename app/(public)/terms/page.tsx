import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Billdog',
  description: 'Terms and conditions for using the Billdog municipal billing dispute platform.',
  openGraph: {
    title: 'Terms of Service | Billdog',
    description: 'Terms and conditions for using the Billdog municipal billing dispute platform.',
    url: 'https://billdog.co.za/terms',
  },
};

/** Terms of Service page. */
export default function TermsOfServicePage() {
  return (
    <article className="bg-off-white min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 md:px-[6%] py-16 md:py-24">

        {/* Header */}
        <span className="block mb-3 text-orange text-xs font-bold uppercase tracking-[2px]">
          Legal
        </span>
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] text-navy tracking-wide uppercase">
          Terms of Service
        </h1>
        <p className="mt-3 text-grey text-sm font-medium">
          Version 1.0 &mdash; 30 March 2026 &nbsp;|&nbsp; Effective immediately
        </p>

        <div className="mt-10 space-y-12 max-w-3xl text-grey leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              1. Service Description
            </h2>
            <p>
              Billdog is an AI-powered platform that helps South African property owners
              identify errors in their municipal bills and dispute them. Our service includes:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>AI analysis of your municipal bill to identify potential billing errors</li>
              <li>Generation of a legally compliant dispute letter citing relevant South African legislation</li>
              <li>Delivery of the dispute letter to your municipality via email</li>
              <li>Tracking the progress of your dispute</li>
            </ul>
            <p className="mt-4">
              Billdog is <strong>not a law firm</strong> and does not provide legal advice.
              Our dispute letters are generated using AI analysis and cite applicable
              legislation, including Section 102 of the Municipal Systems Act (No. 32 of 2000).
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              2. Success Fee Model
            </h2>
            <p>
              Billdog operates on a <strong>success-fee-only</strong> basis:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li><strong>No upfront charges.</strong> You pay nothing to upload, analyse, or send a dispute letter.</li>
              <li><strong>20% success fee.</strong> If your dispute results in a billing correction or refund, we charge 20% of the amount recovered.</li>
              <li><strong>You confirm the outcome.</strong> We only charge after you confirm that the municipality has corrected the billing error or issued a refund.</li>
              <li><strong>Minimum fee:</strong> R50. If the success fee calculates to less than R50, we waive it entirely.</li>
            </ul>
            <p className="mt-4">
              Payment is processed via PayFast using your card on file. Your card details are
              tokenised by PayFast &mdash; Billdog never sees or stores your card number.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              3. Your Obligations
            </h2>
            <p>By using Billdog, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Provide <strong>accurate information</strong> including your name, municipality, and account number</li>
              <li>Upload <strong>genuine municipal bills</strong> &mdash; not fabricated or altered documents</li>
              <li>Respond to communications from your municipality regarding your dispute</li>
              <li>Report the outcome of your dispute honestly so that success fees are calculated correctly</li>
              <li>Not use the platform for frivolous, vexatious, or fraudulent disputes</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              4. AI Disclosure
            </h2>
            <p>
              Billdog uses artificial intelligence to analyse your bill and generate dispute letters.
              Specifically:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>We use <strong>Claude by Anthropic</strong> for bill analysis and letter generation</li>
              <li>Your bill text, account number, and municipality name are sent to Anthropic&apos;s servers for processing</li>
              <li>AI analysis identifies potential errors &mdash; it is not infallible and may not catch every issue</li>
              <li>Generated letters are based on AI analysis and relevant legislation</li>
            </ul>
            <p className="mt-4">
              We are transparent about our use of AI because we believe it builds trust.
              AI-powered analysis is a feature of our service, not something we hide.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              5. Limitation of Liability
            </h2>
            <p>
              Billdog provides its services on an &ldquo;as is&rdquo; basis. We make no guarantees regarding:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>The accuracy of AI-generated bill analysis</li>
              <li>The outcome of any dispute with your municipality</li>
              <li>The amount of money you may recover</li>
              <li>The timeframe in which your municipality will respond</li>
            </ul>
            <p className="mt-4">
              Our total liability to you is limited to the amount of success fees you have
              paid to Billdog. We are not liable for any indirect, consequential, or punitive
              damages arising from your use of the platform.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              6. Intellectual Property
            </h2>
            <p>
              <strong>Your content:</strong> You retain ownership of all documents you upload,
              including your municipal bills and any personal information.
            </p>
            <p className="mt-3">
              <strong>Our content:</strong> Billdog&apos;s dispute letter templates, AI analysis
              methodology, branding, and platform code are our intellectual property and
              may not be copied, modified, or distributed without permission.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              7. Account Termination
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>By you:</strong> You can delete your account at any time from your Settings page. Your data will be permanently deleted after a 30-day notice period.</li>
              <li><strong>By us:</strong> We may suspend or terminate accounts that are used for fraud, abuse, or violation of these terms.</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              8. Payment Terms
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Payment is processed by <strong>PayFast</strong>, a South African payment gateway</li>
              <li>You add a card on file before sending your first dispute letter</li>
              <li>Your card is only charged when you confirm a successful dispute outcome</li>
              <li>There is no recurring billing, no subscription, and no hidden fees</li>
              <li>All amounts are in South African Rand (ZAR)</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              9. Privacy
            </h2>
            <p>
              Your use of Billdog is also governed by our{' '}
              <a href="/privacy" className="text-blue underline">Privacy Policy</a>, which
              explains how we collect, use, and protect your personal information in
              compliance with the Protection of Personal Information Act (POPIA).
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              10. Age Restriction
            </h2>
            <p>
              You must be at least 18 years old, or have the legal capacity to enter into
              contracts under South African law, to use Billdog.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              11. Governing Law
            </h2>
            <p>
              These terms are governed by the laws of the <strong>Republic of South Africa</strong>.
              Any dispute arising from these terms or your use of Billdog will be subject to the
              exclusive jurisdiction of the South African courts.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              12. Changes to These Terms
            </h2>
            <p>
              We may update these terms from time to time. For material changes, we will notify
              you via email before the changes take effect. Continued use of Billdog after
              changes constitutes acceptance of the updated terms.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              13. Contact
            </h2>
            <p>
              For questions about these terms, contact us at{' '}
              <a href="mailto:privacy@billdog.co.za" className="text-blue underline">
                privacy@billdog.co.za
              </a>.
            </p>
          </section>

          {/* Footer version */}
          <p className="pt-8 border-t border-light-grey text-sm text-grey/60">
            Terms of Service v1.0 &mdash; 30 March 2026
          </p>
        </div>
      </div>
    </article>
  );
}
