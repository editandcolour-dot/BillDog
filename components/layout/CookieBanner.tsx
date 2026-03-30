'use client';

import { useState, useEffect } from 'react';

const COOKIE_BANNER_KEY = 'billdog_cookie_notice_dismissed';

/**
 * Essential cookie notice banner — fixed to bottom of viewport.
 * Persists dismissal in localStorage so it only shows once.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(COOKIE_BANNER_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(COOKIE_BANNER_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-50 bg-navy border-t border-white/10 shadow-lg"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-[6%] py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-white/70 text-sm leading-relaxed">
          This site uses essential cookies for authentication and security.
          No tracking cookies are used.{' '}
          <a href="/privacy" className="text-orange underline hover:text-orange-light transition-colors">
            Privacy Policy
          </a>
        </p>
        <button
          onClick={handleDismiss}
          className="min-h-[44px] px-6 py-2 bg-orange text-white font-bold rounded-md hover:bg-orange-light hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)] active:translate-y-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 focus:ring-offset-navy whitespace-nowrap"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
