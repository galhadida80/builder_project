import {
  hapticFeedback,
  hapticPattern,
  isHapticSupported,
  type HapticIntensity,
} from '../hapticFeedback'

describe('hapticFeedback Utility', () => {
  let originalNavigator: typeof navigator

  beforeEach(() => {
    // Store original navigator
    originalNavigator = navigator
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Restore navigator
    ;(global.navigator as any) = originalNavigator
  })

  describe('hapticFeedback function', () => {
    it('should call navigator.vibrate with light intensity pattern (10ms)', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticFeedback('light')

      expect(vibrateMock).toHaveBeenCalledWith(10)
      expect(vibrateMock).toHaveBeenCalledTimes(1)
    })

    it('should call navigator.vibrate with medium intensity pattern (100ms)', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticFeedback('medium')

      expect(vibrateMock).toHaveBeenCalledWith(100)
      expect(vibrateMock).toHaveBeenCalledTimes(1)
    })

    it('should call navigator.vibrate with heavy intensity pattern (300ms)', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticFeedback('heavy')

      expect(vibrateMock).toHaveBeenCalledWith(300)
      expect(vibrateMock).toHaveBeenCalledTimes(1)
    })

    it('should use light intensity as default when no intensity provided', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticFeedback()

      expect(vibrateMock).toHaveBeenCalledWith(10)
      expect(vibrateMock).toHaveBeenCalledTimes(1)
    })

    it('should handle undefined intensity gracefully (default to light)', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticFeedback(undefined as any)

      expect(vibrateMock).toHaveBeenCalledWith(10)
    })

    it('should gracefully degrade when navigator.vibrate is not available', () => {
      ;(global.navigator as any).vibrate = undefined

      // Should not throw error
      expect(() => hapticFeedback('light')).not.toThrow()
      expect(() => hapticFeedback('medium')).not.toThrow()
      expect(() => hapticFeedback('heavy')).not.toThrow()
    })

    it('should handle navigator.vibrate being null', () => {
      ;(global.navigator as any).vibrate = null

      // Should not throw error
      expect(() => hapticFeedback('light')).not.toThrow()
    })

    it('should silently catch errors thrown by navigator.vibrate', () => {
      const error = new Error('Vibration not supported')
      ;(global.navigator as any).vibrate = jest.fn(() => {
        throw error
      })

      // Should not throw error
      expect(() => hapticFeedback('light')).not.toThrow()
    })

    it('should call navigator.vibrate even if it might throw', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticFeedback('medium')

      expect(vibrateMock).toHaveBeenCalled()
    })

    it('should handle all valid intensity levels', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      const intensities: HapticIntensity[] = ['light', 'medium', 'heavy']
      const expectedPatterns = [10, 100, 300]

      intensities.forEach((intensity, index) => {
        vibrateMock.mockClear()
        hapticFeedback(intensity)
        expect(vibrateMock).toHaveBeenCalledWith(expectedPatterns[index])
      })
    })

    it('should return void', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      const result = hapticFeedback('light')

      expect(result).toBeUndefined()
    })

    it('should handle navigator.vibrate throwing permission error', () => {
      const permissionError = new Error('NotAllowedError: Vibration API not allowed')
      ;(global.navigator as any).vibrate = jest.fn(() => {
        throw permissionError
      })

      // Should not throw and should fail silently
      expect(() => hapticFeedback('light')).not.toThrow()
    })

    it('should handle multiple consecutive calls', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticFeedback('light')
      hapticFeedback('medium')
      hapticFeedback('heavy')

      expect(vibrateMock).toHaveBeenCalledTimes(3)
      expect(vibrateMock).toHaveBeenNthCalledWith(1, 10)
      expect(vibrateMock).toHaveBeenNthCalledWith(2, 100)
      expect(vibrateMock).toHaveBeenNthCalledWith(3, 300)
    })
  })

  describe('hapticPattern function', () => {
    it('should call navigator.vibrate with single number pattern', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticPattern(50)

      expect(vibrateMock).toHaveBeenCalledWith(50)
      expect(vibrateMock).toHaveBeenCalledTimes(1)
    })

    it('should call navigator.vibrate with array pattern', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      const pattern = [20, 10, 20]
      hapticPattern(pattern)

      expect(vibrateMock).toHaveBeenCalledWith(pattern)
      expect(vibrateMock).toHaveBeenCalledTimes(1)
    })

    it('should handle complex vibration patterns', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      const pattern = [100, 50, 100, 50, 100]
      hapticPattern(pattern)

      expect(vibrateMock).toHaveBeenCalledWith(pattern)
    })

    it('should handle empty array pattern', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticPattern([])

      expect(vibrateMock).toHaveBeenCalledWith([])
    })

    it('should handle zero duration pattern', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticPattern(0)

      expect(vibrateMock).toHaveBeenCalledWith(0)
    })

    it('should gracefully degrade when navigator.vibrate is not available', () => {
      ;(global.navigator as any).vibrate = undefined

      // Should not throw error
      expect(() => hapticPattern(50)).not.toThrow()
      expect(() => hapticPattern([20, 10, 20])).not.toThrow()
    })

    it('should silently catch errors thrown by navigator.vibrate', () => {
      const error = new Error('Vibration not supported')
      ;(global.navigator as any).vibrate = jest.fn(() => {
        throw error
      })

      // Should not throw error
      expect(() => hapticPattern(50)).not.toThrow()
      expect(() => hapticPattern([20, 10, 20])).not.toThrow()
    })

    it('should call navigator.vibrate with custom patterns', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      const patterns = [
        { pattern: 100, name: 'Single long' },
        { pattern: [50, 100, 50], name: 'Pulse' },
        { pattern: [10, 5, 10, 5, 10], name: 'Quick burst' },
      ]

      patterns.forEach(({ pattern }) => {
        vibrateMock.mockClear()
        hapticPattern(pattern)
        expect(vibrateMock).toHaveBeenCalledWith(pattern)
      })
    })

    it('should return void', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      const result = hapticPattern(50)

      expect(result).toBeUndefined()
    })

    it('should handle navigator.vibrate throwing permission error', () => {
      const permissionError = new Error('NotAllowedError')
      ;(global.navigator as any).vibrate = jest.fn(() => {
        throw permissionError
      })

      // Should not throw and should fail silently
      expect(() => hapticPattern(50)).not.toThrow()
    })

    it('should handle multiple consecutive calls with different patterns', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticPattern(50)
      hapticPattern([20, 10, 20])
      hapticPattern([100])

      expect(vibrateMock).toHaveBeenCalledTimes(3)
      expect(vibrateMock).toHaveBeenNthCalledWith(1, 50)
      expect(vibrateMock).toHaveBeenNthCalledWith(2, [20, 10, 20])
      expect(vibrateMock).toHaveBeenNthCalledWith(3, [100])
    })

    it('should handle very large vibration values', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticPattern(10000)

      expect(vibrateMock).toHaveBeenCalledWith(10000)
    })

    it('should handle patterns with large values', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      const pattern = [5000, 1000, 5000]
      hapticPattern(pattern)

      expect(vibrateMock).toHaveBeenCalledWith(pattern)
    })
  })

  describe('isHapticSupported function', () => {
    it('should return true when navigator.vibrate is available', () => {
      ;(global.navigator as any).vibrate = jest.fn()

      expect(isHapticSupported()).toBe(true)
    })

    it('should return false when navigator.vibrate is undefined', () => {
      ;(global.navigator as any).vibrate = undefined

      expect(isHapticSupported()).toBe(false)
    })

    it('should return false when navigator.vibrate is null', () => {
      ;(global.navigator as any).vibrate = null

      expect(isHapticSupported()).toBe(false)
    })

    it('should work consistently across multiple calls', () => {
      ;(global.navigator as any).vibrate = jest.fn()

      expect(isHapticSupported()).toBe(true)
      expect(isHapticSupported()).toBe(true)
      expect(isHapticSupported()).toBe(true)
    })

    it('should return false when navigator object is modified', () => {
      ;(global.navigator as any).vibrate = undefined

      expect(isHapticSupported()).toBe(false)

      // Add vibrate later
      ;(global.navigator as any).vibrate = jest.fn()

      expect(isHapticSupported()).toBe(true)
    })

    it('should not throw error when checking support', () => {
      ;(global.navigator as any).vibrate = undefined

      expect(() => isHapticSupported()).not.toThrow()
    })

    it('should treat falsy vibrate as not supported', () => {
      ;(global.navigator as any).vibrate = 0

      expect(isHapticSupported()).toBe(false)
    })

    it('should treat truthy vibrate as supported', () => {
      ;(global.navigator as any).vibrate = () => {
        // Mock function
      }

      expect(isHapticSupported()).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should enable conditional haptic usage based on support check', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      if (isHapticSupported()) {
        hapticFeedback('light')
      }

      expect(vibrateMock).toHaveBeenCalledWith(10)
    })

    it('should handle unsupported device gracefully in conditional', () => {
      ;(global.navigator as any).vibrate = undefined

      let hapticCalled = false
      if (isHapticSupported()) {
        hapticFeedback('light')
        hapticCalled = true
      }

      expect(hapticCalled).toBe(false)
    })

    it('should fallback to pattern API when standard haptic fails', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      // Try standard haptic first
      hapticFeedback('medium')

      if (vibrateMock.mock.calls.length > 0) {
        // Successfully called
        expect(vibrateMock).toHaveBeenCalledWith(100)
      } else {
        // Fallback to custom pattern
        hapticPattern([100])
      }
    })

    it('should work in simulated button click scenario', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      // Simulate button click handler
      const handleButtonClick = () => {
        if (isHapticSupported()) {
          hapticFeedback('light')
        }
      }

      handleButtonClick()

      expect(vibrateMock).toHaveBeenCalledWith(10)
    })

    it('should work in simulated form submission scenario', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      // Simulate form submission handler
      const handleFormSubmit = (success: boolean) => {
        if (success && isHapticSupported()) {
          hapticFeedback('heavy')
        }
      }

      handleFormSubmit(true)

      expect(vibrateMock).toHaveBeenCalledWith(300)
    })

    it('should work in simulated custom feedback scenario', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      // Simulate custom feedback handler
      const handleCustomFeedback = () => {
        if (isHapticSupported()) {
          // Double tap feedback: two quick vibrations
          hapticPattern([50, 100, 50])
        }
      }

      handleCustomFeedback()

      expect(vibrateMock).toHaveBeenCalledWith([50, 100, 50])
    })

    it('should handle rapid successive calls without issues', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      // Simulate rapid button clicks
      for (let i = 0; i < 5; i++) {
        hapticFeedback('light')
      }

      expect(vibrateMock).toHaveBeenCalledTimes(5)
      expect(vibrateMock).toHaveBeenCalledWith(10)
    })

    it('should handle mixed haptic and pattern calls', () => {
      const vibrateMock = jest.fn()
      ;(global.navigator as any).vibrate = vibrateMock

      hapticFeedback('light')
      hapticPattern([50, 25, 50])
      hapticFeedback('medium')

      expect(vibrateMock).toHaveBeenCalledTimes(3)
      expect(vibrateMock).toHaveBeenNthCalledWith(1, 10)
      expect(vibrateMock).toHaveBeenNthCalledWith(2, [50, 25, 50])
      expect(vibrateMock).toHaveBeenNthCalledWith(3, 100)
    })
  })
})
