import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { CacheProvider } from '@emotion/react'
import { createLightTheme, createDarkTheme } from './theme'
import { createEmotionCache } from './emotionCache'
import { useLanguage } from '../i18n/LanguageContext'
import { CssBaseline } from '@/mui'
import { ThemeProvider as MuiThemeProvider } from '@/mui'

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
  const { direction } = useLanguage()

  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode')
    return (stored as ThemeMode) || 'system'
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

  const isDark = useMemo(() => {
    if (mode === 'system') return systemPrefersDark
    return mode === 'dark'
  }, [mode, systemPrefersDark])

  const emotionCache = useMemo(() => createEmotionCache(direction), [direction])

  const theme = useMemo(() => {
    const baseTheme = isDark ? createDarkTheme() : createLightTheme()
    return {
      ...baseTheme,
      direction,
    }
  }, [isDark, direction])

  const toggleTheme = useCallback(() => {
    setMode(prev => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'light'
      return isDark ? 'light' : 'dark'
    })
  }, [isDark])

  const value = useMemo(() => ({
    mode,
    setMode,
    isDark,
    toggleTheme,
  }), [mode, isDark, toggleTheme])

  return (
    <CacheProvider value={emotionCache}>
      <ThemeContext.Provider value={value}>
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MuiThemeProvider>
      </ThemeContext.Provider>
    </CacheProvider>
  )
}
