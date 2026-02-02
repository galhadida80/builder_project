/**
 * Haptic Feedback Utility
 * Provides tactile feedback on supported devices using the Vibration API
 * Gracefully degrades on unsupported devices (no errors, silent fallback)
 */

/**
 * Intensity levels for haptic feedback patterns
 */
export type HapticIntensity = 'light' | 'medium' | 'heavy'

/**
 * Vibration pattern in milliseconds
 * Can be a single number or an array of numbers representing vibration and pause durations
 */
type VibrationPattern = number | number[]

/**
 * Get vibration pattern based on intensity
 * @param intensity - 'light' (10-20ms), 'medium' (100ms), 'heavy' (300ms)
 * @returns Vibration pattern in milliseconds
 */
const getVibrationPattern = (intensity: HapticIntensity): VibrationPattern => {
  switch (intensity) {
    case 'light':
      return 10 // Very short vibration (10ms)
    case 'medium':
      return 100 // Medium vibration (100ms)
    case 'heavy':
      return 300 // Long vibration (300ms)
    default:
      return 10
  }
}

/**
 * Trigger haptic feedback on the device
 * Uses the Vibration API (navigator.vibrate) for tactile feedback
 * Gracefully handles unsupported devices without throwing errors
 *
 * @param intensity - Intensity level: 'light', 'medium', or 'heavy'
 * @example
 * // Light vibration on button click
 * hapticFeedback('light')
 *
 * // Medium vibration on form submission
 * hapticFeedback('medium')
 *
 * // Heavy vibration on critical action
 * hapticFeedback('heavy')
 */
export const hapticFeedback = (intensity: HapticIntensity = 'light'): void => {
  // Check if Vibration API is available
  if (!navigator.vibrate) {
    // Gracefully degrade - do nothing on unsupported devices
    return
  }

  try {
    const pattern = getVibrationPattern(intensity)
    navigator.vibrate(pattern)
  } catch (error) {
    // Silently ignore errors from vibration API
    // This can happen on some devices or when permissions are denied
  }
}

/**
 * Trigger a custom vibration pattern
 * Useful for complex or sequential vibrations
 *
 * @param pattern - Vibration pattern: single millisecond value or array of durations
 * @example
 * // Custom pattern: 20ms vibrate, 10ms pause, 20ms vibrate
 * hapticPattern([20, 10, 20])
 *
 * // Single vibration
 * hapticPattern(50)
 */
export const hapticPattern = (pattern: VibrationPattern): void => {
  // Check if Vibration API is available
  if (!navigator.vibrate) {
    return
  }

  try {
    navigator.vibrate(pattern)
  } catch (error) {
    // Silently ignore errors
  }
}

/**
 * Check if device supports haptic feedback (Vibration API)
 * Useful for conditional UI or feature detection
 *
 * @returns true if Vibration API is available, false otherwise
 * @example
 * if (isHapticSupported()) {
 *   showHapticFeedbackIndicator()
 * }
 */
export const isHapticSupported = (): boolean => {
  return !!navigator.vibrate
}
