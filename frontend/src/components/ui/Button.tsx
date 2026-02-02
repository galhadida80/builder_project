import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material'
import { styled } from '@mui/material/styles'
import { hapticFeedback } from '../../utils/hapticFeedback'

export interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'start' | 'end'
}

const StyledButton = styled(MuiButton)(() => ({
  fontWeight: 600,
  transition: 'all 200ms ease-out',
  touchAction: 'manipulation',
  '&:hover': {
    transform: 'translateY(-1px)',
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&.Mui-disabled': {
    transform: 'none',
  },
}))

export function Button({
  variant = 'primary',
  loading = false,
  icon,
  iconPosition = 'start',
  children,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const getMuiVariant = (): MuiButtonProps['variant'] => {
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'success':
        return 'contained'
      case 'secondary':
        return 'outlined'
      case 'tertiary':
        return 'text'
      default:
        return 'contained'
    }
  }

  const getColor = (): MuiButtonProps['color'] => {
    switch (variant) {
      case 'primary':
        return 'primary'
      case 'secondary':
        return 'primary'
      case 'tertiary':
        return 'primary'
      case 'danger':
        return 'error'
      case 'success':
        return 'success'
      default:
        return 'primary'
    }
  }

  const startIcon = icon && iconPosition === 'start' ? icon : undefined
  const endIcon = icon && iconPosition === 'end' ? icon : undefined

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback on button press (only if not disabled)
    if (!disabled && !loading) {
      hapticFeedback('light')
    }
    // Call the original onClick handler if provided
    onClick?.(event)
  }

  return (
    <StyledButton
      variant={getMuiVariant()}
      color={getColor()}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : startIcon}
      endIcon={endIcon}
      onClick={handleClick}
      {...props}
    >
      {children}
    </StyledButton>
  )
}

export function IconButton({
  children,
  loading = false,
  variant: _,
  onClick,
  ...props
}: Omit<ButtonProps, 'icon' | 'iconPosition'>) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback on button press (only if not disabled)
    if (!props.disabled && !loading) {
      hapticFeedback('light')
    }
    // Call the original onClick handler if provided
    onClick?.(event)
  }

  return (
    <StyledButton
      variant="contained"
      color="primary"
      disabled={props.disabled || loading}
      sx={{
        minWidth: 'auto',
        p: 1,
        ...props.sx,
      }}
      onClick={handleClick}
      {...props}
    >
      {loading ? <CircularProgress size={20} color="inherit" /> : children}
    </StyledButton>
  )
}
