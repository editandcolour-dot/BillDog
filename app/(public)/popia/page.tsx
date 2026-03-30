import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POPIA Compliance | Billdog',
  description: 'How Billdog complies with the Protection of Personal Information Act (POPIA).',
  openGraph: {
    title: 'POPIA Compliance | Billdog',
    description: 'How Billdog complies with the Protection of Personal Information Act (POPIA).',
    url: 'https://billdog.co.za/popia',
  },
};

/** POPIA Compliance Statement page. */
export default function PopiaCompliancePage() {
  return (
    <article className="bg-off-white min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 md:px-[6%] py-16 md:py-24">

        {/* Header */}
        <span className="block mb-3 text-orange text-xs font-bold uppercase tracking-[2px]">
          Compliance
        </span>
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] text-navy tracking-wide uppercase">
          POPIA Compliance
        </h1>
        <p className="mt-3 text-grey text-sm font-medium">
          Last reviewed: 30 March 2026
        </p>

        <div className="mt-10 space-y-12 max-w-3xl text-grey leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              1. Compliance Statement
            </h2>
            <p>
              Billdog is committed to full compliance with the Protection of Personal
              Information Act (No. 4 of 2013) (&ldquo;POPIA&rdquo;). We process personal
              information lawfully, fairly, and transparently in accordance with all
              eight conditions for lawful processing as set out in POPIA.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              2. Information Officer
            </h2>
            <div className="bg-white border border-light-grey rounded-xl p-5">
              <p><strong className="text-navy">Name:</strong> Jason Thwaits</p>
              <p className="mt-1"><strong className="text-navy">Email:</strong>{' '}
                <a href="mailto:privacy@billdog.co.za" className="text-blue underline">
                  privacy@billdog.co.za
                </a>
              </p>
              <p className="mt-1"><strong className="text-navy">Organisation:</strong> Billdog (Pty Ltd registration pending)</p>
              <p className="mt-1"><strong className="text-navy">Address:</strong> Cape Town, Western Cape, South Africa</p>
            </div>
            <p className="mt-4 text-sm italic">
              Billdog is in the process of registering its Information Officer with the
              Information Regulator as required by POPIA Section 55.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              3. Data Processing Register
            </h2>
            <p className="mb-4">
              The following summarises what personal information we process, why, and for how long:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-light-grey rounded-lg">
                <thead className="bg-navy text-white text-left">
                  <tr>
                    <th className="px-4 py-3 font-bold">Category</th>
                    <th className="px-4 py-3 font-bold">Lawful Basis</th>
                    <th className="px-4 py-3 font-bold">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-grey">
                  <tr><td className="px-4 py-3">Identity (name, email)</td><td className="px-4 py-3">Contract performance</td><td className="px-4 py-3">Until account deletion</td></tr>
                  <tr><td className="px-4 py-3">Municipal account details</td><td className="px-4 py-3">Contract performance</td><td className="px-4 py-3">Until account deletion</td></tr>
                  <tr><td className="px-4 py-3">Bill documents</td><td className="px-4 py-3">Contract performance</td><td className="px-4 py-3">Deleted after case closure</td></tr>
                  <tr><td className="px-4 py-3">Dispute case data</td><td className="px-4 py-3">Contract performance</td><td className="px-4 py-3">5 years after resolution</td></tr>
                  <tr><td className="px-4 py-3">Payment token</td><td className="px-4 py-3">Contract performance</td><td className="px-4 py-3">Until account deletion</td></tr>
                  <tr><td className="px-4 py-3">Transaction records</td><td className="px-4 py-3">Legal obligation (SARS)</td><td className="px-4 py-3">7 years</td></tr>
                  <tr><td className="px-4 py-3">Security logs (IP)</td><td className="px-4 py-3">Legitimate interest</td><td className="px-4 py-3">12 months</td></tr>
                  <tr><td className="px-4 py-3">Marketing preferences</td><td className="px-4 py-3">Consent</td><td className="px-4 py-3">Until withdrawal</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              4. Data Processors
            </h2>
            <p className="mb-4">
              We share personal information with the following processors who act on our
              instructions:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-light-grey rounded-lg">
                <thead className="bg-navy text-white text-left">
                  <tr>
                    <th className="px-4 py-3 font-bold">Processor</th>
                    <th className="px-4 py-3 font-bold">Data Category</th>
                    <th className="px-4 py-3 font-bold">Purpose</th>
                    <th className="px-4 py-3 font-bold">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-grey">
                  <tr><td className="px-4 py-3">Anthropic</td><td className="px-4 py-3">Bill text, account details</td><td className="px-4 py-3">AI analysis</td><td className="px-4 py-3">US</td></tr>
                  <tr><td className="px-4 py-3">Supabase</td><td className="px-4 py-3">All data</td><td className="px-4 py-3">Database &amp; storage</td><td className="px-4 py-3">EU-West-1</td></tr>
                  <tr><td className="px-4 py-3">Resend</td><td className="px-4 py-3">Email, name</td><td className="px-4 py-3">Email delivery</td><td className="px-4 py-3">US</td></tr>
                  <tr><td className="px-4 py-3">PayFast</td><td className="px-4 py-3">Payment token</td><td className="px-4 py-3">Payments</td><td className="px-4 py-3">South Africa</td></tr>
                  <tr><td className="px-4 py-3">Voyage AI</td><td className="px-4 py-3">Anonymised text</td><td className="px-4 py-3">Legislation search</td><td className="px-4 py-3">US</td></tr>
                  <tr><td className="px-4 py-3">Railway</td><td className="px-4 py-3">Hosting</td><td className="px-4 py-3">Infrastructure</td><td className="px-4 py-3">US-East</td></tr>
                  <tr><td className="px-4 py-3">Cloudflare</td><td className="px-4 py-3">DNS, IP</td><td className="px-4 py-3">DNS &amp; security</td><td className="px-4 py-3">Global</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              5. Security Measures
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>End-to-end encryption (HTTPS/TLS) for all data in transit</li>
              <li>Row Level Security on all database tables</li>
              <li>Private file storage with time-limited signed URLs</li>
              <li>Payment card tokenisation via PayFast &mdash; no card numbers stored</li>
              <li>Secure, HttpOnly authentication cookies</li>
              <li>Server-side API key management &mdash; secrets never exposed to browsers</li>
              <li>Regular dependency auditing</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              6. How to Request Your Data
            </h2>
            <p>You can request a copy of all data Billdog holds about you:</p>
            <ol className="list-decimal list-inside space-y-2 mt-3">
              <li>Log in to your Billdog account</li>
              <li>Go to <strong>Settings</strong></li>
              <li>Click <strong>Download My Data</strong></li>
              <li>Your data will be exported as a JSON file</li>
            </ol>
            <p className="mt-4">
              Alternatively, email{' '}
              <a href="mailto:privacy@billdog.co.za" className="text-blue underline">
                privacy@billdog.co.za
              </a>{' '}
              and we will respond within 30 days as required by POPIA.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              7. How to Delete Your Data
            </h2>
            <p>You can request permanent deletion of all your personal data:</p>
            <ol className="list-decimal list-inside space-y-2 mt-3">
              <li>Log in to your Billdog account</li>
              <li>Go to <strong>Settings</strong></li>
              <li>Click <strong>Delete My Account</strong></li>
              <li>Confirm deletion in the confirmation dialog</li>
              <li>You will receive an email confirming that deletion is scheduled</li>
              <li>After 30 days, all personal data is permanently deleted</li>
              <li>To cancel, simply log back in before the 30-day period ends</li>
            </ol>
            <p className="mt-4">
              <strong>Note:</strong> SARS requires us to retain anonymised transaction records
              (fee amounts and dates only, with all personal information removed) for 7 years.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              8. PAIA Manual Reference
            </h2>
            <p>
              The Promotion of Access to Information Act (No. 2 of 2000) (&ldquo;PAIA&rdquo;)
              requires that we make available a manual detailing the types of records held and
              how to request access. Billdog&apos;s PAIA manual is available upon request from{' '}
              <a href="mailto:privacy@billdog.co.za" className="text-blue underline">
                privacy@billdog.co.za
              </a>.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-4">
              9. Information Regulator
            </h2>
            <div className="bg-white border border-light-grey rounded-xl p-5 text-sm">
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

          {/* Footer version */}
          <p className="pt-8 border-t border-light-grey text-sm text-grey/60">
            POPIA Compliance Statement &mdash; Last reviewed 30 March 2026
          </p>
        </div>
      </div>
    </article>
  );
}
