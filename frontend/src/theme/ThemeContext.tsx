import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { createLightTheme, createDarkTheme } from './theme'
import { useTranslation } from 'react-i18next'

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
  const { i18n } = useTranslation()
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

  // Set document direction based on language
  useEffect(() => {
    const dir = i18n.language === 'he' ? 'rtl' : 'ltr'
    document.documentElement.dir = dir
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  useEffect(() => {
    localStorage.setItem('theme-mode', mode)
  }, [mode])

  const isDark = useMemo(() => {
    if (mode === 'system') return systemPrefersDark
    return mode === 'dark'
  }, [mode, systemPrefersDark])

  const direction = useMemo(() => {
    return i18n.language === 'he' ? 'rtl' : 'ltr'
  }, [i18n.language])

  const theme = useMemo(() => {
    return isDark ? createDarkTheme(direction) : createLightTheme(direction)
  }, [isDark, direction])

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
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
