'use client';

import { ErrorCard } from '@/components/ui/ErrorCard';
import { useEffect } from 'react';

export default function AppError({
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
        title="SOMETHING WENT WRONG"
        message="Something went wrong. Don't worry — your data is safe."
        primaryAction={{
          label: 'Try Again',
          onClick: () => reset(),
        }}
        secondaryAction={{
          label: 'Go to Dashboard',
          href: '/dashboard',
        }}
      />
    </div>
  );
}
