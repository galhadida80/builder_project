import { forwardRef } from 'react'
import Box, { BoxProps } from '@mui/material/Box'
import { SxProps, Theme } from '@mui/material'

/**
 * ResponsiveContainer Props
 * A responsive container component that provides consistent padding and max-width across breakpoints
 */
interface ResponsiveContainerProps extends Omit<BoxProps, 'maxWidth'> {
  /** Maximum width of the container at different breakpoints */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | false
  /** Disable horizontal padding */
  disableGutters?: boolean
  /** Apply reduced padding for compact layouts */
  compact?: boolean
  children: React.ReactNode
}

/**
 * ResponsiveContainer
 *
 * A container component that provides responsive padding and max-width constraints.
 * Follows mobile-first design principles with adaptive spacing.
 *
 * @example
 * ```tsx
 * <ResponsiveContainer maxWidth="lg">
 *   <Typography variant="h4">Dashboard</Typography>
 * </ResponsiveContainer>
 * ```
 */
export const ResponsiveContainer = forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ maxWidth = 'xl', disableGutters = false, compact = false, children, sx, ...props }, ref) => {
    const getMaxWidth = () => {
      if (maxWidth === false || maxWidth === 'full') return '100%'
      const maxWidths = {
        xs: '444px',   // ~375px content + padding
        sm: '672px',   // ~600px content + padding
        md: '900px',   // ~768px content + padding
        lg: '1200px',  // ~1024px content + padding
        xl: '1536px',  // ~1280px content + padding
      }
      return maxWidths[maxWidth]
    }

    return (
      <Box
        ref={ref}
        sx={{
          width: '100%',
          maxWidth: getMaxWidth(),
          marginLeft: 'auto',
          marginRight: 'auto',
          px: disableGutters ? 0 : compact ? { xs: 2, sm: 2.5, md: 3 } : { xs: 2, sm: 3, md: 4 },
          ...sx,
        }}
        {...props}
      >
        {children}
      </Box>
    )
  }
)

ResponsiveContainer.displayName = 'ResponsiveContainer'

/**
 * ResponsiveGrid Props
 * A responsive grid component that provides mobile-first column layouts
 */
interface ResponsiveGridProps extends BoxProps {
  /** Number of columns at different breakpoints */
  columns?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  /** Gap spacing between grid items (uses theme spacing) */
  spacing?: number | {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  /** Minimum width for grid items (useful for auto-fit/auto-fill) */
  minItemWidth?: string
  children: React.ReactNode
}

/**
 * ResponsiveGrid
 *
 * A responsive grid layout component using CSS Grid.
 * Provides mobile-first column configurations with responsive spacing.
 *
 * @example
 * ```tsx
 * // Fixed columns at breakpoints
 * <ResponsiveGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={3}>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 * </ResponsiveGrid>
 *
 * // Auto-fit with minimum width
 * <ResponsiveGrid minItemWidth="280px" spacing={2}>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 * </ResponsiveGrid>
 * ```
 */
export const ResponsiveGrid = forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ columns, spacing = 3, minItemWidth, children, sx, ...props }, ref) => {
    const getGridTemplateColumns = () => {
      if (minItemWidth) {
        return `repeat(auto-fill, minmax(${minItemWidth}, 1fr))`
      }

      if (!columns) {
        // Default responsive columns if not specified
        return {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        }
      }

      // Build responsive object for gridTemplateColumns
      const responsiveColumns: Record<string, string> = {}
      if (columns.xs !== undefined) responsiveColumns.xs = `repeat(${columns.xs}, 1fr)`
      if (columns.sm !== undefined) responsiveColumns.sm = `repeat(${columns.sm}, 1fr)`
      if (columns.md !== undefined) responsiveColumns.md = `repeat(${columns.md}, 1fr)`
      if (columns.lg !== undefined) responsiveColumns.lg = `repeat(${columns.lg}, 1fr)`
      if (columns.xl !== undefined) responsiveColumns.xl = `repeat(${columns.xl}, 1fr)`

      return responsiveColumns
    }

    const getGap = (theme: Theme) => {
      if (typeof spacing === 'number') {
        return theme.spacing(spacing)
      }

      // Build responsive gap object
      const responsiveGap: Record<string, string> = {}
      if (spacing.xs !== undefined) responsiveGap.xs = theme.spacing(spacing.xs)
      if (spacing.sm !== undefined) responsiveGap.sm = theme.spacing(spacing.sm)
      if (spacing.md !== undefined) responsiveGap.md = theme.spacing(spacing.md)
      if (spacing.lg !== undefined) responsiveGap.lg = theme.spacing(spacing.lg)
      if (spacing.xl !== undefined) responsiveGap.xl = theme.spacing(spacing.xl)

      return responsiveGap
    }

    return (
      <Box
        ref={ref}
        sx={{
          display: 'grid',
          gridTemplateColumns: getGridTemplateColumns(),
          gap: getGap,
          ...sx,
        }}
        {...props}
      >
        {children}
      </Box>
    )
  }
)

ResponsiveGrid.displayName = 'ResponsiveGrid'

/**
 * ResponsiveGridItem Props
 * A grid item component for use within ResponsiveGrid
 */
interface ResponsiveGridItemProps extends BoxProps {
  /** Column span at different breakpoints */
  colSpan?: number | {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  /** Row span at different breakpoints */
  rowSpan?: number | {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  children: React.ReactNode
}

/**
 * ResponsiveGridItem
 *
 * A grid item component that can span multiple columns or rows at different breakpoints.
 * Use within ResponsiveGrid for advanced grid layouts.
 *
 * @example
 * ```tsx
 * <ResponsiveGrid columns={{ xs: 1, md: 3 }}>
 *   <ResponsiveGridItem colSpan={{ xs: 1, md: 2 }}>
 *     <Card>Wide item</Card>
 *   </ResponsiveGridItem>
 *   <ResponsiveGridItem>
 *     <Card>Normal item</Card>
 *   </ResponsiveGridItem>
 * </ResponsiveGrid>
 * ```
 */
export const ResponsiveGridItem = forwardRef<HTMLDivElement, ResponsiveGridItemProps>(
  ({ colSpan, rowSpan, children, sx, ...props }, ref) => {
    const getGridColumn = () => {
      if (!colSpan) return undefined

      if (typeof colSpan === 'number') {
        return `span ${colSpan}`
      }

      const responsiveColSpan: Record<string, string> = {}
      if (colSpan.xs !== undefined) responsiveColSpan.xs = `span ${colSpan.xs}`
      if (colSpan.sm !== undefined) responsiveColSpan.sm = `span ${colSpan.sm}`
      if (colSpan.md !== undefined) responsiveColSpan.md = `span ${colSpan.md}`
      if (colSpan.lg !== undefined) responsiveColSpan.lg = `span ${colSpan.lg}`
      if (colSpan.xl !== undefined) responsiveColSpan.xl = `span ${colSpan.xl}`

      return responsiveColSpan
    }

    const getGridRow = () => {
      if (!rowSpan) return undefined

      if (typeof rowSpan === 'number') {
        return `span ${rowSpan}`
      }

      const responsiveRowSpan: Record<string, string> = {}
      if (rowSpan.xs !== undefined) responsiveRowSpan.xs = `span ${rowSpan.xs}`
      if (rowSpan.sm !== undefined) responsiveRowSpan.sm = `span ${rowSpan.sm}`
      if (rowSpan.md !== undefined) responsiveRowSpan.md = `span ${rowSpan.md}`
      if (rowSpan.lg !== undefined) responsiveRowSpan.lg = `span ${rowSpan.lg}`
      if (rowSpan.xl !== undefined) responsiveRowSpan.xl = `span ${rowSpan.xl}`

      return responsiveRowSpan
    }

    return (
      <Box
        ref={ref}
        sx={{
          gridColumn: getGridColumn(),
          gridRow: getGridRow(),
          ...sx,
        }}
        {...props}
      >
        {children}
      </Box>
    )
  }
)

ResponsiveGridItem.displayName = 'ResponsiveGridItem'

/**
 * ResponsiveStack Props
 * A simple flex stack that switches between column and row layout at breakpoints
 */
interface ResponsiveStackProps extends BoxProps {
  /** Direction at different breakpoints */
  direction?: 'row' | 'column' | {
    xs?: 'row' | 'column'
    sm?: 'row' | 'column'
    md?: 'row' | 'column'
    lg?: 'row' | 'column'
    xl?: 'row' | 'column'
  }
  /** Spacing between items (uses theme spacing) */
  spacing?: number
  /** Alignment of items */
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  /** Justification of items */
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
  children: React.ReactNode
}

/**
 * ResponsiveStack
 *
 * A flexible stack component that can switch between row and column layout at breakpoints.
 * Useful for responsive button groups, form layouts, and navigation.
 *
 * @example
 * ```tsx
 * // Stack vertically on mobile, horizontally on desktop
 * <ResponsiveStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
 *   <Button>Cancel</Button>
 *   <Button variant="primary">Submit</Button>
 * </ResponsiveStack>
 * ```
 */
export const ResponsiveStack = forwardRef<HTMLDivElement, ResponsiveStackProps>(
  ({ direction = 'column', spacing = 2, align = 'stretch', justify = 'flex-start', children, sx, ...props }, ref) => {
    const getFlexDirection = () => {
      if (typeof direction === 'string') {
        return direction
      }

      const responsiveDirection: Record<string, string> = {}
      if (direction.xs) responsiveDirection.xs = direction.xs
      if (direction.sm) responsiveDirection.sm = direction.sm
      if (direction.md) responsiveDirection.md = direction.md
      if (direction.lg) responsiveDirection.lg = direction.lg
      if (direction.xl) responsiveDirection.xl = direction.xl

      return responsiveDirection
    }

    return (
      <Box
        ref={ref}
        sx={{
          display: 'flex',
          flexDirection: getFlexDirection(),
          gap: (theme) => theme.spacing(spacing),
          alignItems: align,
          justifyContent: justify,
          ...sx,
        }}
        {...props}
      >
        {children}
      </Box>
    )
  }
)

ResponsiveStack.displayName = 'ResponsiveStack'
