'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export function SignupForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [feeConsent, setFeeConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (!dataConsent) {
      setError('You must consent to data processing to use Billdog.');
      setIsLoading(false);
      return;
    }

    if (!feeConsent) {
      setError('You must agree to the success fee terms to continue.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw new Error(signUpError.message);

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          email,
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          consent_version: 'v1.0-2026-03-30',
          marketing_consent: marketingConsent,
        });

        if (profileError) {
          console.error('[Auth]', profileError);
        }
      }

      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error('[Auth]', error);
      const err = error as Error;
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4 w-full max-w-sm">
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 text-red-100 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="sr-only" htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          type="text"
          required
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        />
      </div>

      <div>
        <label className="sr-only" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        />
      </div>

      <div>
        <label className="sr-only" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        />
      </div>

      <div>
        <label className="sr-only" htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        />
      </div>

      {/* CONSENT 1: Data processing (REQUIRED) */}
      <label className="flex items-start gap-3 mt-4 min-h-[44px]">
        <input
          type="checkbox"
          checked={dataConsent}
          onChange={(e) => setDataConsent(e.target.checked)}
          className="mt-1 min-w-4 min-h-4"
        />
        <span className="text-sm text-white/70">
          I consent to Billdog processing my personal information to analyse my
          municipal bills and generate dispute letters on my behalf. This includes
          sending my bill data to AI services (Anthropic) for analysis.{' '}
          <a href="/privacy" className="text-orange underline" target="_blank" rel="noopener noreferrer">
            Read our Privacy Policy
          </a>
        </span>
      </label>

      {/* CONSENT 2: Success fee (REQUIRED) */}
      <label className="flex items-start gap-3 min-h-[44px]">
        <input
          type="checkbox"
          checked={feeConsent}
          onChange={(e) => setFeeConsent(e.target.checked)}
          className="mt-1 min-w-4 min-h-4"
        />
        <span className="text-sm text-white/70">
          I agree to the 20% success fee on funds recovered through disputed
          charges, as described in our{' '}
          <a href="/terms" className="text-orange underline" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>.
        </span>
      </label>

      {/* CONSENT 3: Marketing (OPTIONAL) */}
      <label className="flex items-start gap-3 min-h-[44px]">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-1 min-w-4 min-h-4"
        />
        <span className="text-sm text-white/70">
          I&apos;d like to receive email updates about my case progress and tips
          on managing municipal bills. (Optional &mdash; you can unsubscribe any time.)
        </span>
      </label>

      <Button type="submit" variant="primary" className="w-full mt-6" disabled={isLoading}>
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}

