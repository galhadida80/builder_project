import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { CacheProvider } from '@emotion/react'
import CssBaseline from '@mui/material/CssBaseline'
import { createLightTheme, createDarkTheme } from './theme'
import { cacheRtl, cacheLtr } from './rtlCache'

type ThemeMode = 'light' | 'dark' | 'system'
type Direction = 'ltr' | 'rtl'

interface ThemeContextType {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  isDark: boolean
  toggleTheme: () => void
  direction: Direction
  setDirection: (direction: Direction) => void
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

  const [direction, setDirection] = useState<Direction>(() => {
    const stored = localStorage.getItem('theme-direction')
    return (stored as Direction) || 'ltr'
  })

  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    localStorage.setItem('theme-mode', mode)
  }, [mode])

  useEffect(() => {
    localStorage.setItem('theme-direction', direction)
    document.documentElement.dir = direction
  }, [direction])

  const isDark = useMemo(() => {
    if (mode === 'system') return systemPrefersDark
    return mode === 'dark'
  }, [mode, systemPrefersDark])

  const theme = useMemo(() => {
    return isDark ? createDarkTheme(direction) : createLightTheme(direction)
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
    direction,
    setDirection,
  }), [mode, isDark, direction])

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
