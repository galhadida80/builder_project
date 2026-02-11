import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@/mui'

const theme = createTheme()

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>
  }

  return render(ui, { wrapper: Wrapper, ...options })
}
