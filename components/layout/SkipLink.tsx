/**
 * Skip navigation link — first focusable element in <body>.
 * Only visible when focused via keyboard (sr-only by default).
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:bg-orange focus:text-navy focus:font-bold focus:px-4 focus:py-2 focus:rounded-md"
    >
      Skip to main content
    </a>
  );
}
