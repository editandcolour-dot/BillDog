import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Billdog',
  description: 'Get in touch with the Billdog team for support, privacy requests, or service enquiries.',
  openGraph: {
    title: 'Contact | Billdog',
    description: 'Get in touch with the Billdog team for support, privacy requests, or service enquiries.',
    url: 'https://billdog.co.za/contact',
  },
};

/** Contact page. */
export default function ContactPage() {
  return (
    <article className="bg-off-white min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 md:px-[6%] py-16 md:py-24">

        {/* Header */}
        <span className="block mb-3 text-orange text-xs font-bold uppercase tracking-[2px]">
          Get In Touch
        </span>
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] text-navy tracking-wide uppercase">
          Contact Billdog
        </h1>
        <p className="mt-4 text-grey text-lg leading-relaxed max-w-2xl">
          Have a question, need help with a dispute, or want to exercise your data rights?
          Reach out to us using the details below.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl">

          {/* Support */}
          <div className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
            <div className="w-12 h-12 bg-orange/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="font-display text-xl text-navy tracking-wide uppercase mb-2">Support</h2>
            <a href="mailto:support@billdog.co.za" className="text-blue underline font-medium">
              support@billdog.co.za
            </a>
            <p className="mt-2 text-grey text-sm leading-relaxed">
              For help with your account, disputes, or general questions.
            </p>
            <p className="mt-3 text-xs text-grey/60 font-medium uppercase tracking-wider">
              Response time: within 2 business days
            </p>
          </div>

          {/* Privacy / Data Requests */}
          <div className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
            <div className="w-12 h-12 bg-blue/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
              </svg>
            </div>
            <h2 className="font-display text-xl text-navy tracking-wide uppercase mb-2">Privacy &amp; Data Requests</h2>
            <a href="mailto:privacy@billdog.co.za" className="text-blue underline font-medium">
              privacy@billdog.co.za
            </a>
            <p className="mt-2 text-grey text-sm leading-relaxed">
              For data access, correction, deletion, or any POPIA-related requests.
            </p>
            <p className="mt-3 text-xs text-grey/60 font-medium uppercase tracking-wider">
              Response time: within 30 days (POPIA requirement)
            </p>
          </div>

          {/* Service Disputes */}
          <div className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
            <div className="w-12 h-12 bg-navy/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h2 className="font-display text-xl text-navy tracking-wide uppercase mb-2">Service Disputes</h2>
            <a href="mailto:support@billdog.co.za" className="text-blue underline font-medium">
              support@billdog.co.za
            </a>
            <p className="mt-2 text-grey text-sm leading-relaxed">
              If you have a complaint about Billdog&apos;s service, fees, or how we handled your case.
            </p>
          </div>

          {/* Physical Address */}
          <div className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="font-display text-xl text-navy tracking-wide uppercase mb-2">Address</h2>
            <p className="text-grey font-medium">
              Cape Town, Western Cape
              <br />
              South Africa
            </p>
          </div>

        </div>
      </div>
    </article>
  );
}
