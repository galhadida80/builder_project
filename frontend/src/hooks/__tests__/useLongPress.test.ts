import { renderHook, act } from '@testing-library/react'
import { useLongPress, LongPressEvent } from '../useLongPress'

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

describe('useLongPress', () => {
  describe('basic long press detection', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should trigger onLongPress after default duration (500ms)', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      const endEvent = createTouchEvent('touchend', 100, 200, now + 600)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      expect(onLongPress).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 100,
          y: 200,
          duration: expect.any(Number),
        })
      )
    })

    it('should trigger onLongPress with custom duration', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() =>
        useLongPress({ onLongPress, duration: 300 })
      )

      const startEvent = createTouchEvent('touchstart', 50, 75)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      expect(onLongPress).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(onLongPress).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 50,
          y: 75,
        })
      )
    })

    it('should not trigger onLongPress before duration expires', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() =>
        useLongPress({ onLongPress, duration: 500 })
      )

      const startEvent = createTouchEvent('touchstart', 100, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(onLongPress).not.toHaveBeenCalled()
    })
  })

  describe('isPressed state', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should set isPressed to true on touch start', () => {
      const { result } = renderHook(() => useLongPress())

      expect(result.current.isPressed).toBe(false)

      const startEvent = createTouchEvent('touchstart', 100, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      expect(result.current.isPressed).toBe(true)
    })

    it('should set isPressed to false on touch end', () => {
      const { result } = renderHook(() => useLongPress())

      const startEvent = createTouchEvent('touchstart', 100, 200)
      const endEvent = createTouchEvent('touchend', 100, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      expect(result.current.isPressed).toBe(true)

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      expect(result.current.isPressed).toBe(false)
    })

    it('should set isPressed to false when movement exceeds threshold', () => {
      const { result } = renderHook(() =>
        useLongPress({ moveThreshold: 10 })
      )

      const startEvent = createTouchEvent('touchstart', 100, 200)
      const moveEvent = createTouchEvent('touchmove', 120, 200) // 20px > 10px threshold

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      expect(result.current.isPressed).toBe(true)

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      expect(result.current.isPressed).toBe(false)
    })
  })

  describe('movement threshold', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should cancel long press if movement exceeds default threshold (10px)', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      const moveEvent = createTouchEvent('touchmove', 115, 200, now + 100) // 15px > 10px

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('should not cancel long press if movement is within threshold', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      const moveEvent = createTouchEvent('touchmove', 108, 200, now + 100) // 8px < 10px

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalled()
    })

    it('should support custom move threshold', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() =>
        useLongPress({ onLongPress, moveThreshold: 5 })
      )

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      const moveEvent = createTouchEvent('touchmove', 108, 200, now + 100) // 8px > 5px

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('should calculate diagonal distance correctly', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() =>
        useLongPress({ onLongPress, moveThreshold: 10 })
      )

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      // 6px horizontal + 6px vertical = ~8.5px diagonal (within threshold)
      const moveEvent = createTouchEvent('touchmove', 106, 206, now + 100)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalled()
    })

    it('should exceed threshold with diagonal movement', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() =>
        useLongPress({ onLongPress, moveThreshold: 10 })
      )

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      // 8px horizontal + 8px vertical = ~11.3px diagonal (exceeds threshold)
      const moveEvent = createTouchEvent('touchmove', 108, 208, now + 100)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).not.toHaveBeenCalled()
    })
  })

  describe('touch end before long press', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should cancel long press when touch ends before duration', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      const endEvent = createTouchEvent('touchend', 100, 200, now + 300) // End before 500ms

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      act(() => {
        jest.advanceTimersByTime(300) // Advance remaining time
      })

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('should preserve event data until long press triggers', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 50, 75, now)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 50,
          y: 75,
        })
      )
    })
  })

  describe('multiple touches', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should use first touch in touches array', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const touch1 = {
        clientX: 100,
        clientY: 200,
        identifier: 0,
        pageX: 100,
        pageY: 200,
        radiusX: 0,
        radiusY: 0,
        rotationAngle: 0,
        screenX: 100,
        screenY: 200,
        target: document.body,
        force: 1,
      } as Touch

      const touch2 = {
        clientX: 150,
        clientY: 250,
        identifier: 1,
        pageX: 150,
        pageY: 250,
        radiusX: 0,
        radiusY: 0,
        rotationAngle: 0,
        screenX: 150,
        screenY: 250,
        target: document.body,
        force: 1,
      } as Touch

      const multiTouchEvent = {
        touches: [touch1, touch2],
        targetTouches: [touch1, touch2],
        changedTouches: [touch1, touch2],
        type: 'touchstart' as const,
        bubbles: true,
        cancelable: true,
        timeStamp: Date.now(),
      } as unknown as React.TouchEvent

      act(() => {
        result.current.onTouchStart(multiTouchEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 100,
          y: 200,
        })
      )
    })
  })

  describe('event data accuracy', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should include correct duration in event', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() =>
        useLongPress({ onLongPress, duration: 300 })
      )

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(onLongPress).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
        })
      )

      const eventData = onLongPress.mock.calls[0][0]
      expect(eventData.duration).toBeGreaterThanOrEqual(300)
    })

    it('should return LongPressEvent with correct shape', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const startEvent = createTouchEvent('touchstart', 123, 456)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      const event: LongPressEvent = onLongPress.mock.calls[0][0]
      expect(event).toHaveProperty('x')
      expect(event).toHaveProperty('y')
      expect(event).toHaveProperty('duration')
      expect(typeof event.x).toBe('number')
      expect(typeof event.y).toBe('number')
      expect(typeof event.duration).toBe('number')
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should handle touch event with no touches', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

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

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('should handle touch move without prior touch start', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const moveEvent = createTouchEvent('touchmove', 150, 200)

      expect(() => {
        act(() => {
          result.current.onTouchMove(moveEvent)
        })
      }).not.toThrow()

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('should handle touch end without prior touch start', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const endEvent = createTouchEvent('touchend', 100, 200)

      expect(() => {
        act(() => {
          result.current.onTouchEnd(endEvent)
        })
      }).not.toThrow()

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('should prevent multiple long press triggers', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalledTimes(1)

      // Advance time further - should not trigger again
      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalledTimes(1)
    })

    it('should reset state after long press completes', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      const endEvent = createTouchEvent('touchend', 100, 200, now + 600)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalledTimes(1)

      act(() => {
        result.current.onTouchEnd(endEvent)
      })

      // Start a new touch - should work normally
      const startEvent2 = createTouchEvent('touchstart', 200, 300)

      act(() => {
        result.current.onTouchStart(startEvent2)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalledTimes(2)
      expect(onLongPress.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          x: 200,
          y: 300,
        })
      )
    })

    it('should handle touch move at exactly threshold boundary', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() =>
        useLongPress({ onLongPress, moveThreshold: 10 })
      )

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      // Exactly 10px movement (at threshold boundary)
      const moveEvent = createTouchEvent('touchmove', 110, 200, now + 100)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalled()
    })

    it('should cancel when exceeding threshold by 1px', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() =>
        useLongPress({ onLongPress, moveThreshold: 10 })
      )

      const now = Date.now()
      const startEvent = createTouchEvent('touchstart', 100, 200, now)
      // 10.1px movement (exceeds threshold)
      const moveEvent = createTouchEvent('touchmove', 110.1, 200, now + 100)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      act(() => {
        result.current.onTouchMove(moveEvent)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).not.toHaveBeenCalled()
    })
  })

  describe('options', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should use default options when none provided', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      const startEvent = createTouchEvent('touchstart', 100, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      // Default duration is 500ms
      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalled()
    })

    it('should accept empty options object', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({}))

      const startEvent = createTouchEvent('touchstart', 100, 200)

      act(() => {
        result.current.onTouchStart(startEvent)
      })

      expect(() => {
        act(() => {
          jest.advanceTimersByTime(500)
        })
      }).not.toThrow()
    })

    it('should work without callback', () => {
      const { result } = renderHook(() => useLongPress({}))

      const startEvent = createTouchEvent('touchstart', 100, 200)

      expect(() => {
        act(() => {
          result.current.onTouchStart(startEvent)
        })

        act(() => {
          jest.advanceTimersByTime(500)
        })
      }).not.toThrow()
    })
  })

  describe('hook cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should clean up timeout on unmount', () => {
      const onLongPress = jest.fn()
      const { unmount } = renderHook(() =>
        useLongPress({ onLongPress, duration: 500 })
      )

      const startEvent = createTouchEvent('touchstart', 100, 200)

      act(() => {
        const { result } = renderHook(() =>
          useLongPress({ onLongPress, duration: 500 })
        )
        result.current.onTouchStart(startEvent)
      })

      unmount()

      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Callback should not be called if unmounted before long press triggers
      expect(onLongPress).not.toHaveBeenCalled()
    })
  })

  describe('sequential interactions', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should handle multiple sequential long presses', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      // First long press
      const startEvent1 = createTouchEvent('touchstart', 100, 200)
      act(() => {
        result.current.onTouchStart(startEvent1)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalledTimes(1)

      // End first touch
      const endEvent1 = createTouchEvent('touchend', 100, 200)
      act(() => {
        result.current.onTouchEnd(endEvent1)
      })

      // Second long press
      const startEvent2 = createTouchEvent('touchstart', 200, 300)
      act(() => {
        result.current.onTouchStart(startEvent2)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalledTimes(2)
      expect(onLongPress.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          x: 200,
          y: 300,
        })
      )
    })

    it('should handle move, then new touch', () => {
      const onLongPress = jest.fn()
      const { result } = renderHook(() => useLongPress({ onLongPress }))

      // First touch with movement that cancels long press
      const startEvent1 = createTouchEvent('touchstart', 100, 200)
      const moveEvent1 = createTouchEvent('touchmove', 120, 200)

      act(() => {
        result.current.onTouchStart(startEvent1)
      })

      act(() => {
        result.current.onTouchMove(moveEvent1)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).not.toHaveBeenCalled()

      // New touch should work normally
      const startEvent2 = createTouchEvent('touchstart', 200, 300)
      act(() => {
        result.current.onTouchStart(startEvent2)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(onLongPress).toHaveBeenCalledTimes(1)
    })
  })
})
