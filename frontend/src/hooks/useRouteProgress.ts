import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Route progress state
 */
export type RouteProgressState = 'idle' | 'loading' | 'complete'

/**
 * Return value from useRouteProgress hook
 */
export interface UseRouteProgressReturn {
  /** Current progress state */
  state: RouteProgressState
  /** Progress value from 0 to 100 */
  progress: number
  /** Whether navigation is currently in progress */
  isLoading: boolean
}

/**
 * Hook to track route navigation progress
 *
 * Provides visual feedback during route transitions by tracking loading state
 * and simulating progress. The progress bar starts at 0%, increments to 90%
 * over ~300ms, then completes to 100% when the route loads.
 *
 * @returns Object containing state, progress value, and loading status
 *
 * @example
 * ```tsx
 * const { state, progress, isLoading } = useRouteProgress()
 *
 * return (
 *   <div>
 *     {isLoading && <ProgressBar value={progress} />}
 *   </div>
 * )
 * ```
 */
export function useRouteProgress(): UseRouteProgressReturn {
  const location = useLocation()
  const [state, setState] = useState<RouteProgressState>('idle')
  const [progress, setProgress] = useState(0)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousLocationRef = useRef(location.pathname)

  useEffect(() => {
    // Detect route change
    if (location.pathname !== previousLocationRef.current) {
      // Clear any existing timers
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current)
        completeTimerRef.current = null
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }

      // Start loading
      setState('loading')
      setProgress(0)

      // Simulate progress from 0 to 90% over ~300ms
      const startTime = Date.now()
      const duration = 300
      const targetProgress = 90

      progressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const newProgress = Math.min((elapsed / duration) * targetProgress, targetProgress)
        setProgress(newProgress)

        if (newProgress >= targetProgress) {
          if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current)
            progressTimerRef.current = null
          }
        }
      }, 16) // ~60fps

      // Complete the progress after a short delay to ensure route has loaded
      completeTimerRef.current = setTimeout(() => {
        setProgress(100)
        setState('complete')

        // Reset to idle after fade-out animation
        resetTimerRef.current = setTimeout(() => {
          setState('idle')
          setProgress(0)
        }, 200)
      }, 350)

      previousLocationRef.current = location.pathname
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
      }
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current)
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
    }
  }, [location.pathname])

  return {
    state,
    progress,
    isLoading: state === 'loading',
  }
}
