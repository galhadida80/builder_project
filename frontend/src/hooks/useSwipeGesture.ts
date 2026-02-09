import { useRef, useCallback, useEffect, useState } from 'react'

/**
 * Swipe direction enumeration
 */
export enum SwipeDirection {
  Left = 'left',
  Right = 'right',
  None = 'none',
}

/**
 * Swipe gesture event data
 */
export interface SwipeEvent {
  direction: SwipeDirection
  distance: number
  velocity: number
  isFlick: boolean
}

/**
 * Options for useSwipeGesture hook
 */
export interface UseSwipeGestureOptions {
  /** Callback when swiped left */
  onSwipeLeft?: (event: SwipeEvent) => void
  /** Callback when swiped right */
  onSwipeRight?: (event: SwipeEvent) => void
  /** Generic swipe callback */
  onSwipe?: (event: SwipeEvent) => void
  /** Minimum distance (px) to register as swipe */
  minDistance?: number
  /** Maximum angle (degrees) from horizontal to count as swipe (ignores > 30°) */
  angleThreshold?: number
  /** Velocity threshold (px/ms) to differentiate flick from drag */
  velocityThreshold?: number
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Internal touch tracking state
 */
interface TouchState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  startTime: number
  isTracking: boolean
}

/**
 * Detects swipe gestures with RTL awareness
 *
 * Hook that detects horizontal swipe gestures and differentiates between
 * slow drags and fast flicks. Automatically accounts for RTL layout.
 *
 * @param options Configuration options for swipe detection
 * @returns Object with touch event handlers
 *
 * @example
 * const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
 *   onSwipeLeft: (event) => console.log('Swiped left:', event),
 *   onSwipeRight: (event) => console.log('Swiped right:', event),
 * })
 *
 * return (
 *   <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
 *     Swipe me!
 *   </div>
 * )
 */
export function useSwipeGesture(options: UseSwipeGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipe,
    minDistance = 50, // Minimum 50px swipe distance
    angleThreshold = 30, // Ignore swipes > 30° from horizontal
    velocityThreshold = 0.5, // Flick if velocity > 0.5 px/ms
    debug = false,
  } = options

  // Track touch state
  const touchStateRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    isTracking: false,
  })

  // Track if we're in a vertical scroll (to ignore as swipe)
  const isVerticalScrollRef = useRef<boolean>(false)

  // State to track RTL mode
  const [isRTL, setIsRTL] = useState(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.dir === 'rtl' ||
           document.documentElement.lang?.startsWith('ar') ||
           document.documentElement.lang?.startsWith('he')
  })

  // Update RTL state when direction changes
  useEffect(() => {
    const checkRTL = () => {
      const rtl = document.documentElement.dir === 'rtl' ||
                  document.documentElement.lang?.startsWith('ar') ||
                  document.documentElement.lang?.startsWith('he')
      setIsRTL(rtl)
    }

    // Check on mount
    checkRTL()

    // Listen for changes to dir attribute (in case language changes dynamically)
    const observer = new MutationObserver(checkRTL)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir', 'lang'],
    })

    return () => observer.disconnect()
  }, [])

  /**
   * Calculate angle between touch start and current position
   * 0° = horizontal right, 90° = vertical down
   */
  const calculateAngle = useCallback(
    (startX: number, startY: number, currentX: number, currentY: number): number => {
      const deltaX = currentX - startX
      const deltaY = currentY - startY
      const radians = Math.atan2(Math.abs(deltaY), Math.abs(deltaX))
      return (radians * 180) / Math.PI
    },
    []
  )

  /**
   * Calculate velocity (px/ms)
   */
  const calculateVelocity = useCallback(
    (distance: number, time: number): number => {
      return time > 0 ? distance / time : 0
    },
    []
  )

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return

      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now(),
        isTracking: true,
      }

      isVerticalScrollRef.current = false

      if (debug) {
        console.log('[useSwipeGesture] Touch start:', {
          x: touch.clientX,
          y: touch.clientY,
        })
      }
    },
    [debug]
  )

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      if (!touch || !touchStateRef.current.isTracking) return

      const state = touchStateRef.current
      state.currentX = touch.clientX
      state.currentY = touch.clientY

      const deltaX = state.currentX - state.startX
      const deltaY = state.currentY - state.startY
      const angle = calculateAngle(state.startX, state.startY, state.currentX, state.currentY)

      // Detect if this is a vertical scroll (angle > threshold)
      if (Math.abs(deltaY) > Math.abs(deltaX) && angle > angleThreshold) {
        isVerticalScrollRef.current = true
      }

      if (debug) {
        console.log('[useSwipeGesture] Touch move:', {
          deltaX,
          deltaY,
          angle,
          isVerticalScroll: isVerticalScrollRef.current,
        })
      }
    },
    [calculateAngle, angleThreshold, debug]
  )

  /**
   * Handle touch end and detect swipe
   */
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const state = touchStateRef.current
      if (!state.isTracking) return

      state.isTracking = false

      // Ignore vertical scrolls
      if (isVerticalScrollRef.current) {
        if (debug) console.log('[useSwipeGesture] Ignoring vertical scroll')
        return
      }

      const deltaX = state.currentX - state.startX
      const deltaY = state.currentY - state.startY
      const distance = Math.abs(deltaX)
      const time = Date.now() - state.startTime

      // Check if swipe distance meets minimum threshold
      if (distance < minDistance) {
        if (debug) {
          console.log('[useSwipeGesture] Distance too small:', {
            distance,
            minDistance,
          })
        }
        return
      }

      // Calculate angle to ensure horizontal swipe
      const angle = calculateAngle(state.startX, state.startY, state.currentX, state.currentY)

      // Ignore swipes with angle > threshold (too vertical)
      if (angle > angleThreshold) {
        if (debug) {
          console.log('[useSwipeGesture] Angle too steep:', {
            angle,
            angleThreshold,
          })
        }
        return
      }

      // Calculate velocity
      const velocity = calculateVelocity(distance, time)
      const isFlick = velocity > velocityThreshold

      // Determine direction (accounting for RTL)
      let direction = SwipeDirection.None
      if (deltaX > 0) {
        direction = isRTL ? SwipeDirection.Left : SwipeDirection.Right
      } else if (deltaX < 0) {
        direction = isRTL ? SwipeDirection.Right : SwipeDirection.Left
      }

      const swipeEvent: SwipeEvent = {
        direction,
        distance,
        velocity,
        isFlick,
      }

      if (debug) {
        console.log('[useSwipeGesture] Swipe detected:', {
          ...swipeEvent,
          time,
          isRTL,
        })
      }

      // Trigger callbacks
      onSwipe?.(swipeEvent)

      if (direction === SwipeDirection.Left) {
        onSwipeLeft?.(swipeEvent)
      } else if (direction === SwipeDirection.Right) {
        onSwipeRight?.(swipeEvent)
      }
    },
    [
      minDistance,
      angleThreshold,
      velocityThreshold,
      calculateAngle,
      calculateVelocity,
      isRTL,
      onSwipe,
      onSwipeLeft,
      onSwipeRight,
      debug,
    ]
  )

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isRTL,
  }
}
