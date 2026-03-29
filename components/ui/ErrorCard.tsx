'use client';

import Link from 'next/link';

interface ActionProps {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface ErrorCardProps {
  title: string;
  message: string;
  primaryAction: ActionProps;
  secondaryAction?: ActionProps;
}

export function ErrorCard({
  title,
  message,
  primaryAction,
  secondaryAction,
}: ErrorCardProps) {
  const renderAction = (action: ActionProps, isPrimary: boolean) => {
    const className = isPrimary
      ? 'btn-primary w-full sm:w-auto min-h-[44px] flex items-center justify-center text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-navy'
      : 'btn-outline-dark w-full sm:w-auto min-h-[44px] flex items-center justify-center text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy';

    if (action.href) {
      return (
        <Link href={action.href} className={className}>
          {action.label}
        </Link>
      );
    }

    return (
      <button onClick={action.onClick} className={className}>
        {action.label}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center text-center max-w-md w-full px-4">
      <h1 className="font-display text-4xl sm:text-5xl text-white tracking-wide uppercase">
        {title}
      </h1>
      <p className="mt-4 text-white/70 text-base leading-relaxed">
        {message}
      </p>
      
      <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full justify-center">
        {renderAction(primaryAction, true)}
        {secondaryAction && renderAction(secondaryAction, false)}
      </div>
    </div>
  );
}
