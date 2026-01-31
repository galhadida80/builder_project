import { Fade } from '@mui/material'
import { ReactNode, useMemo } from 'react'
import { transitions } from '../../theme/tokens'

interface PageTransitionProps {
  children: ReactNode
  in?: boolean
  timeout?: number
}

/**
 * PageTransition component wraps page content with a fade transition.
 * Automatically respects user's prefers-reduced-motion preference.
 *
 * @example
 * ```tsx
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 * ```
 */
export function PageTransition({
  children,
  in: inProp = true,
  timeout
}: PageTransitionProps) {
  // Check if user prefers reduced motion
  const prefersReducedMotion = useMemo(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Use 0 duration if reduced motion is preferred, otherwise use provided timeout or default
  const duration = prefersReducedMotion
    ? 0
    : timeout ?? transitions.duration.enteringScreen

  return (
    <Fade
      in={inProp}
      timeout={duration}
      appear
    >
      <div style={{ width: '100%', height: '100%' }}>
        {children}
      </div>
    </Fade>
  )
}
