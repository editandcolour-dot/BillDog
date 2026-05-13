'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { CURRENT_POPIA_CONSENT, CURRENT_MANDATE_CONSENT } from '@/lib/popia/consent';
import { validateSAID } from '@/lib/validators/sa-id';
import { RECOVERY_FEE_DISPLAY } from '@/lib/constants/fees';

export function SignupForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [feeConsent, setFeeConsent] = useState(false);
  const [mandateConsent, setMandateConsent] = useState(false);
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

    // Validate SA ID number
    const idValidation = validateSAID(idNumber);
    if (!idValidation.isValid) {
      setError(idValidation.message || 'Invalid SA ID number.');
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

    if (!mandateConsent) {
      setError('You must authorise Billdog to act on your behalf to use the service.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw new Error(signUpError.message);

      if (data.user) {
        const nowIso = new Date().toISOString();
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          email,
          consent_given: true,
          consent_timestamp: nowIso,
          consent_version: CURRENT_POPIA_CONSENT.version,
          mandate_consent_at: nowIso,
          mandate_consent_version: CURRENT_MANDATE_CONSENT.version,
          marketing_consent: marketingConsent,
        });

        if (profileError) {
          console.error('[Auth]', profileError);
        }

        // Store ID number to Vault via profile-level RPC (write once, never prompt again)
        try {
          const { error: idError } = await supabase.rpc('store_profile_id', {
            id_number: idNumber,
          });
          if (idError) {
            console.error('[Auth] ID storage failed:', idError.message);
          }
        } catch (idErr) {
          // Non-fatal for signup flow — ID can be re-prompted once on next route
          console.error('[Auth] ID storage exception:', idErr);
        }

        // Append-only consent audit log (POPIA evidence). Server captures IP + UA.
        try {
          await fetch('/api/consent/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              events: [
                { event_type: 'popia_granted', consent_version: CURRENT_POPIA_CONSENT.version },
                { event_type: 'mandate_granted', consent_version: CURRENT_MANDATE_CONSENT.version },
                { event_type: 'fee_consent_granted', consent_version: 'v1' },
              ],
            }),
          });
        } catch (logErr) {
          // Non-fatal — profile already has consent_* fields. Audit log is best-effort here.
          console.error('[Auth] consent_events log failed', logErr);
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
        <label className="sr-only" htmlFor="idNumber">SA ID Number</label>
        <input
          id="idNumber"
          type="text"
          required
          inputMode="numeric"
          pattern="\d{13}"
          maxLength={13}
          placeholder="SA ID Number (13 digits)"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
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
          I agree to the {RECOVERY_FEE_DISPLAY} success fee on funds recovered through disputed
          charges, as described in our{' '}
          <a href="/terms" className="text-orange underline" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>.
        </span>
      </label>

      {/* CONSENT 3: Mandate to act (REQUIRED) */}
      <label className="flex items-start gap-3 min-h-[44px]">
        <input
          type="checkbox"
          checked={mandateConsent}
          onChange={(e) => setMandateConsent(e.target.checked)}
          className="mt-1 min-w-4 min-h-4"
        />
        <span className="text-sm text-white/70">
          {CURRENT_MANDATE_CONSENT.text}
        </span>
      </label>

      {/* CONSENT 4: Marketing (OPTIONAL) */}
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

