import { useRef, useCallback, useState } from 'react'

/**
 * Long press event data
 */
export interface LongPressEvent {
  x: number
  y: number
  duration: number
}

/**
 * Options for useLongPress hook
 */
export interface UseLongPressOptions {
  /** Callback when long press is triggered */
  onLongPress?: (event: LongPressEvent) => void
  /** Duration in milliseconds before long press triggers (default: 500ms) */
  duration?: number
  /** Maximum movement (px) before canceling long press (default: 10px) */
  moveThreshold?: number
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
 * Detects long press (hold) gestures on touch elements
 *
 * Hook that detects when a user presses and holds on an element for a specified
 * duration. The long press is cancelled if the user moves more than the threshold
 * or releases before the duration expires.
 *
 * @param options Configuration options for long press detection
 * @returns Object with touch event handlers and state
 *
 * @example
 * const { onTouchStart, onTouchMove, onTouchEnd, isPressed } = useLongPress({
 *   onLongPress: (event) => console.log('Long pressed at:', event.x, event.y),
 *   duration: 500,
 * })
 *
 * return (
 *   <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
 *     Press and hold me!
 *   </div>
 * )
 */
export function useLongPress(options: UseLongPressOptions = {}) {
  const {
    onLongPress,
    duration = 500, // Default 500ms long press duration
    moveThreshold = 10, // Cancel if moved > 10px
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

  // Track timeout ID for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track if long press has been triggered (to prevent multiple triggers)
  const triggeredRef = useRef(false)

  // State to expose whether currently pressed
  const [isPressed, setIsPressed] = useState(false)

  /**
   * Calculate distance between two points
   */
  const calculateDistance = useCallback(
    (startX: number, startY: number, currentX: number, currentY: number): number => {
      const deltaX = currentX - startX
      const deltaY = currentY - startY
      return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    },
    []
  )

  /**
   * Cancel long press and cleanup
   */
  const cancelLongPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    triggeredRef.current = false
    setIsPressed(false)
    if (debug) {
      console.log('[useLongPress] Long press cancelled')
    }
  }, [debug])

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return

      const startX = touch.clientX
      const startY = touch.clientY

      touchStateRef.current = {
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        startTime: Date.now(),
        isTracking: true,
      }

      triggeredRef.current = false
      setIsPressed(true)

      if (debug) {
        console.log('[useLongPress] Touch start:', { x: startX, y: startY })
      }

      // Set up timeout for long press
      timeoutRef.current = setTimeout(() => {
        if (touchStateRef.current.isTracking && !triggeredRef.current) {
          triggeredRef.current = true

          const longPressEvent: LongPressEvent = {
            x: touchStateRef.current.startX,
            y: touchStateRef.current.startY,
            duration: Date.now() - touchStateRef.current.startTime,
          }

          if (debug) {
            console.log('[useLongPress] Long press triggered:', longPressEvent)
          }

          onLongPress?.(longPressEvent)
        }
      }, duration)
    },
    [duration, onLongPress, debug]
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

      const distance = calculateDistance(state.startX, state.startY, state.currentX, state.currentY)

      if (debug) {
        console.log('[useLongPress] Touch move:', {
          distance,
          moveThreshold,
        })
      }

      // Cancel long press if movement exceeds threshold
      if (distance > moveThreshold) {
        if (debug) {
          console.log('[useLongPress] Moved too far, cancelling')
        }
        cancelLongPress()
      }
    },
    [moveThreshold, calculateDistance, cancelLongPress, debug]
  )

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const state = touchStateRef.current
      if (!state.isTracking) return

      state.isTracking = false

      const holdDuration = Date.now() - state.startTime

      if (debug) {
        console.log('[useLongPress] Touch end:', {
          holdDuration,
          triggered: triggeredRef.current,
        })
      }

      cancelLongPress()
    },
    [cancelLongPress, debug]
  )

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isPressed,
  }
}
