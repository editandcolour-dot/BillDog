'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll reveal hook — triggers visibility when element enters viewport.
 * Uses IntersectionObserver for performance. Fires once and disconnects.
 */
export function useScrollReveal<T extends HTMLElement>(
  threshold = 0.1,
): { ref: React.RefObject<T | null>; isVisible: boolean } {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
