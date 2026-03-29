'use client';

import { ErrorCard } from '@/components/ui/ErrorCard';
import { useEffect } from 'react';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <ErrorCard
        title="OOPS"
        message="Something went wrong. Don't worry — your data is safe."
        primaryAction={{
          label: 'Refresh',
          onClick: () => reset(),
        }}
      />
    </div>
  );
}
