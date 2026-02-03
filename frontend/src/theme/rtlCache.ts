import createCache from '@emotion/cache'
import rtlPlugin from 'stylis-plugin-rtl'

// Create RTL cache with stylis-plugin-rtl for automatic RTL transformation
export const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [rtlPlugin],
})

// Create LTR cache (default)
export const cacheLtr = createCache({
  key: 'muiltr',
})
