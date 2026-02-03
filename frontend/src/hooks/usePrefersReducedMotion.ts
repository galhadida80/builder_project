import { useMediaQuery } from '@mui/material';

/**
 * Custom hook to detect if the user prefers reduced motion.
 * This hook respects the user's system preference for reduced motion,
 * which is an important accessibility feature for users with vestibular
 * disorders or motion sensitivity.
 *
 * @returns {boolean} true if the user prefers reduced motion, false otherwise
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = usePrefersReducedMotion();
 * const shouldAnimate = !prefersReducedMotion;
 * const transition = shouldAnimate ? 'all 0.2s ease-in-out' : 'none';
 * ```
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)', {
    noSsr: true,
  });
}
