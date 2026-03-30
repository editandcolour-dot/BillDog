import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Billdog',
  description: 'How Billdog collects, uses, and protects your personal information under POPIA.',
  openGraph: {
    title: 'Privacy Policy | Billdog',
    description: 'How Billdog collects, uses, and protects your personal information under POPIA.',
    url: 'https://billdog.co.za/privacy',
  },
};

/** Privacy Policy page — POPIA compliant. */
export default function PrivacyPolicyPage() {
  return (
    <article className="bg-off-white min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 md:px-[6%] py-16 md:py-24">

        {/* Header */}
        <span className="block mb-3 text-orange text-xs font-bold uppercase tracking-[2px]">
          Legal
        </span>
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] text-navy tracking-wide uppercase">
          Privacy Policy
        </h1>
        <p className="mt-3 text-grey text-sm font-medium">
          Version 1.0 &mdash; 30 March 2026 &nbsp;|&nbsp; Effective immediately
        </p>

        <div className="mt-10 space-y-12 max-w-3xl text-grey leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              1. Who We Are
            </h2>
            <p>
              Billdog is an AI-powered municipal billing dispute platform based in Cape Town,
              Western Cape, South Africa. We help South African property owners identify
              billing errors and dispute them with their municipality.
            </p>
            <p className="mt-3">
              <strong>Responsible Party:</strong> Billdog (Pty Ltd registration pending)
              <br />
              <strong>Address:</strong> Cape Town, Western Cape, South Africa
              <br />
              <strong>Information Officer:</strong> Jason Thwaits &mdash;{' '}
              <a href="mailto:privacy@billdog.co.za" className="text-blue underline">
                privacy@billdog.co.za
              </a>
            </p>
            <p className="mt-3 text-sm italic">
              Billdog is in the process of registering its Information Officer
              with the Information Regulator.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              2. What Information We Collect
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-light-grey rounded-lg">
                <thead className="bg-navy text-white text-left">
                  <tr>
                    <th className="px-4 py-3 font-bold">Data</th>
                    <th className="px-4 py-3 font-bold">Purpose</th>
                    <th className="px-4 py-3 font-bold">Required?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-grey">
                  <tr><td className="px-4 py-3">Full name</td><td className="px-4 py-3">Dispute letter signature</td><td className="px-4 py-3">Yes</td></tr>
                  <tr><td className="px-4 py-3">Email address</td><td className="px-4 py-3">Account management &amp; notifications</td><td className="px-4 py-3">Yes</td></tr>
                  <tr><td className="px-4 py-3">Phone number</td><td className="px-4 py-3">Optional support contact</td><td className="px-4 py-3">No</td></tr>
                  <tr><td className="px-4 py-3">Property address</td><td className="px-4 py-3">Dispute letter content</td><td className="px-4 py-3">Yes</td></tr>
                  <tr><td className="px-4 py-3">Municipal account number</td><td className="px-4 py-3">Identifying your account with the municipality</td><td className="px-4 py-3">Yes</td></tr>
                  <tr><td className="px-4 py-3">Bill documents (PDF/photo)</td><td className="px-4 py-3">AI-powered analysis for billing errors</td><td className="px-4 py-3">Yes</td></tr>
                  <tr><td className="px-4 py-3">Payment card token</td><td className="px-4 py-3">Success fee processing (via PayFast)</td><td className="px-4 py-3">Yes</td></tr>
                  <tr><td className="px-4 py-3">IP address</td><td className="px-4 py-3">Security and fraud prevention</td><td className="px-4 py-3">Automatic</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              We do <strong>not</strong> collect any special personal information as defined by
              POPIA &mdash; no religious beliefs, race, health information, biometric data,
              or criminal records.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Analyse your municipal bill for errors using AI (Anthropic Claude)</li>
              <li>Generate a legally compliant dispute letter citing relevant legislation</li>
              <li>Send the dispute letter to your municipality via email</li>
              <li>Track the progress of your dispute case</li>
              <li>Process success fees when funds are recovered</li>
              <li>Send you notifications about your case progress</li>
              <li>Protect the security and integrity of our platform</li>
            </ul>
            <p className="mt-4">
              We will <strong>never</strong> sell your data, use it for profiling, or share it
              with third parties for marketing purposes.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              4. Who We Share Your Data With
            </h2>
            <p className="mb-4">
              We share your data only with the following service providers, and only for the
              purposes described:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-light-grey rounded-lg">
                <thead className="bg-navy text-white text-left">
                  <tr>
                    <th className="px-4 py-3 font-bold">Provider</th>
                    <th className="px-4 py-3 font-bold">Data Shared</th>
                    <th className="px-4 py-3 font-bold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-grey">
                  <tr><td className="px-4 py-3">Anthropic (Claude AI)</td><td className="px-4 py-3">Bill text, account number, municipality</td><td className="px-4 py-3">Bill analysis &amp; letter generation</td></tr>
                  <tr><td className="px-4 py-3">Supabase</td><td className="px-4 py-3">All user data &amp; files</td><td className="px-4 py-3">Database &amp; file storage</td></tr>
                  <tr><td className="px-4 py-3">Resend</td><td className="px-4 py-3">Email address, user name</td><td className="px-4 py-3">Email delivery</td></tr>
                  <tr><td className="px-4 py-3">PayFast</td><td className="px-4 py-3">Payment card token, amounts</td><td className="px-4 py-3">Payment processing</td></tr>
                  <tr><td className="px-4 py-3">Voyage AI</td><td className="px-4 py-3">Anonymised bill text chunks</td><td className="px-4 py-3">Legislation search</td></tr>
                  <tr><td className="px-4 py-3">Railway</td><td className="px-4 py-3">Application hosting</td><td className="px-4 py-3">Infrastructure</td></tr>
                  <tr><td className="px-4 py-3">Cloudflare</td><td className="px-4 py-3">DNS queries, IP addresses</td><td className="px-4 py-3">DNS &amp; security</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              5. How We Protect Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>All data transmitted over HTTPS (TLS encryption)</li>
              <li>Database access protected by Row Level Security &mdash; you can only see your own data</li>
              <li>Bill files stored in private buckets &mdash; never publicly accessible</li>
              <li>Temporary signed URLs for file access (expire after 1 hour)</li>
              <li>Payment card numbers are never stored &mdash; PayFast handles tokenisation</li>
              <li>API keys and secrets never exposed to web browsers</li>
              <li>Authentication via Supabase with secure, HttpOnly cookies</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              6. How Long We Keep Your Information
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-light-grey rounded-lg">
                <thead className="bg-navy text-white text-left">
                  <tr>
                    <th className="px-4 py-3 font-bold">Data</th>
                    <th className="px-4 py-3 font-bold">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-grey">
                  <tr><td className="px-4 py-3">Active cases</td><td className="px-4 py-3">While your account is active</td></tr>
                  <tr><td className="px-4 py-3">Resolved cases</td><td className="px-4 py-3">5 years after resolution</td></tr>
                  <tr><td className="px-4 py-3">Bill documents</td><td className="px-4 py-3">Deleted after case closes</td></tr>
                  <tr><td className="px-4 py-3">Profile data</td><td className="px-4 py-3">Deleted on account deletion</td></tr>
                  <tr><td className="px-4 py-3">Payment tokens</td><td className="px-4 py-3">Deleted on account deletion</td></tr>
                  <tr><td className="px-4 py-3">Transaction records</td><td className="px-4 py-3">7 years (SARS tax requirement, PII stripped)</td></tr>
                  <tr><td className="px-4 py-3">Security logs</td><td className="px-4 py-3">12 months (rolling)</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              7. Your Rights Under POPIA
            </h2>
            <p className="mb-4">
              Under the Protection of Personal Information Act, you have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Access</strong> &mdash; request a copy of all personal data we hold about you</li>
              <li><strong>Correction</strong> &mdash; update or correct your personal information at any time</li>
              <li><strong>Deletion</strong> &mdash; request that we permanently delete all your personal data</li>
              <li><strong>Objection</strong> &mdash; object to processing of your data for marketing purposes</li>
              <li><strong>Data portability</strong> &mdash; receive your data in a machine-readable format (JSON)</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, visit your account Settings page or email us at{' '}
              <a href="mailto:privacy@billdog.co.za" className="text-blue underline">
                privacy@billdog.co.za
              </a>.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              8. Data Breach Notification
            </h2>
            <p>
              In the event of a data breach that compromises your personal information, we will:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Notify the Information Regulator within 72 hours of becoming aware of the breach</li>
              <li>Notify affected users as soon as reasonably possible via email</li>
              <li>Provide details of: what happened, what data was affected, and what steps to take</li>
              <li>Document the breach and take immediate steps to prevent recurrence</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              9. Cookies
            </h2>
            <p>
              Billdog uses <strong>essential cookies only</strong> for authentication and session
              management. We do not use any tracking, analytics, or advertising cookies.
            </p>
            <p className="mt-3">
              Essential cookies are necessary for the platform to function and do not require
              separate consent under POPIA.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              10. Complaints
            </h2>
            <p>
              If you believe we have violated your privacy rights, you may lodge a complaint
              with the Information Regulator:
            </p>
            <div className="mt-4 bg-white border border-light-grey rounded-xl p-5 text-sm">
              <p className="font-bold text-navy">Information Regulator (South Africa)</p>
              <p className="mt-2">
                Website:{' '}
                <a href="https://inforegulator.org.za" className="text-blue underline" target="_blank" rel="noopener noreferrer">
                  inforegulator.org.za
                </a>
              </p>
              <p>Email: inforeg@justice.gov.za</p>
              <p>Telephone: 010 023 5200</p>
              <p>Address: JD House, 27 Stiemens Street, Braamfontein, Johannesburg</p>
            </div>
          </section>

          {/* 11 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. For material changes, we
              will notify you via email before the changes take effect. The updated version
              will always be available at this page with a new version number and date.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              12. Contact Us
            </h2>
            <p>
              For any privacy-related questions or requests, contact our Information Officer:
            </p>
            <p className="mt-3">
              <strong>Jason Thwaits</strong>
              <br />
              <a href="mailto:privacy@billdog.co.za" className="text-blue underline">
                privacy@billdog.co.za
              </a>
            </p>
          </section>

          {/* Footer version */}
          <p className="pt-8 border-t border-light-grey text-sm text-grey/60">
            Privacy Policy v1.0 &mdash; 30 March 2026
          </p>
        </div>
      </div>
    </article>
  );
}
