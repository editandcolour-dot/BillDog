'use client';

import { ErrorCard } from '@/components/ui/ErrorCard';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Audit S-M2 \u2014 don't log the full Error object (stack frames can carry PII
    // from query strings / API payloads). Name + message + digest is enough to
    // correlate with server-side logs.
    console.error('[Error Boundary]', {
      name: error.name,
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <ErrorCard
        title="SOMETHING WENT WRONG"
        message="Something went wrong. Don't worry — your data is safe."
        primaryAction={{
          label: 'Try Again',
          onClick: () => reset(),
        }}
        secondaryAction={{
          label: 'Go Home',
          href: '/',
        }}
      />
    </div>
  );
}
