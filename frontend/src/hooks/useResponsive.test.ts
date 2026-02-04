/**
 * Tests for useResponsive hook
 *
 * Note: This test file is a stub for when a test framework (Vitest/Jest) is configured.
 * Currently, the project only has Playwright for E2E testing.
 *
 * To run these tests:
 * 1. Install a testing framework: npm install -D vitest @testing-library/react @testing-library/react-hooks
 * 2. Add test script to package.json: "test": "vitest"
 * 3. Run: npm run test -- useResponsive
 */

// import { renderHook } from '@testing-library/react-hooks'
// import { ThemeProvider } from '@mui/material/styles'
// import { createLightTheme } from '../theme'
// import { useResponsive } from './useResponsive'

// Mock window.matchMedia for different viewport sizes
// const mockMatchMedia = (width: number) => {
//   Object.defineProperty(window, 'matchMedia', {
//     writable: true,
//     value: (query: string) => ({
//       matches: false,
//       media: query,
//       onchange: null,
//       addListener: () => {},
//       removeListener: () => {},
//       addEventListener: () => {},
//       removeEventListener: () => {},
//       dispatchEvent: () => true,
//     }),
//   })
// }

// describe('useResponsive', () => {
//   const wrapper = ({ children }: { children: React.ReactNode }) => (
//     <ThemeProvider theme={createLightTheme()}>{children}</ThemeProvider>
//   )

//   it('should detect mobile viewport', () => {
//     mockMatchMedia(375) // iPhone SE width
//     const { result } = renderHook(() => useResponsive(), { wrapper })
//     expect(result.current.isMobile).toBe(true)
//     expect(result.current.isDesktop).toBe(false)
//   })

//   it('should detect tablet viewport', () => {
//     mockMatchMedia(900) // Tablet width
//     const { result } = renderHook(() => useResponsive(), { wrapper })
//     expect(result.current.isTablet).toBe(true)
//     expect(result.current.isMobile).toBe(false)
//   })

//   it('should detect desktop viewport', () => {
//     mockMatchMedia(1280) // Desktop width
//     const { result } = renderHook(() => useResponsive(), { wrapper })
//     expect(result.current.isDesktop).toBe(true)
//     expect(result.current.isMobile).toBe(false)
//   })

//   it('should return correct current breakpoint', () => {
//     mockMatchMedia(375)
//     const { result } = renderHook(() => useResponsive(), { wrapper })
//     expect(result.current.currentBreakpoint).toBe('xs')
//   })
// })

export {}
