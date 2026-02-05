import { Typography, TypographyProps } from '@mui/material'
import { styled } from '@mui/material/styles'
import { forwardRef, ElementType } from 'react'
import { typography } from '../../theme/tokens'

export type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small'
export type FontWeight = 'light' | 'regular' | 'medium' | 'semibold' | 'bold'
export type LineHeight = 'tight' | 'normal' | 'relaxed'

export interface ResponsiveTextProps extends Omit<TypographyProps, 'variant'> {
  /**
   * Text size variant
   * - display: Extra large display text (responsive 2rem -> 3rem)
   * - h1: Main heading (responsive 1.75rem -> 2.25rem)
   * - h2: Section heading (responsive 1.5rem -> 1.75rem)
   * - h3: Subsection heading (responsive 1.25rem -> 1.375rem)
   * - h4: Minor heading (responsive 1.063rem -> 1.125rem)
   * - body: Body text (responsive 0.938rem -> 1rem)
   * - small: Small text (responsive 0.813rem -> 0.875rem)
   */
  variant?: TextVariant

  /**
   * Font weight
   */
  weight?: FontWeight

  /**
   * Line height
   */
  lineHeight?: LineHeight

  /**
   * HTML element or React component to render as
   */
  component?: ElementType

  /**
   * Text color
   */
  color?: TypographyProps['color']

  /**
   * Text alignment
   */
  align?: TypographyProps['align']

  /**
   * Whether to apply margin bottom (useful for spacing between text elements)
   */
  gutterBottom?: boolean

  /**
   * Whether to truncate text with ellipsis
   */
  noWrap?: boolean
}

const variantToMuiVariant: Record<TextVariant, TypographyProps['variant']> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'body1',
  small: 'body2',
}

const StyledTypography = styled(Typography, {
  shouldForwardProp: (prop) =>
    !['variant', 'weight', 'lineHeight'].includes(prop as string),
})<ResponsiveTextProps>(({ theme, variant = 'body', weight, lineHeight }) => {
  const responsiveSizes = typography.responsiveFontSize[variant]

  return {
    // Base font size (mobile-first)
    fontSize: responsiveSizes.xs,

    // Font weight
    ...(weight && {
      fontWeight: typography.fontWeight[weight],
    }),

    // Line height
    ...(lineHeight && {
      lineHeight: typography.lineHeight[lineHeight],
    }),

    // Responsive font sizes using theme breakpoints
    // sm breakpoint (600px+)
    ...(responsiveSizes.sm && {
      [theme.breakpoints.up('sm')]: {
        fontSize: responsiveSizes.sm,
      },
    }),

    // md breakpoint (900px+)
    ...(responsiveSizes.md && {
      [theme.breakpoints.up('md')]: {
        fontSize: responsiveSizes.md,
      },
    }),
  }
})

/**
 * ResponsiveText - A typography component with mobile-first responsive sizing
 *
 * Provides consistent, responsive text sizing across all breakpoints.
 * Uses the design system's typography tokens for sizes, weights, and line heights.
 *
 * @example
 * // Display text (largest)
 * <ResponsiveText variant="display" weight="bold">
 *   Construction Operations Platform
 * </ResponsiveText>
 *
 * @example
 * // Main page heading
 * <ResponsiveText variant="h1" weight="bold" gutterBottom>
 *   Dashboard
 * </ResponsiveText>
 *
 * @example
 * // Section heading with custom color
 * <ResponsiveText variant="h2" weight="semibold" color="primary">
 *   Recent Projects
 * </ResponsiveText>
 *
 * @example
 * // Body text with relaxed line height
 * <ResponsiveText variant="body" lineHeight="relaxed">
 *   This is a paragraph of body text that will be easy to read
 *   across all device sizes.
 * </ResponsiveText>
 *
 * @example
 * // Small text (captions, labels)
 * <ResponsiveText variant="small" color="text.secondary">
 *   Last updated: 5 minutes ago
 * </ResponsiveText>
 *
 * @example
 * // Custom component type
 * <ResponsiveText variant="h3" component="span" weight="medium">
 *   Inline heading text
 * </ResponsiveText>
 */
export const ResponsiveText = forwardRef<HTMLElement, ResponsiveTextProps>(
  (props, ref) => {
    const {
      variant = 'body',
      weight,
      lineHeight,
      component,
      color,
      align,
      gutterBottom,
      noWrap,
      children,
      ...rest
    } = props

    // Determine the MUI Typography variant based on our custom variant
    const muiVariant = variantToMuiVariant[variant]

    // Determine the default component if not specified
    const defaultComponent = component || (variant === 'body' || variant === 'small' ? 'p' : variant === 'display' ? 'h1' : variant)

    return (
      <StyledTypography
        ref={ref}
        variant={muiVariant as any}
        component={defaultComponent}
        color={color}
        align={align}
        gutterBottom={gutterBottom}
        noWrap={noWrap}
        weight={weight}
        lineHeight={lineHeight}
        {...rest}
      >
        {children}
      </StyledTypography>
    )
  }
)

ResponsiveText.displayName = 'ResponsiveText'

/**
 * Shorthand components for common text variants
 */

/**
 * DisplayText - Extra large display text (hero sections, landing pages)
 */
export const DisplayText = forwardRef<HTMLElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="display" {...props} />
)
DisplayText.displayName = 'DisplayText'

/**
 * Heading1 - Main page heading (H1)
 */
export const Heading1 = forwardRef<HTMLElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="h1" weight="bold" {...props} />
)
Heading1.displayName = 'Heading1'

/**
 * Heading2 - Section heading (H2)
 */
export const Heading2 = forwardRef<HTMLElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="h2" weight="semibold" {...props} />
)
Heading2.displayName = 'Heading2'

/**
 * Heading3 - Subsection heading (H3)
 */
export const Heading3 = forwardRef<HTMLElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="h3" weight="semibold" {...props} />
)
Heading3.displayName = 'Heading3'

/**
 * Heading4 - Minor heading (H4)
 */
export const Heading4 = forwardRef<HTMLElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="h4" weight="medium" {...props} />
)
Heading4.displayName = 'Heading4'

/**
 * BodyText - Standard body text
 */
export const BodyText = forwardRef<HTMLElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="body" lineHeight="relaxed" {...props} />
)
BodyText.displayName = 'BodyText'

/**
 * SmallText - Small text (captions, labels, secondary info)
 */
export const SmallText = forwardRef<HTMLElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="small" {...props} />
)
SmallText.displayName = 'SmallText'
