import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import rtlPlugin from '@mui/stylis-plugin-rtl'
import { prefixer } from 'stylis'
import CssBaseline from '@mui/material/CssBaseline'
import { createLightTheme, createDarkTheme } from './theme'

// Create Emotion caches for LTR and RTL
const cacheLtr = createCache({
  key: 'muiltr',
  stylisPlugins: [prefixer],
})

const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
})

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useThemeMode() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode')
    return (stored as ThemeMode) || 'system'
  })

  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const [direction, setDirection] = useState<'ltr' | 'rtl'>(() =>
    (document.dir as 'ltr' | 'rtl') || 'ltr'
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Watch for changes to document.dir attribute
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newDir = (document.dir as 'ltr' | 'rtl') || 'ltr'
      setDirection(newDir)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir'],
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    localStorage.setItem('theme-mode', mode)
  }, [mode])

  const isDark = useMemo(() => {
    if (mode === 'system') return systemPrefersDark
    return mode === 'dark'
  }, [mode, systemPrefersDark])

  const theme = useMemo(() => {
    const baseTheme = isDark ? createDarkTheme() : createLightTheme()
    return {
      ...baseTheme,
      direction,
    }
  }, [isDark, direction])

  const cache = useMemo(() => {
    return direction === 'rtl' ? cacheRtl : cacheLtr
  }, [direction])

  const toggleTheme = () => {
    setMode(prev => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'light'
      return isDark ? 'light' : 'dark'
    })
  }

  const value = useMemo(() => ({
    mode,
    setMode,
    isDark,
    toggleTheme,
  }), [mode, isDark])

  return (
    <ThemeContext.Provider value={value}>
      <CacheProvider value={cache}>
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MuiThemeProvider>
      </CacheProvider>
    </ThemeContext.Provider>
  )
}
