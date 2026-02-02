import { useRef, useCallback, useState, useEffect } from 'react'

/**
 * Pull-to-refresh event data
 */
export interface PullToRefreshEvent {
  distance: number
  progress: number
}

/**
 * Options for usePullToRefresh hook
 */
export interface UsePullToRefreshOptions {
  /** Callback when pull-to-refresh is triggered */
  onRefresh?: () => void | Promise<void>
  /** Distance threshold (px) to trigger refresh (default: 80px) */
  threshold?: number
  /** Maximum pull distance before stopping visual feedback (default: 150px) */
  maxDistance?: number
  /** Callback for progress updates during pull */
  onProgress?: (event: PullToRefreshEvent) => void
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Internal touch tracking state
 */
interface TouchState {
  startY: number
  currentY: number
  startTime: number
  isTracking: boolean
}

/**
 * Detects pull-to-refresh gestures from top of container
 *
 * Hook that detects when a user pulls down from the top of a scrollable container.
 * Prevents simultaneous refreshes and provides visual feedback via progress callback.
 *
 * @param options Configuration options for pull-to-refresh detection
 * @returns Object with touch event handlers and loading state
 *
 * @example
 * const { onTouchStart, onTouchMove, onTouchEnd, isLoading, progress } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await fetchData()
 *   },
 *   threshold: 80,
 * })
 *
 * return (
 *   <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
 *     {isLoading && <Spinner />}
 *     <List />
 *   </div>
 * )
 */
export function usePullToRefresh(options: UsePullToRefreshOptions = {}) {
  const {
    onRefresh,
    threshold = 80, // Default 80px threshold for refresh
    maxDistance = 150, // Max pull distance before stopping visual feedback
    onProgress,
    debug = false,
  } = options

  // Track touch state
  const touchStateRef = useRef<TouchState>({
    startY: 0,
    currentY: 0,
    startTime: 0,
    isTracking: false,
  })

  // Track if we can pull (only from top of scrollable container)
  const scrollPositionRef = useRef(0)

  // Track if refresh is in progress (prevent simultaneous refreshes)
  const isRefreshingRef = useRef(false)

  // State for loading and progress
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return

      // Get scroll position of parent container
      const target = e.currentTarget as HTMLElement
      scrollPositionRef.current = target.scrollTop || 0

      // Only allow pull-to-refresh from top of container
      if (scrollPositionRef.current > 0) {
        if (debug) {
          console.log('[usePullToRefresh] Not at top, ignoring:', {
            scrollTop: scrollPositionRef.current,
          })
        }
        return
      }

      touchStateRef.current = {
        startY: touch.clientY,
        currentY: touch.clientY,
        startTime: Date.now(),
        isTracking: true,
      }

      if (debug) {
        console.log('[usePullToRefresh] Touch start:', {
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
      const state = touchStateRef.current

      if (!touch || !state.isTracking || isRefreshingRef.current) return

      state.currentY = touch.clientY
      const distance = state.currentY - state.startY

      // Only track downward movement (positive distance)
      if (distance <= 0) {
        if (debug && distance < -10) {
          console.log('[usePullToRefresh] Upward movement detected, resetting')
        }
        return
      }

      // Cap at max distance for visual feedback
      const cappedDistance = Math.min(distance, maxDistance)
      const currentProgress = Math.min(cappedDistance / threshold, 1.0)

      setProgress(currentProgress)

      if (debug) {
        console.log('[usePullToRefresh] Touch move:', {
          distance,
          cappedDistance,
          progress: currentProgress,
          threshold,
        })
      }

      onProgress?.({
        distance: cappedDistance,
        progress: currentProgress,
      })
    },
    [threshold, maxDistance, onProgress, debug]
  )

  /**
   * Handle touch end and trigger refresh if threshold met
   */
  const handleTouchEnd = useCallback(
    async (e: React.TouchEvent) => {
      const state = touchStateRef.current
      if (!state.isTracking || isRefreshingRef.current) return

      state.isTracking = false

      const distance = state.currentY - state.startY

      if (debug) {
        console.log('[usePullToRefresh] Touch end:', {
          distance,
          threshold,
          triggered: distance >= threshold,
        })
      }

      // Check if pull distance meets threshold
      if (distance >= threshold) {
        // Set loading state and prevent simultaneous refreshes
        isRefreshingRef.current = true
        setIsLoading(true)

        if (debug) {
          console.log('[usePullToRefresh] Refresh triggered')
        }

        try {
          // Call refresh callback
          if (onRefresh) {
            await onRefresh()
          }
        } catch (error) {
          if (debug) {
            console.error('[usePullToRefresh] Refresh error:', error)
          }
        } finally {
          // Reset state
          isRefreshingRef.current = false
          setIsLoading(false)
          setProgress(0)

          if (debug) {
            console.log('[usePullToRefresh] Refresh completed')
          }
        }
      } else {
        // Reset progress if threshold not met
        setProgress(0)
      }
    },
    [threshold, onRefresh, debug]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset state on unmount
      isRefreshingRef.current = false
      setIsLoading(false)
      setProgress(0)
    }
  }, [])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isLoading,
    progress,
  }
}
