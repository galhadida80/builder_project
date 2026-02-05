'use client'

import { useState, useMemo, createContext, useContext, useEffect } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import rtlPlugin from 'stylis-plugin-rtl'
import { prefixer } from 'stylis'
import { createLightTheme, createDarkTheme } from '@/theme/theme'

type ThemeMode = 'light' | 'dark'
type Direction = 'ltr' | 'rtl'

interface ThemeContextType {
  mode: ThemeMode
  direction: Direction
  toggleMode: () => void
  setDirection: (dir: Direction) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeRegistry')
  }
  return context
}

function createEmotionCache(direction: Direction) {
  if (direction === 'rtl') {
    return createCache({
      key: 'muirtl',
      stylisPlugins: [prefixer, rtlPlugin],
    })
  }
  return createCache({
    key: 'mui',
  })
}

interface ThemeRegistryProps {
  children: React.ReactNode
  initialDirection?: Direction
}

export default function ThemeRegistry({ children, initialDirection = 'ltr' }: ThemeRegistryProps) {
  const [mode, setMode] = useState<ThemeMode>('light')
  const [direction, setDirection] = useState<Direction>(initialDirection)

  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode | null
    if (savedMode) {
      setMode(savedMode)
    }
    const savedDirection = localStorage.getItem('direction') as Direction | null
    if (savedDirection) {
      setDirection(savedDirection)
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('dir', direction)
    document.body.setAttribute('dir', direction)
  }, [direction])

  const toggleMode = () => {
    setMode((prev) => {
      const newMode = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('themeMode', newMode)
      return newMode
    })
  }

  const handleSetDirection = (dir: Direction) => {
    setDirection(dir)
    localStorage.setItem('direction', dir)
  }

  const theme = useMemo(() => {
    return mode === 'light' ? createLightTheme() : createDarkTheme()
  }, [mode, direction])

  const emotionCache = useMemo(() => createEmotionCache(direction), [direction])

  const contextValue = useMemo(
    () => ({
      mode,
      direction,
      toggleMode,
      setDirection: handleSetDirection,
    }),
    [mode, direction]
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <CacheProvider value={emotionCache}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </CacheProvider>
      </AppRouterCacheProvider>
    </ThemeContext.Provider>
  )
}
