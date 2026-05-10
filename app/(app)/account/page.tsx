'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function AccountPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Profile fields state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [propertyType, setPropertyType] = useState('residential');
  const [accountNumber, setAccountNumber] = useState('');
  const [municipality, setMunicipality] = useState('');
  
  // Danger zone state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mandate state
  const [showMandateConfirm, setShowMandateConfirm] = useState(false);
  const [mandateBusy, setMandateBusy] = useState(false);

  // Auto-fetch state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [autofetchStatus, setAutofetchStatus] = useState<any>(null);
  const [revokingCreds, setRevokingCreds] = useState(false);

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setPropertyType(data.property_type || 'residential');
        setAccountNumber(data.account_number || '');
        setMunicipality(data.municipality || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    // Fetch auto-fetch status
    fetch('/api/autofetch/status')
      .then((res) => res.json())
      .then((data) => setAutofetchStatus(data))
      .catch((err) => console.error('[autofetch status]', err));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          property_type: propertyType,
          account_number: accountNumber,
          municipality,
        }),
      });

      if (res.ok) {
        setMessage({ text: 'Profile updated successfully', type: 'success' });
      } else {
        const error = await res.json();
        setMessage({ text: error.error || 'Failed to update profile', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error saving profile', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleAddPayment = async () => {
    try {
      const res = await fetch('/api/payfast/tokenise', { method: 'POST' });
      const data = await res.json();
      if (data.action && data.fields) {
        // PayFast requires HTML form POST — GET redirects are blocked by CloudFront
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.action;
        for (const [key, value] of Object.entries(data.fields)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        setMessage({ text: data.error || 'Failed to initialize payment gateway.', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to get tokenise form data', err);
      setMessage({ text: 'Network error initializing payment gateway.', type: 'error' });
    }
  };

  const handleRemoveCard = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payfast_token: null }),
      });
      if (res.ok) {
        setProfile({ ...profile, payfast_token: null });
        setMessage({ text: 'Card removed successfully', type: 'success' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleNotification = async (field: 'case_updates' | 'marketing_emails', value: boolean) => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setProfile({ ...profile, [field]: value });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMandateToggle = async () => {
    setMandateBusy(true);
    setMessage(null);
    try {
      const isRevoked = !!profile?.mandate_revoked_at;
      const method = isRevoked ? 'POST' : 'DELETE';
      const res = await fetch('/api/user/mandate', { method });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ text: data.error || 'Failed to update mandate.', type: 'error' });
        setMandateBusy(false);
        return;
      }
      // Refetch profile so the UI reflects the new state
      const refreshed = await fetch('/api/user/profile').then((r) => r.json());
      setProfile(refreshed);
      setMessage({
        text: isRevoked ? 'Mandate re-granted.' : 'Mandate revoked. Confirmation sent by email.',
        type: 'success',
      });
      setShowMandateConfirm(false);
    } catch {
      setMessage({ text: 'Network error updating mandate.', type: 'error' });
    } finally {
      setMandateBusy(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      if (res.ok) {
        router.push('/');
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ text: data.error || 'Failed to delete account.', type: 'error' });
        setDeleting(false);
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 text-orange border-4 border-t-orange border-slate-200 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bebas text-navy mb-8 tracking-wide">My Account</h1>

        {message && (
          <div className={`mb-6 p-4 rounded-lg font-medium text-sm ${message.type === 'success' ? 'bg-green-100 text-success' : 'bg-red-100 text-error'}`}>
            {message.text}
          </div>
        )}

        {/* AUTO-FETCH STATUS SECTION */}
        <section className="bg-white rounded-2xl border border-light-grey shadow-sm p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-navy">Auto-Fetch</h2>
            {!autofetchStatus?.credential && (
              <Link
                href="/onboarding/auto-fetch"
                className="text-sm font-bold text-orange hover:text-orange-light transition-colors"
              >
                Connect Municipality →
              </Link>
            )}
          </div>

          {autofetchStatus?.credential ? (
            <div className="space-y-4">
              {/* Connected municipality */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    autofetchStatus.credential.status === 'success' ? 'bg-success/10 text-success' :
                    autofetchStatus.credential.status === 'failed' ? 'bg-error/10 text-error' :
                    'bg-orange/10 text-orange'
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {autofetchStatus.credential.status === 'success' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : autofetchStatus.credential.status === 'failed' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-navy">{autofetchStatus.credential.municipality_name || 'Connected'}</p>
                    <p className="text-sm text-slate-500">
                      {autofetchStatus.credential.status === 'success' && autofetchStatus.credential.last_fetch_at
                        ? `Last fetched: ${new Date(autofetchStatus.credential.last_fetch_at).toLocaleDateString('en-ZA')}`
                        : autofetchStatus.credential.status === 'failed'
                        ? `Error: ${autofetchStatus.credential.last_fetch_error || 'Unknown'}`
                        : 'Pending first fetch'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    setRevokingCreds(true);
                    try {
                      const res = await fetch(`/api/autofetch/credentials/${autofetchStatus.credential.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        setAutofetchStatus({ ...autofetchStatus, credential: null });
                        setMessage({ text: 'Municipal credentials revoked. No further bills will be fetched.', type: 'success' });
                      } else {
                        setMessage({ text: 'Failed to revoke credentials.', type: 'error' });
                      }
                    } catch {
                      setMessage({ text: 'Network error revoking credentials.', type: 'error' });
                    } finally {
                      setRevokingCreds(false);
                      setTimeout(() => setMessage(null), 4000);
                    }
                  }}
                  variant="outline-dark"
                  className="text-error border-error/30 hover:bg-error hover:text-white hover:border-error"
                  disabled={revokingCreds}
                >
                  {revokingCreds ? 'Revoking...' : 'Revoke'}
                </Button>
              </div>

              {/* Latest bill summary */}
              {autofetchStatus.latest_case && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-navy">Latest Analysis</p>
                    <Link
                      href={`/analysis/${autofetchStatus.latest_case.id}`}
                      className="text-sm text-orange hover:underline"
                    >
                      View full report →
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Period</p>
                      <p className="font-bold text-navy text-sm">{autofetchStatus.latest_case.bill_period || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Billed</p>
                      <p className="font-bold text-navy text-sm">R{Number(autofetchStatus.latest_case.total_billed || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Recoverable</p>
                      <p className={`font-bold text-sm ${Number(autofetchStatus.latest_case.recoverable) > 0 ? 'text-success' : 'text-navy'}`}>
                        R{Number(autofetchStatus.latest_case.recoverable || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent bills list */}
              {autofetchStatus.recent_bills?.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Bills</p>
                  <div className="space-y-2">
                    {autofetchStatus.recent_bills.map((bill: { id: string; bill_period: string; status: string; created_at: string }) => (
                      <div key={bill.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-sm font-medium text-navy">{bill.bill_period || 'Unknown period'}</span>
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                          bill.status === 'analysed' ? 'bg-success/10 text-success' :
                          bill.status === 'failed' ? 'bg-error/10 text-error' :
                          'bg-orange/10 text-orange'
                        }`}>
                          {bill.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">No municipality connected yet.</p>
              <Link
                href="/onboarding/auto-fetch"
                className="inline-block min-h-[44px] px-8 py-3 bg-orange text-white font-bold rounded-md hover:bg-orange-light hover:-translate-y-0.5 transition-all duration-200"
              >
                Connect Your Municipality
              </Link>
            </div>
          )}
        </section>

        {/* PROFILE SECTION */}
        <section className="bg-white rounded-2xl border border-light-grey shadow-sm p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-navy mb-6">Personal details</h2>
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 focus:text-navy transition-colors">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-navy focus:bg-white focus:border-orange focus:ring-0 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 focus:text-navy transition-colors">Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-navy focus:bg-white focus:border-orange focus:ring-0 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 focus:text-navy transition-colors">Default Property Type</label>
                <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-navy focus:bg-white focus:border-orange focus:ring-0 transition-all outline-none">
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 focus:text-navy transition-colors">Default Account Number</label>
                <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-navy focus:bg-white focus:border-orange focus:ring-0 transition-all outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 focus:text-navy transition-colors">Default Municipality</label>
                <input type="text" value={municipality} onChange={(e) => setMunicipality(e.target.value)} className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-navy focus:bg-white focus:border-orange focus:ring-0 transition-all outline-none" />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </section>

        {/* PAYMENT SECTION */}
        <section className="bg-white rounded-2xl border border-light-grey shadow-sm p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-navy mb-6">Payment Method</h2>
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${profile?.payfast_token ? 'bg-success/10 text-success' : 'bg-slate-200 text-slate-400'}`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {profile?.payfast_token ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  )}
                </svg>
              </div>
              <div>
                <p className="font-bold text-navy">{profile?.payfast_token ? 'Card Saved ✓' : 'No card on file'}</p>
                <p className="text-sm text-slate-500">We securely tokenise your card for success fees.</p>
              </div>
            </div>
            {profile?.payfast_token ? (
              <Button onClick={handleRemoveCard} variant="outline-dark" className="text-error border-error/30 hover:bg-error hover:text-white hover:border-error">
                Remove Card
              </Button>
            ) : (
              <Button onClick={handleAddPayment} variant="primary">
                Add Payment Method
              </Button>
            )}
          </div>
        </section>

        {/* NOTIFICATIONS SECTION */}
        <section className="bg-white rounded-2xl border border-light-grey shadow-sm p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-navy mb-6">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-navy">Case Updates</p>
                <p className="text-sm text-slate-500">Get notified when your dispute statuses change.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={profile?.case_updates ?? true} onChange={(e) => handleToggleNotification('case_updates', e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-navy">Marketing Emails</p>
                <p className="text-sm text-slate-500">Receive tips and news on fighting municipal bills.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={profile?.marketing_emails ?? false} onChange={(e) => handleToggleNotification('marketing_emails', e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange"></div>
              </label>
            </div>
          </div>
        </section>

        {/* MANDATE SECTION */}
        <section className="bg-white rounded-2xl border border-light-grey shadow-sm p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-navy mb-6">Mandate to Act</h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="font-bold text-navy">
                {profile?.mandate_revoked_at ? 'Mandate revoked' : 'Active'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Authorises Billdog to lodge disputes on your behalf. Revoking stops all active disputes.
              </p>
            </div>
            <Button
              onClick={() => setShowMandateConfirm(true)}
              variant="outline-dark"
              className={profile?.mandate_revoked_at ? '' : 'text-error border-error/30 hover:bg-error hover:text-white hover:border-error'}
            >
              {profile?.mandate_revoked_at ? 'Re-grant mandate' : 'Revoke mandate'}
            </Button>
          </div>

          {showMandateConfirm && (
            <div className="mt-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-navy mb-2">
                {profile?.mandate_revoked_at ? 'Re-grant your mandate?' : 'Revoke your mandate?'}
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                {profile?.mandate_revoked_at
                  ? 'This re-authorises Billdog to act on your behalf in municipal billing disputes.'
                  : 'This stops all active disputes from advancing further. You will receive an email confirming the revocation. You can re-grant at any time.'}
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={handleMandateToggle}
                  disabled={mandateBusy}
                  variant="primary"
                  className={profile?.mandate_revoked_at ? '' : 'bg-error hover:bg-red-600'}
                >
                  {mandateBusy ? 'Saving…' : (profile?.mandate_revoked_at ? 'Yes, Re-grant' : 'Yes, Revoke')}
                </Button>
                <Button onClick={() => setShowMandateConfirm(false)} variant="outline-dark" disabled={mandateBusy}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* DANGER ZONE */}
        <section className="bg-red-50 rounded-2xl border border-red-200 shadow-sm p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-error mb-2">Danger Zone</h2>
          <p className="text-sm text-red-900/70 mb-6">Permanently delete your account and all associated billing data per POPIA guidelines.</p>
          
          {showDeleteConfirm ? (
            <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm">
              <h3 className="font-bold text-navy mb-2">Are you fully sure?</h3>
              <p className="text-sm text-slate-600 mb-6">This will permanently delete your account, case history, and remove all files from our servers. This action is irreversible.</p>
              <div className="flex gap-4">
                <Button onClick={handleDeleteAccount} disabled={deleting} variant="primary" className="bg-error hover:bg-red-600">
                  {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </Button>
                <Button onClick={() => setShowDeleteConfirm(false)} variant="outline-dark" disabled={deleting}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowDeleteConfirm(true)} variant="outline-dark" className="text-error border-error/30 bg-white hover:bg-error hover:text-white hover:border-error">
              Delete My Account
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
