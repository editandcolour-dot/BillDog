'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

type CTAState = 'loading' | 'anonymous' | 'connected' | 'not-connected';

/**
 * Smart Hero CTA — adapts based on user's authentication and municipality connection status.
 * 
 * Anonymous users → "Connect Your Municipality →" → /signup
 * Logged-in, no municipality → "Connect Your Municipality →" → /onboarding/auto-fetch
 * Logged-in, municipality connected → "View Your Dashboard →" → /dashboard
 */
export function HeroCTA() {
  const [state, setState] = useState<CTAState>('loading');

  useEffect(() => {
    fetch('/api/autofetch/status')
      .then((res) => {
        if (res.status === 401) {
          setState('anonymous');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return; // Already set to anonymous
        if (data.credential) {
          setState('connected');
        } else {
          setState('not-connected');
        }
      })
      .catch(() => {
        setState('anonymous');
      });
  }, []);

  if (state === 'loading') {
    return (
      <Button href="/signup" className="w-full sm:w-auto opacity-90">
        Connect & Analyse 36 Months →
      </Button>
    );
  }

  if (state === 'connected') {
    return (
      <Button href="/dashboard" className="w-full sm:w-auto">
        View Your Dashboard →
      </Button>
    );
  }

  if (state === 'not-connected') {
    return (
      <Button href="/onboarding/auto-fetch" className="w-full sm:w-auto">
        Connect & Analyse 36 Months →
      </Button>
    );
  }

  // anonymous
  return (
    <Button href="/signup" className="w-full sm:w-auto">
      Connect & Analyse 36 Months →
    </Button>
  );
}
