import { ErrorCard } from '@/components/ui/ErrorCard';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <ErrorCard
        title="404"
        message="This page doesn't exist. Your bill dispute might though."
        primaryAction={{ label: 'Go Home', href: '/' }}
        secondaryAction={{ label: 'Upload Your Bill', href: '/upload' }}
      />
    </div>
  );
}
