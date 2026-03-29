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
  const [consent, setConsent] = useState(false);
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

    if (!consent) {
      setError('You must accept the privacy policy to continue.');
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
        // Create profile record since triggers aren't guaranteed
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          email,
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          consent_version: '1.0',
        });

        if (profileError) {
          console.error('[Auth]', profileError);
          // Let them proceed anyway as the user auth record was created. 
          // They can fill out name in onboarding or handle broken profile.
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

      <label className="flex items-start gap-3 mt-4">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 min-w-4 min-h-4"
        />
        <span className="text-sm text-white/70">
          I consent to Billdog processing my personal information including municipal bill documents to dispute billing errors on my behalf. My data may be shared with AI processing services (Anthropic), payment processors (PayFast), and email services (Resend) solely for this purpose. I understand I can request access, correction or deletion of my data at any time via privacy@billdog.co.za.
        </span>
      </label>

      <Button type="submit" variant="primary" className="w-full mt-6" disabled={isLoading}>
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}
