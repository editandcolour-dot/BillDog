import Link from 'next/link';

/** Button variant options matching the Billdog design system. */
type ButtonVariant = 'primary' | 'outline-dark' | 'outline-light' | 'disabled';

/** Button size options. */
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
}

interface ButtonAsLink extends ButtonBaseProps {
  href: string;
  onClick?: never;
  disabled?: never;
  type?: never;
}

interface ButtonAsButton extends ButtonBaseProps {
  href?: never;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

type ButtonProps = ButtonAsLink | ButtonAsButton;

/** Size class map. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-5 py-2 text-sm',
  md: 'min-h-[44px] px-7 py-3 text-base',
  lg: 'min-h-[44px] px-9 py-4 text-lg',
};

/** Variant class map. */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: [
    'bg-orange text-white font-bold rounded-md',
    'hover:bg-orange-light hover:-translate-y-0.5',
    'hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)]',
    'active:translate-y-0',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-orange focus-visible:ring-offset-2',
  ].join(' '),
  'outline-dark': [
    'bg-transparent text-white font-bold',
    'border-2 border-white/30 rounded-md',
    'hover:border-white hover:bg-white/[0.08]',
    'hover:-translate-y-0.5',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-white focus-visible:ring-offset-2',
    'focus-visible:ring-offset-navy',
  ].join(' '),
  'outline-light': [
    'bg-transparent text-navy font-bold',
    'border-2 border-light-grey rounded-md',
    'hover:border-navy hover:-translate-y-0.5',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-navy focus-visible:ring-offset-2',
  ].join(' '),
  disabled: [
    'bg-orange text-white font-bold rounded-md',
    'opacity-50 cursor-not-allowed pointer-events-none',
  ].join(' '),
};

/**
 * Billdog Button component.
 * Renders as Next.js <Link> when href is provided, <button> otherwise.
 *
 * @param variant - Visual style: primary, outline-dark, outline-light, disabled
 * @param size - Button size: sm, md, lg
 * @param href - If provided, renders as a link
 * @param onClick - Click handler for button mode
 * @param disabled - Disables the button
 * @param children - Button content
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const resolvedVariant = ('disabled' in rest && rest.disabled)
    ? 'disabled'
    : variant;

  const classes = [
    'inline-flex items-center justify-center',
    SIZE_CLASSES[size],
    VARIANT_CLASSES[resolvedVariant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if ('href' in rest && rest.href) {
    return (
      <Link href={rest.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { onClick, disabled, type = 'button' } = rest as ButtonAsButton;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-disabled={disabled || undefined}
    >
      {children}
    </button>
  );
}
