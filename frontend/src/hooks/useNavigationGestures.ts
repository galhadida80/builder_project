import { useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSwipeGesture, SwipeDirection, SwipeEvent } from './useSwipeGesture'

/**
 * Options for useNavigationGestures hook
 */
export interface UseNavigationGesturesOptions {
  /** Enable/disable gesture navigation */
  enabled?: boolean
  /** Enable debug logging */
  debug?: boolean
  /** Callback when navigation gesture detected */
  onNavigate?: (direction: 'back' | 'forward') => void
  /** Minimum swipe distance to trigger navigation (px) */
  minDistance?: number
  /** Maximum angle from horizontal (degrees) */
  angleThreshold?: number
  /** Velocity threshold to differentiate flick from drag (px/ms) */
  velocityThreshold?: number
}

/**
 * Gesture-aware navigation hook with RTL support
 *
 * Hook that detects swipe gestures for back/forward navigation.
 * Automatically accounts for RTL layout where directions are reversed.
 * Swipe right = navigate back (LTR) or forward (RTL)
 * Swipe left = navigate forward (LTR) or back (RTL)
 *
 * @param options Configuration options for navigation gestures
 * @returns Object with touch event handlers
 *
 * @example
 * const { onTouchStart, onTouchMove, onTouchEnd } = useNavigationGestures({
 *   enabled: true,
 *   onNavigate: (direction) => console.log('Navigating:', direction),
 * })
 *
 * return (
 *   <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
 *     Swipe to navigate!
 *   </div>
 * )
 */
export function useNavigationGestures(options: UseNavigationGesturesOptions = {}) {
  const {
    enabled = true,
    debug = false,
    onNavigate,
    minDistance = 50,
    angleThreshold = 30,
    velocityThreshold = 0.5,
  } = options

  const navigate = useNavigate()

  // Track if we should process swipes (not during text input, etc.)
  const canNavigateRef = useRef<boolean>(true)

  // Handle swipe gestures for navigation
  const handleSwipe = useCallback(
    (event: SwipeEvent) => {
      if (!enabled || !canNavigateRef.current) return

      // In RTL mode, directions are already reversed by useSwipeGesture
      // So we just need to check the direction returned
      let navigateDirection: 'back' | 'forward' | null = null

      if (event.direction === SwipeDirection.Right) {
        // Swipe right = go back
        navigateDirection = 'back'
      } else if (event.direction === SwipeDirection.Left) {
        // Swipe left = go forward
        navigateDirection = 'forward'
      }

      if (!navigateDirection) return

      if (debug) {
        console.log('[useNavigationGestures] Navigation gesture detected:', {
          direction: navigateDirection,
          swipeDirection: event.direction,
          distance: event.distance,
          velocity: event.velocity,
          isFlick: event.isFlick,
        })
      }

      // Perform navigation
      if (navigateDirection === 'back') {
        navigate(-1)
      } else if (navigateDirection === 'forward') {
        navigate(1)
      }

      onNavigate?.(navigateDirection)
    },
    [enabled, debug, navigate, onNavigate]
  )

  // Detect if we're in an input field or contenteditable element
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'

      canNavigateRef.current = !isInput
    }

    const handleFocusOut = () => {
      canNavigateRef.current = true
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  // Use the swipe gesture hook
  const { onTouchStart, onTouchMove, onTouchEnd, isRTL } = useSwipeGesture({
    onSwipeLeft: handleSwipe,
    onSwipeRight: handleSwipe,
    minDistance,
    angleThreshold,
    velocityThreshold,
    debug,
  })

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isRTL,
    canNavigate: canNavigateRef.current,
  }
}
