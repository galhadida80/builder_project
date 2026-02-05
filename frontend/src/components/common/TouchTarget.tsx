import { Box, BoxProps } from '@mui/material'
import { styled } from '@mui/material/styles'
import { forwardRef } from 'react'

export interface TouchTargetProps extends BoxProps {
  /**
   * Size variant for the touch target
   * - min: 44x44px (WCAG AAA minimum)
   * - comfortable: 48x48px (more comfortable for touch)
   * - large: 56px (extra large for critical actions)
   */
  size?: 'min' | 'comfortable' | 'large'

  /**
   * Whether to center the content within the touch target
   */
  centered?: boolean

  /**
   * Whether the touch target should be inline (inline-flex) or block (flex)
   */
  inline?: boolean

  /**
   * Whether to show focus ring for keyboard navigation
   */
  showFocusRing?: boolean

  /**
   * Link href for TouchTargetLink
   */
  href?: string

  /**
   * Button type for TouchTargetButton
   */
  type?: 'button' | 'submit' | 'reset'
}

const sizeMap = {
  min: 44,
  comfortable: 48,
  large: 56,
}

const StyledTouchTarget = styled(Box, {
  shouldForwardProp: (prop) =>
    !['size', 'centered', 'inline', 'showFocusRing'].includes(prop as string),
})<TouchTargetProps>(({ theme, size = 'min', centered = true, inline = false, showFocusRing = true }) => {
  const targetSize = sizeMap[size]

  return {
    // Minimum touch target size
    minWidth: `${targetSize}px`,
    minHeight: `${targetSize}px`,

    // Layout
    display: inline ? 'inline-flex' : 'flex',
    alignItems: centered ? 'center' : 'flex-start',
    justifyContent: centered ? 'center' : 'flex-start',

    // Touch behavior
    touchAction: 'manipulation', // Disable double-tap zoom
    WebkitTapHighlightColor: 'transparent', // Remove iOS tap highlight
    cursor: 'pointer',
    userSelect: 'none',

    // Smooth transitions
    transition: theme.transitions.create(
      ['background-color', 'box-shadow', 'transform'],
      {
        duration: theme.transitions.duration.short,
      }
    ),

    // Focus-visible styles for keyboard navigation
    ...(showFocusRing && {
      '&:focus-visible': {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: '2px',
        borderRadius: theme.shape.borderRadius,
      },
    }),

    // Active state feedback
    '&:active': {
      transform: 'scale(0.98)',
    },

    // Disabled state
    '&[aria-disabled="true"], &:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
  }
})

/**
 * TouchTarget - A wrapper component for custom interactive elements
 *
 * Ensures WCAG 2.1 Level AAA compliance with minimum 44x44px touch targets.
 * Use this component to wrap custom interactive elements (icons, links, etc.)
 * that don't use MUI components with built-in touch target sizing.
 *
 * @example
 * // Basic usage with icon
 * <TouchTarget onClick={handleClick} aria-label="Delete item">
 *   <DeleteIcon />
 * </TouchTarget>
 *
 * @example
 * // Comfortable size with custom styling
 * <TouchTarget
 *   size="comfortable"
 *   onClick={handleClick}
 *   sx={{ borderRadius: '50%', bgcolor: 'primary.main' }}
 * >
 *   <StarIcon sx={{ color: 'white' }} />
 * </TouchTarget>
 *
 * @example
 * // Inline usage in text
 * <Typography>
 *   Click the
 *   <TouchTarget inline size="min" onClick={handleInfo}>
 *     <InfoIcon fontSize="small" />
 *   </TouchTarget>
 *   icon for more information.
 * </Typography>
 */
export const TouchTarget = forwardRef<HTMLDivElement, TouchTargetProps>(
  (props, ref) => {
    const {
      size = 'min',
      centered = true,
      inline = false,
      showFocusRing = true,
      role = 'button',
      tabIndex = 0,
      children,
      ...rest
    } = props

    return (
      <StyledTouchTarget
        ref={ref}
        role={role}
        tabIndex={tabIndex}
        size={size}
        centered={centered}
        inline={inline}
        showFocusRing={showFocusRing}
        {...rest}
      >
        {children}
      </StyledTouchTarget>
    )
  }
)

TouchTarget.displayName = 'TouchTarget'

/**
 * TouchTargetLink - A specialized TouchTarget for link elements
 *
 * Use this for custom link elements that need touch target compliance.
 * Renders as a link element (<a>) with proper touch target sizing.
 */
export const TouchTargetLink = forwardRef<HTMLAnchorElement, TouchTargetProps & { href: string }>(
  ({ href, ...props }, ref) => {
    return (
      <TouchTarget
        ref={ref as any}
        component="a"
        href={href}
        role="link"
        {...props}
      />
    )
  }
)

TouchTargetLink.displayName = 'TouchTargetLink'

/**
 * TouchTargetButton - A specialized TouchTarget for button elements
 *
 * Use this for custom button elements that need touch target compliance.
 * Renders as a button element with proper touch target sizing.
 */
export const TouchTargetButton = forwardRef<HTMLButtonElement, TouchTargetProps & { type?: 'button' | 'submit' | 'reset' }>(
  ({ type = 'button', ...props }, ref) => {
    return (
      <TouchTarget
        ref={ref as any}
        component="button"
        type={type}
        role="button"
        {...props}
      />
    )
  }
)

TouchTargetButton.displayName = 'TouchTargetButton'
