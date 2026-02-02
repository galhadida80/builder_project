import { renderHook, act } from '@testing-library/react'
import { useSwipeGesture, SwipeDirection, SwipeEvent } from '../useSwipeGesture'

/**
 * Helper function to create a mock touch event
 */
function createTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  x: number,
  y: number,
  timestamp: number = Date.now()
): React.TouchEvent {
  const touch = {
    clientX: x,
    clientY: y,
    identifier: 0,
    pageX: x,
    pageY: y,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    screenX: x,
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
  } as unknown as React.TouchEvent
}

describe('useSwipeGesture', () => {
  describe('basic swipe detection', () => {
    it('should detect a right swipe in LTR mode', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight })
      )

      // Mock LTR mode
      Object.defineProperty(document.documentElement, 'dir', {
        value: '',
        writable: true,
      })

      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 150, 200)
      const endEvent = createTouchEvent('touchend', 160, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: SwipeDirection.Right,
          distance: 60,
          isFlick: false,
        })
      )
    })

    it('should detect a left swipe in LTR mode', () => {
      const onSwipeLeft = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeLeft })
      )

      const startEvent = createTouchEvent('touchstart', 200, 200)
      const moveEvent = createTouchEvent('touchmove', 150, 200)
      const endEvent = createTouchEvent('touchend', 140, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeLeft).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: SwipeDirection.Left,
          distance: 60,
          isFlick: false,
        })
      )
    })

    it('should reverse directions in RTL mode', () => {
      const onSwipeLeft = jest.fn()
      const onSwipeRight = jest.fn()
      const { result, rerender } = renderHook(
        () => useSwipeGesture({ onSwipeLeft, onSwipeRight }),
        {
          initialProps: undefined,
        }
      )

      // Set RTL mode
      Object.defineProperty(document.documentElement, 'dir', {
        value: 'rtl',
        writable: true,
      })

      // Trigger a physical right swipe, which should be interpreted as left in RTL
      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 150, 200)
      const endEvent = createTouchEvent('touchend', 160, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
      })

      // Force re-render to pick up RTL change
      rerender()

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      // In RTL, rightward movement should be detected as leftward swipe
      expect(onSwipeLeft).toHaveBeenCalled()
    })
  })

  describe('velocity calculation', () => {
    it('should detect a fast flick', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, velocityThreshold: 0.5 })
      )

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      const moveEvent = createTouchEvent('touchmove', 120, 200, now + 50)
      const endEvent = createTouchEvent('touchend', 160, 200, now + 100) // 60px in 100ms = 0.6 px/ms

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).toHaveBeenCalledWith(
        expect.objectContaining({
          isFlick: true,
          velocity: expect.any(Number),
        })
      )
    })

    it('should not detect a slow drag as a flick', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, velocityThreshold: 0.5 })
      )

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      const moveEvent = createTouchEvent('touchmove', 120, 200, now + 500)
      const endEvent = createTouchEvent('touchend', 160, 200, now + 1000) // 60px in 1000ms = 0.06 px/ms

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).toHaveBeenCalledWith(
        expect.objectContaining({
          isFlick: false,
          velocity: expect.any(Number),
        })
      )
    })
  })

  describe('angle threshold', () => {
    it('should ignore swipes with angle > threshold (vertical)', () => {
      const onSwipeRight = jest.fn()
      const onSwipeLeft = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, onSwipeLeft, angleThreshold: 30 })
      )

      // Mostly vertical movement (70° angle)
      const startEvent = createTouchEvent('touchstart', 100, 100)
      const moveEvent = createTouchEvent('touchmove', 110, 150)
      const endEvent = createTouchEvent('touchend', 115, 200) // More vertical than horizontal

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      // Should not trigger swipe callback due to angle
      expect(onSwipeRight).not.toHaveBeenCalled()
      expect(onSwipeLeft).not.toHaveBeenCalled()
    })

    it('should allow swipes with angle < threshold (horizontal)', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, angleThreshold: 30 })
      )

      // Mostly horizontal movement (~15° angle)
      const startEvent = createTouchEvent('touchstart', 100, 100)
      const moveEvent = createTouchEvent('touchmove', 150, 110)
      const endEvent = createTouchEvent('touchend', 160, 115)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: SwipeDirection.Right,
        })
      )
    })
  })

  describe('minimum distance threshold', () => {
    it('should ignore swipes below minDistance', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, minDistance: 50 })
      )

      // Only 30px movement - below 50px threshold
      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 115, 200)
      const endEvent = createTouchEvent('touchend', 130, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).not.toHaveBeenCalled()
    })

    it('should detect swipes at exactly minDistance', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, minDistance: 50 })
      )

      // Exactly 50px movement
      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 125, 200)
      const endEvent = createTouchEvent('touchend', 150, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).toHaveBeenCalledWith(
        expect.objectContaining({
          distance: 50,
        })
      )
    })

    it('should detect swipes above minDistance', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, minDistance: 50 })
      )

      // 80px movement - above threshold
      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 140, 200)
      const endEvent = createTouchEvent('touchend', 180, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).toHaveBeenCalledWith(
        expect.objectContaining({
          distance: 80,
        })
      )
    })
  })

  describe('callbacks', () => {
    it('should trigger onSwipe callback for any swipe', () => {
      const onSwipe = jest.fn()
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }))

      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 150, 200)
      const endEvent = createTouchEvent('touchend', 160, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipe).toHaveBeenCalled()
    })

    it('should trigger both onSwipe and directional callbacks', () => {
      const onSwipe = jest.fn()
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe, onSwipeRight })
      )

      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 150, 200)
      const endEvent = createTouchEvent('touchend', 160, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipe).toHaveBeenCalled()
      expect(onSwipeRight).toHaveBeenCalled()
    })

    it('should pass correct SwipeEvent data', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() => useSwipeGesture({ onSwipeRight }))

      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 120, 200)
      const endEvent = createTouchEvent('touchend', 170, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: SwipeDirection.Right,
          distance: expect.any(Number),
          velocity: expect.any(Number),
          isFlick: expect.any(Boolean),
        })
      )
    })
  })

  describe('edge cases', () => {
    it('should handle touch event with no touches', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() => useSwipeGesture({ onSwipeRight }))

      const noTouchEvent = {
        touches: [],
        targetTouches: [],
        changedTouches: [],
        type: 'touchstart',
        bubbles: true,
        cancelable: true,
        timeStamp: Date.now(),
      } as unknown as React.TouchEvent

      expect(() => {
        act(() => {
          result.current.onTouchStart(noTouchEvent)
        })
      }).not.toThrow()

      expect(onSwipeRight).not.toHaveBeenCalled()
    })

    it('should handle touch end without prior touch start', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() => useSwipeGesture({ onSwipeRight }))

      const endEvent = createTouchEvent('touchend', 160, 200)

      expect(() => {
        act(() => {
          result.current.onTouchEnd(endEvent)
        })
      }).not.toThrow()

      expect(onSwipeRight).not.toHaveBeenCalled()
    })

    it('should reset tracking state after swipe', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() => useSwipeGesture({ onSwipeRight }))

      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 150, 200)
      const endEvent = createTouchEvent('touchend', 160, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      const callCount = onSwipeRight.mock.calls.length

      // Try another swipe
      const startEvent2 = createTouchEvent('touchstart', 100, 200)
      const moveEvent2 = createTouchEvent('touchmove', 150, 200)
      const endEvent2 = createTouchEvent('touchend', 160, 200)

      act(() => {
        result.current.onTouchStart(startEvent2)
        result.current.onTouchMove(moveEvent2)
        result.current.onTouchEnd(endEvent2)
      })

      // Should have been called again
      expect(onSwipeRight.mock.calls.length).toBe(callCount + 1)
    })

    it('should ignore touch move without tracking', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() => useSwipeGesture({ onSwipeRight }))

      // Try touch move without starting
      const moveEvent = createTouchEvent('touchmove', 150, 200)

      expect(() => {
        act(() => {
          result.current.onTouchMove(moveEvent)
        })
      }).not.toThrow()

      expect(onSwipeRight).not.toHaveBeenCalled()
    })

    it('should detect zero distance as no swipe', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() => useSwipeGesture({ onSwipeRight }))

      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 100, 200)
      const endEvent = createTouchEvent('touchend', 100, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).not.toHaveBeenCalled()
    })
  })

  describe('rtl detection', () => {
    it('should return isRTL state', () => {
      Object.defineProperty(document.documentElement, 'dir', {
        value: 'rtl',
        writable: true,
      })

      const { result } = renderHook(() => useSwipeGesture())

      // isRTL should be available in the return object
      expect(result.current.isRTL).toBeDefined()
    })

    it('should detect RTL from dir attribute', () => {
      Object.defineProperty(document.documentElement, 'dir', {
        value: 'rtl',
        writable: true,
      })

      const { result } = renderHook(() => useSwipeGesture())
      expect(result.current.isRTL).toBe(true)
    })

    it('should detect RTL from Arabic language', () => {
      Object.defineProperty(document.documentElement, 'dir', {
        value: '',
        writable: true,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'lang', {
        value: 'ar',
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useSwipeGesture())
      expect(result.current.isRTL).toBe(true)
    })

    it('should detect RTL from Hebrew language', () => {
      Object.defineProperty(document.documentElement, 'dir', {
        value: '',
        writable: true,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'lang', {
        value: 'he',
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useSwipeGesture())
      expect(result.current.isRTL).toBe(true)
    })
  })

  describe('options', () => {
    it('should use custom minDistance', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, minDistance: 100 })
      )

      // 60px movement - below custom 100px threshold
      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 150, 200)
      const endEvent = createTouchEvent('touchend', 160, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).not.toHaveBeenCalled()
    })

    it('should use custom angleThreshold', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, angleThreshold: 10 })
      )

      // ~26° angle - above custom 10° threshold
      const startEvent = createTouchEvent('touchstart', 100, 100)
      const moveEvent = createTouchEvent('touchmove', 150, 120)
      const endEvent = createTouchEvent('touchend', 160, 130)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).not.toHaveBeenCalled()
    })

    it('should use custom velocityThreshold', () => {
      const onSwipeRight = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, velocityThreshold: 1.0 })
      )

      const now = Date.now()
      // 60px in 100ms = 0.6 px/ms (below custom 1.0 threshold)
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      const moveEvent = createTouchEvent('touchmove', 120, 200, now + 50)
      const endEvent = createTouchEvent('touchend', 160, 200, now + 100)

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).toHaveBeenCalledWith(
        expect.objectContaining({
          isFlick: false, // Velocity too low for this threshold
        })
      )
    })
  })

  describe('vertical scroll detection', () => {
    it('should ignore vertical scrolls', () => {
      const onSwipeRight = jest.fn()
      const onSwipeLeft = jest.fn()
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, onSwipeLeft })
      )

      // Mostly vertical movement
      const startEvent = createTouchEvent('touchstart', 100, 100)
      const moveEvent = createTouchEvent('touchmove', 105, 200) // 5px horizontal, 100px vertical
      const endEvent = createTouchEvent('touchend', 110, 250) // Continued vertical

      act(() => {
        result.current.onTouchStart(startEvent)
        result.current.onTouchMove(moveEvent)
        result.current.onTouchEnd(endEvent)
      })

      expect(onSwipeRight).not.toHaveBeenCalled()
      expect(onSwipeLeft).not.toHaveBeenCalled()
    })
  })
})
