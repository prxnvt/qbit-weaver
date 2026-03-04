import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Detects true mobile devices by requiring BOTH:
 * 1. Viewport width < 768px
 * 2. Touch-capable device (coarse pointer or touchstart support)
 *
 * This prevents desktop browsers with narrow windows or DevTools
 * device toolbar from triggering mobile mode.
 *
 * Initializes as `false` (desktop) and only switches to `true`
 * after the effect confirms both conditions — no flash on desktop.
 */
export function useIsMobile(): boolean {
  // Always start as desktop to avoid flash / layout shift
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check touch capability — true on phones/tablets, false on desktop
    const hasTouchCapability =
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;

    if (!hasTouchCapability) {
      // Desktop device — never enable mobile mode regardless of window size
      setIsMobile(false);
      return;
    }

    // Touch-capable device: gate on viewport width
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const update = () => setIsMobile(mql.matches);
    update(); // Set initial value

    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return isMobile;
}
