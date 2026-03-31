'use client';

import React, { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Something went wrong.');
        setStatus('error');
        return;
      }
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  };

  return (
    <article className="bg-off-white min-h-screen">
      {/* Hero */}
      <section className="bg-navy relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue/10 rounded-full blur-[100px]" />
        <div className="relative max-w-[1200px] mx-auto px-6 md:px-[6%] pt-32 pb-16 text-center">
          <span className="text-orange text-xs font-bold uppercase tracking-[2px] mb-3 block">Contact</span>
          <h1 className="font-display text-4xl md:text-6xl text-white tracking-wider leading-tight">
            GET IN <span className="text-orange">TOUCH</span>
          </h1>
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
            Have a question, need help with a dispute, or want to exercise your data rights?
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[6%]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* Contact Form */}
            <div className="bg-white border border-light-grey rounded-2xl p-7 md:p-8 shadow-sm">
              <h2 className="font-display text-2xl text-navy tracking-wide uppercase mb-6">Send Us A Message</h2>

              {status === 'sent' ? (
                <div className="bg-success/10 border border-success/30 rounded-xl p-6 text-center">
                  <svg className="w-12 h-12 text-success mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-navy font-bold text-lg">Message sent!</p>
                  <p className="text-grey text-sm mt-1">We&apos;ll get back to you within 2 business days.</p>
                  <button onClick={() => setStatus('idle')} className="mt-4 text-blue underline text-sm font-medium">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-navy mb-1.5">Name</label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full min-h-[44px] border border-light-grey rounded-lg px-4 py-3 text-base text-navy placeholder:text-grey/50 focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-all duration-200"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-navy mb-1.5">Email</label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full min-h-[44px] border border-light-grey rounded-lg px-4 py-3 text-base text-navy placeholder:text-grey/50 focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-all duration-200"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="block text-sm font-medium text-navy mb-1.5">Subject</label>
                    <select
                      id="contact-subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full min-h-[44px] border border-light-grey rounded-lg px-4 py-3 text-base text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-all duration-200"
                    >
                      <option value="">General Enquiry</option>
                      <option value="Support">Support — Help with my case</option>
                      <option value="Privacy">Privacy — Data request (POPIA)</option>
                      <option value="Billing">Billing — Fee or payment query</option>
                      <option value="Complaint">Complaint — About Billdog&apos;s service</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="block text-sm font-medium text-navy mb-1.5">Message</label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full border border-light-grey rounded-lg px-4 py-3 text-base text-navy placeholder:text-grey/50 focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-all duration-200 resize-y"
                      placeholder="How can we help?"
                    />
                  </div>

                  {status === 'error' && (
                    <div className="bg-error/10 border border-error/30 rounded-lg p-3">
                      <p className="text-error text-sm font-medium">{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full min-h-[44px] px-7 py-4 bg-orange text-white font-bold rounded-md hover:bg-orange-light hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)] active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {status === 'sending' ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>

            {/* Contact Cards */}
            <div className="space-y-6">
              <div className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                <div className="w-12 h-12 bg-orange/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-xl">📧</span>
                </div>
                <h2 className="font-display text-xl text-navy tracking-wide uppercase mb-2">Support</h2>
                <a href="mailto:support@billdog.co.za" className="text-blue underline font-medium">support@billdog.co.za</a>
                <p className="mt-2 text-grey text-sm leading-relaxed">Help with your account, disputes, or general questions.</p>
                <p className="mt-3 text-xs text-grey/60 font-medium uppercase tracking-wider">Response: within 2 business days</p>
              </div>

              <div className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                <div className="w-12 h-12 bg-blue/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-xl">🔒</span>
                </div>
                <h2 className="font-display text-xl text-navy tracking-wide uppercase mb-2">Privacy &amp; Data</h2>
                <a href="mailto:privacy@billdog.co.za" className="text-blue underline font-medium">privacy@billdog.co.za</a>
                <p className="mt-2 text-grey text-sm leading-relaxed">Data access, correction, deletion, or any POPIA requests.</p>
                <p className="mt-3 text-xs text-grey/60 font-medium uppercase tracking-wider">Response: within 30 days (POPIA)</p>
              </div>

              <div className="bg-white border border-light-grey rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-xl">📍</span>
                </div>
                <h2 className="font-display text-xl text-navy tracking-wide uppercase mb-2">Location</h2>
                <p className="text-grey font-medium">Cape Town, Western Cape<br />South Africa</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
