import { useMemo } from 'react'
import { useMediaQuery } from '@/mui'
import { useTheme } from '@/mui'

/**
 * Custom hook for responsive design patterns
 * Provides helpers to check current breakpoint and device type
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useResponsive()
 *
 * return (
 *   <Box>
 *     {isMobile && <MobileView />}
 *     {isDesktop && <DesktopView />}
 *   </Box>
 * )
 * ```
 */
export function useResponsive() {
  const theme = useTheme()

  // Breakpoint queries following mobile-first approach
  const isXs = useMediaQuery(theme.breakpoints.only('xs'))
  const isSm = useMediaQuery(theme.breakpoints.only('sm'))
  const isMd = useMediaQuery(theme.breakpoints.only('md'))
  const isLg = useMediaQuery(theme.breakpoints.only('lg'))
  const isXl = useMediaQuery(theme.breakpoints.only('xl'))

  // Range queries for common device categories
  const isMobile = useMediaQuery(theme.breakpoints.down('md')) // < 900px
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg')) // 900px - 1200px
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg')) // >= 1200px

  // Additional useful queries
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm')) // < 600px
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('xl')) // >= 1536px

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      // Exact breakpoint checks
      isXs,
      isSm,
      isMd,
      isLg,
      isXl,

      // Device category checks (most commonly used)
      isMobile,
      isTablet,
      isDesktop,

      // Additional utility checks
      isSmallMobile,
      isLargeDesktop,

      // Current breakpoint name for conditional logic
      currentBreakpoint: isXs ? 'xs' : isSm ? 'sm' : isMd ? 'md' : isLg ? 'lg' : 'xl',
    }),
    [
      isXs,
      isSm,
      isMd,
      isLg,
      isXl,
      isMobile,
      isTablet,
      isDesktop,
      isSmallMobile,
      isLargeDesktop,
    ]
  )
}

/**
 * Type definition for the useResponsive hook return value
 */
export type UseResponsiveReturn = ReturnType<typeof useResponsive>
