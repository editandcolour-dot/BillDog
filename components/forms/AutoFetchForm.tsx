'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { Metro, OtherOption } from '@/lib/municipalities/sa-metros';

interface AutoFetchFormProps {
  metros: Metro[];
  otherOption: OtherOption;
  userId: string;
}

export function AutoFetchForm({ metros, otherOption, userId }: AutoFetchFormProps) {
  const router = useRouter();

  const [selectedMetroId, setSelectedMetroId] = useState('');
  const [portalUsername, setPortalUsername] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [manualPortalUrl, setManualPortalUrl] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedMetro = metros.find((m) => m.id === selectedMetroId);
  const isOther = selectedMetroId === 'other';
  const isLive = selectedMetro?.scraper_status === 'live';
  const isDiscoveryPending = selectedMetro?.scraper_status === 'discovery_pending';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setStatusMessage(null);

    if (!selectedMetroId) {
      setError('Please select your municipality.');
      setIsLoading(false);
      return;
    }

    if (!consentChecked) {
      setError('You must consent to municipal account access before continuing.');
      setIsLoading(false);
      return;
    }

    // Handle "other" municipality
    if (isOther) {
      if (!manualPortalUrl) {
        setError('Please provide your municipality portal URL.');
        setIsLoading(false);
        return;
      }

      try {
        // Send manual request to admin
        await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Auto-Fetch Request',
            email: 'system@billdog.co.za',
            message: `User ${userId} requested auto-fetch for unlisted municipality. Portal URL: ${manualPortalUrl}`,
          }),
        });
        setStatusMessage(
          "We've received your request. We'll review and add support for your municipality manually. We'll email you when ready."
        );
      } catch {
        setError('Failed to submit request. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!portalUsername || !portalPassword) {
      setError('Please enter your municipal portal username and password.');
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Record autofetch consent
      const consentRes = await fetch('/api/autofetch/consent', { method: 'POST' });
      if (!consentRes.ok) {
        const consentData = await consentRes.json();
        throw new Error(consentData.error || 'Failed to record consent');
      }

      // Step 2: Submit and verify credentials
      const credRes = await fetch('/api/autofetch/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          municipality_id: selectedMetro?.id,
          portal_username: portalUsername,
          portal_password: portalPassword,
        }),
      });

      const credData = await credRes.json();

      if (!credRes.ok) {
        if (credData.errorCode === 'INVALID_CREDENTIALS') {
          throw new Error('Invalid username or password. Please check your municipal portal login details and try again.');
        }
        if (credData.errorCode === 'PORTAL_UNAVAILABLE') {
          throw new Error('The municipal portal is currently unavailable. Please try again later.');
        }
        throw new Error(credData.error || 'Failed to verify credentials');
      }

      // Step 3: Show appropriate message based on scraper status
      if (isLive) {
        setStatusMessage(
          "Standby — your latest bill analysis will be in your inbox shortly. We'll also analyse your last 36 months for trend errors and email a separate summary within 24 hours."
        );
      } else if (isDiscoveryPending) {
        setStatusMessage(
          `We're setting up access for ${selectedMetro?.name}. We'll email you when your bills have been analysed — typically within 48 hours for new municipalities.`
        );
      }

      // Redirect to /account after a brief delay to show the message
      setTimeout(() => router.push('/account'), 4000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full">
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 text-red-100 rounded text-sm">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="p-4 bg-success/10 border border-success/30 text-success rounded-lg text-sm font-medium">
          {statusMessage}
        </div>
      )}

      {!statusMessage && (
        <>
          {/* Municipality Dropdown */}
          <div>
            <label className="text-sm text-white/70 mb-1.5 block font-medium" htmlFor="municipality-select">
              Municipality
            </label>
            <select
              id="municipality-select"
              required
              value={selectedMetroId}
              onChange={(e) => {
                setSelectedMetroId(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-3 min-h-[44px] bg-white/5 border border-white/10 rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange appearance-none cursor-pointer"
            >
              <option value="" disabled className="text-navy">
                Select your municipality
              </option>
              {metros.map((m) => (
                <option key={m.id} value={m.id} className="text-navy">
                  {m.name} — {m.province}
                </option>
              ))}
              <option value="other" className="text-navy">
                {otherOption.name}
              </option>
            </select>
          </div>

          {/* Portal URL display */}
          {selectedMetro && (
            <div className="p-3 bg-blue/10 border border-blue/20 rounded-lg">
              <p className="text-white/60 text-xs mb-1">Find your account credentials at:</p>
              <a
                href={selectedMetro.portal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange text-sm hover:underline underline-offset-4 break-all"
              >
                {selectedMetro.portal_url} ↗
              </a>
            </div>
          )}

          {/* Credentials fields — shown for live and discovery_pending metros */}
          {selectedMetro && (isLive || isDiscoveryPending) && (
            <>
              <div>
                <label className="text-sm text-white/70 mb-1.5 block font-medium" htmlFor="portal-username">
                  Portal Username
                </label>
                <input
                  id="portal-username"
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Your municipal portal username"
                  value={portalUsername}
                  onChange={(e) => setPortalUsername(e.target.value)}
                  className="w-full px-4 py-3 min-h-[44px] bg-white/5 border border-white/10 rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                />
              </div>

              <div>
                <label className="text-sm text-white/70 mb-1.5 block font-medium" htmlFor="portal-password">
                  Portal Password
                </label>
                <input
                  id="portal-password"
                  type="password"
                  required
                  autoComplete="off"
                  placeholder="Your municipal portal password"
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                  className="w-full px-4 py-3 min-h-[44px] bg-white/5 border border-white/10 rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                />
              </div>

              {/* Encryption notice */}
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Encrypted with AES-256-GCM on submit. Credentials are never stored in plaintext.</span>
              </div>
            </>
          )}

          {/* Manual URL field for "other" */}
          {isOther && (
            <div>
              <label className="text-sm text-white/70 mb-1.5 block font-medium" htmlFor="manual-portal-url">
                Your Municipality Portal URL
              </label>
              <input
                id="manual-portal-url"
                type="url"
                required
                placeholder="https://eservices.yourmunicipality.gov.za"
                value={manualPortalUrl}
                onChange={(e) => setManualPortalUrl(e.target.value)}
                className="w-full px-4 py-3 min-h-[44px] bg-white/5 border border-white/10 rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
              />
            </div>
          )}

          {/* Consent checkbox — POPIA-compliant disclosure of credential storage and ongoing use. */}
          <label className="flex items-start gap-3 mt-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 min-w-4 min-h-4"
            />
            <span className="text-sm text-white/70 leading-relaxed">
              I authorise Billdog to <strong className="text-white">securely store my municipal portal login</strong>
              {' '}(encrypted with AES-256-GCM) and use it on an ongoing basis to fetch
              my bills each month, so Billdog can keep checking that my municipality
              isn&apos;t overbilling me. I understand I can disconnect or delete my
              account at any time from the Account page — a right preserved under the
              Protection of Personal Information Act (POPIA). Full detail in our{' '}
              <a href="/privacy" className="text-orange underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/popia" className="text-orange underline" target="_blank" rel="noopener noreferrer">
                POPIA notice
              </a>.
            </span>
          </label>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-4"
            disabled={isLoading || !consentChecked}
          >
            {isLoading ? 'Connecting...' : isOther ? 'Submit Request' : 'Start My Analysis'}
          </Button>
        </>
      )}
    </form>
  );
}
