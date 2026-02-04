import { forwardRef, ReactElement, Ref } from 'react'
import { Fade } from '@mui/material'

interface PageTransitionProps {
  children: ReactElement
  in?: boolean
}

/**
 * PageTransition component provides smooth fade transitions for page navigation.
 *
 * Uses MUI Fade component with standard animation duration (250ms) and easing.
 * Automatically respects prefers-reduced-motion accessibility setting via global theme.
 *
 * @example
 * ```tsx
 * <TransitionGroup>
 *   <PageTransition key={pathname}>
 *     <div>Page content</div>
 *   </PageTransition>
 * </TransitionGroup>
 * ```
 */
const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ children, in: inProp = true }, ref: Ref<HTMLDivElement>) => {
    // Use 250ms duration for page transitions as per design tokens
    const timeout = 250

    return (
      <Fade
        in={inProp}
        timeout={timeout}
        easing={{
          enter: 'cubic-bezier(0.0, 0.0, 0.2, 1)', // decelerate curve for entrance
          exit: 'cubic-bezier(0.4, 0.0, 1, 1)',     // accelerate curve for exit
        }}
        ref={ref}
      >
        {children}
      </Fade>
    )
  }
)

PageTransition.displayName = 'PageTransition'

export default PageTransition
