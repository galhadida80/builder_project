import { renderHook, act } from '@testing-library/react'
import { usePullToRefresh, PullToRefreshEvent } from '../usePullToRefresh'

/**
 * Helper function to create a mock touch event
 */
function createTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  y: number,
  timestamp: number = Date.now()
): React.TouchEvent {
  const touch = {
    clientX: 100,
    clientY: y,
    identifier: 0,
    pageX: 100,
    pageY: y,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    screenX: 100,
    screenY: y,
    target: document.body,
    force: 1,
  } as Touch

  return {
    touches: [touch],
    targetTouches: [touch],
    changedTouches: [touch],
    type,
    bubbles: true,
    cancelable: true,
    timeStamp: timestamp,
    currentTarget: {
      scrollTop: 0,
    } as any,
  } as unknown as React.TouchEvent
}

describe('usePullToRefresh', () => {
  describe('basic pull-to-refresh detection', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePullToRefresh())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.progress).toBe(0)
      expect(typeof result.current.onTouchStart).toBe('function')
      expect(typeof result.current.onTouchMove).toBe('function')
      expect(typeof result.current.onTouchEnd).toBe('function')
    })

    it('should track touch start position', () => {
      const { result } = renderHook(() => usePullToRefresh())

      const startEvent = createTouchEvent('touchstart', 100)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      // Should not throw and should initialize tracking
      expect(result.current.isLoading).toBe(false)
    })

    it('should calculate progress during pull', () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onProgress,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 140)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      expect(result.current.progress).toBeGreaterThan(0)
      expect(onProgress).toHaveBeenCalled()
    })

    it('should trigger refresh when threshold is met', async () => {
      const onRefresh = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 185) // 85px pull
      const endEvent = createTouchEvent('touchend', 185)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      expect(result.current.isLoading).toBe(false)

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(result.current.isLoading).toBe(true)
      expect(onRefresh).toHaveBeenCalled()
    })
  })

  describe('threshold detection', () => {
    it('should not trigger refresh below threshold', () => {
      const onRefresh = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 170) // 70px pull
      const endEvent = createTouchEvent('touchend', 170)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(onRefresh).not.toHaveBeenCalled()
      expect(result.current.isLoading).toBe(false)
    })

    it('should trigger refresh at or above threshold', () => {
      const onRefresh = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 180) // exactly 80px pull
      const endEvent = createTouchEvent('touchend', 180)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(onRefresh).toHaveBeenCalled()
    })

    it('should support custom threshold', () => {
      const onRefresh = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 150,
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 185) // 85px, below custom threshold
      const endEvent = createTouchEvent('touchend', 185)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(onRefresh).not.toHaveBeenCalled()
    })
  })

  describe('progress tracking', () => {
    it('should calculate progress as distance / threshold', () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 100,
          onProgress,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 150) // 50px, 0.5 progress

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      expect(result.current.progress).toBe(0.5)
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 0.5,
          distance: 50,
        })
      )
    })

    it('should cap progress at 1.0', () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          maxDistance: 100,
          onProgress,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 200) // 100px pull

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      expect(result.current.progress).toBeLessThanOrEqual(1.0)
    })

    it('should respect maxDistance for visual feedback', () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          maxDistance: 150,
          onProgress,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 300) // 200px pull, but max is 150

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      const call = onProgress.mock.calls[onProgress.mock.calls.length - 1][0]
      expect(call.distance).toBe(150) // capped at maxDistance
    })
  })

  describe('loading state and refresh callback', () => {
    it('should set isLoading to true during refresh', async () => {
      const onRefresh = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 185)
      const endEvent = createTouchEvent('touchend', 185)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(result.current.isLoading).toBe(true)

      // Wait for async refresh to complete
      await new Promise((resolve) => setTimeout(resolve, 150))

      act(() => {
        // Force re-render
      })

      // isLoading should be reset after refresh completes
      expect(result.current.isLoading).toBe(false)
    })

    it('should call onRefresh callback when threshold met', () => {
      const onRefresh = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 185)
      const endEvent = createTouchEvent('touchend', 185)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('should handle async onRefresh callback', async () => {
      const onRefresh = jest.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 100)
          })
      )
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 185)
      const endEvent = createTouchEvent('touchend', 185)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(result.current.isLoading).toBe(true)
      expect(onRefresh).toHaveBeenCalled()

      // Wait for async callback
      await new Promise((resolve) => setTimeout(resolve, 150))

      act(() => {
        // Force re-render
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should reset progress after refresh completes', async () => {
      const onRefresh = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 185)
      const endEvent = createTouchEvent('touchend', 185)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      expect(result.current.progress).toBeGreaterThan(0)

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      act(() => {
        // Force re-render
      })

      expect(result.current.progress).toBe(0)
    })
  })

  describe('preventing simultaneous refreshes', () => {
    it('should not trigger multiple refreshes simultaneously', async () => {
      const onRefresh = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      )
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      // First refresh
      act(() => {
        result.current.onTouchStart(createTouchEvent('touchstart', 100))
      })

      act(() => {
        result.current.onTouchMove(createTouchEvent('touchmove', 185))
      })

      act(() => {
        result.current.onTouchEnd(createTouchEvent('touchend', 185))
      })

      expect(onRefresh).toHaveBeenCalledTimes(1)

      // Try to trigger second refresh while first is in progress
      act(() => {
        result.current.onTouchStart(createTouchEvent('touchstart', 100))
      })

      act(() => {
        result.current.onTouchMove(createTouchEvent('touchmove', 185))
      })

      act(() => {
        result.current.onTouchEnd(createTouchEvent('touchend', 185))
      })

      // Should still only be called once
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('should allow refresh after previous refresh completes', async () => {
      const onRefresh = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      // First refresh
      act(() => {
        result.current.onTouchStart(createTouchEvent('touchstart', 100))
      })

      act(() => {
        result.current.onTouchMove(createTouchEvent('touchmove', 185))
      })

      act(() => {
        result.current.onTouchEnd(createTouchEvent('touchend', 185))
      })

      // Wait for first refresh to complete
      await new Promise((resolve) => setTimeout(resolve, 150))

      act(() => {
        // Force re-render
      })

      // Second refresh
      act(() => {
        result.current.onTouchStart(createTouchEvent('touchstart', 100))
      })

      act(() => {
        result.current.onTouchMove(createTouchEvent('touchmove', 185))
      })

      act(() => {
        result.current.onTouchEnd(createTouchEvent('touchend', 185))
      })

      expect(onRefresh).toHaveBeenCalledTimes(2)
    })
  })

  describe('scroll position validation', () => {
    it('should not trigger pull-to-refresh when not at top of scroll', () => {
      const onRefresh = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      startEvent.currentTarget.scrollTop = 100 // Not at top

      const moveEvent = createTouchEvent('touchmove', 185)
      const endEvent = createTouchEvent('touchend', 185)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(onRefresh).not.toHaveBeenCalled()
    })

    it('should trigger pull-to-refresh when at top of scroll (scrollTop = 0)', () => {
      const onRefresh = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      startEvent.currentTarget.scrollTop = 0 // At top

      const moveEvent = createTouchEvent('touchmove', 185)
      const endEvent = createTouchEvent('touchend', 185)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(onRefresh).toHaveBeenCalled()
    })
  })

  describe('upward movement handling', () => {
    it('should ignore upward movement during pull', () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onProgress,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const upwardEvent = createTouchEvent('touchmove', 80) // Move up from start

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      // Initial move down
      act(() => {
        result.current.onTouchMove(createTouchEvent('touchmove', 140))
      })

      const progressBefore = result.current.progress

      // Move up
      act(() => {
        result.current.onTouchMove(upwardEvent)
      })

      expect(result.current.progress).toBe(0) // Should be reset
    })

    it('should handle negative distance correctly', () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 80,
          onProgress,
        })
      )

      const startEvent = createTouchEvent('touchstart', 200)
      const moveEvent = createTouchEvent('touchmove', 180) // Moved up instead of down

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      // Should not update progress for upward movement
      expect(result.current.progress).toBe(0)
    })
  })

  describe('no touch handling', () => {
    it('should handle no touches gracefully', () => {
      const { result } = renderHook(() => usePullToRefresh())

      const noTouchEvent = {
        touches: [],
        targetTouches: [],
        changedTouches: [],
        type: 'touchstart' as const,
        currentTarget: { scrollTop: 0 },
      } as unknown as React.TouchEvent

      act(() => {
        result.current.onTouchStart(noTouchEvent)
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.progress).toBe(0)
    })
  })

  describe('custom options', () => {
    it('should use default threshold of 80px', () => {
      const onRefresh = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 179) // 79px, below default threshold
      const endEvent = createTouchEvent('touchend', 179)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(onRefresh).not.toHaveBeenCalled()

      // Now test with 80px exactly
      const moveEvent2 = createTouchEvent('touchmove', 180) // 80px, at threshold
      const endEvent2 = createTouchEvent('touchend', 180)

      act(() => {
        result.current.onTouchStart(createTouchEvent('touchstart', 100))
      })

      act(() => {
        result.current.onTouchMove(moveEvent2)
      })

      act(() => {
        result.current.onTouchEnd(endEvent2)
      })

      expect(onRefresh).toHaveBeenCalled()
    })

    it('should use default maxDistance of 150px', () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          onProgress,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 300) // 200px pull, but max is 150

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      const call = onProgress.mock.calls[onProgress.mock.calls.length - 1][0]
      expect(call.distance).toBe(150)
    })
  })

  describe('edge cases', () => {
    it('should handle rapid touch events', () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({
          onProgress,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      // Rapid move events
      for (let i = 110; i <= 200; i += 10) {
        act(() => {
          result.current.onTouchMove(createTouchEvent('touchmove', i))
        })
      }

      expect(result.current.progress).toBeGreaterThan(0)
      expect(onProgress.mock.calls.length).toBeGreaterThan(0)
    })

    it('should handle touch end without touch start', () => {
      const { result } = renderHook(() => usePullToRefresh())

      const endEvent = createTouchEvent('touchend', 200)

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      // Should not crash
      expect(result.current.isLoading).toBe(false)
    })

    it('should reset progress if threshold not met on touch end', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          threshold: 100,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 150) // 50px, below threshold
      const endEvent = createTouchEvent('touchend', 150)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      expect(result.current.progress).toBeGreaterThan(0)

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(result.current.progress).toBe(0)
    })
  })

  describe('debug logging', () => {
    it('should support debug option without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const { result } = renderHook(() =>
        usePullToRefresh({
          debug: true,
          threshold: 80,
        })
      )

      const startEvent = createTouchEvent('touchstart', 100)
      const moveEvent = createTouchEvent('touchmove', 185)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
