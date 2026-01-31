import createCache from '@emotion/cache'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'

/**
 * Creates an Emotion cache configured for the specified text direction.
 *
 * For RTL languages (like Hebrew), the cache includes the stylis-plugin-rtl
 * which automatically converts CSS properties to their RTL equivalents
 * (e.g., margin-left becomes margin-right).
 *
 * @param direction - Text direction: 'ltr' for left-to-right or 'rtl' for right-to-left
 * @returns Emotion cache instance configured for the specified direction
 */
export function createEmotionCache(direction: 'ltr' | 'rtl') {
  if (direction === 'rtl') {
    // RTL cache with both prefixer and rtlPlugin
    return createCache({
      key: 'muirtl',
      stylisPlugins: [prefixer, rtlPlugin],
    })
  }

  // LTR cache with only prefixer (default behavior)
  return createCache({
    key: 'muiltr',
    stylisPlugins: [prefixer],
  })
}
