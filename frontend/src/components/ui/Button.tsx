import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material'
import { styled } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { scaleIn, duration, easing } from '@/utils/animations'

export interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success'
  loading?: boolean
  success?: boolean
  icon?: React.ReactNode
  iconPosition?: 'start' | 'end'
}

const StyledButton = styled(MuiButton)(() => ({
  fontWeight: 600,
  minHeight: 44,
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
  '@media (hover: none) and (pointer: coarse)': {
    '&:active': {
      opacity: 0.85,
    },
  },
}))

const AnimatedCheckIcon = styled(CheckCircleIcon)(() => ({
  animation: `${scaleIn} ${duration.normal}ms ${easing.decelerate}`,
  '@keyframes draw-circle': {
    from: {
      strokeDashoffset: 1,
    },
    to: {
      strokeDashoffset: 0,
    },
  },
  '& path': {
    strokeDasharray: '1',
    strokeDashoffset: '0',
    animation: `draw-circle ${duration.slow}ms ${easing.decelerate}`,
  },
}))

export function Button({
  variant = 'primary',
  loading = false,
  success = false,
  icon,
  iconPosition = 'start',
  children,
  disabled,
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

  // Determine which icon to show based on state priority: success > loading > custom icon
  const getStartIcon = () => {
    if (success && iconPosition === 'start') {
      return <AnimatedCheckIcon fontSize="small" />
    }
    if (loading) {
      return <CircularProgress size={18} color="inherit" />
    }
    if (icon && iconPosition === 'start') {
      return icon
    }
    return undefined
  }

  const getEndIcon = () => {
    if (success && iconPosition === 'end') {
      return <AnimatedCheckIcon fontSize="small" />
    }
    if (icon && iconPosition === 'end') {
      return icon
    }
    return undefined
  }

  return (
    <StyledButton
      variant={getMuiVariant()}
      color={getColor()}
      disabled={disabled || loading}
      startIcon={getStartIcon()}
      endIcon={getEndIcon()}
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
  ...props
}: Omit<ButtonProps, 'icon' | 'iconPosition'>) {
  return (
    <StyledButton
      variant="contained"
      color="primary"
      disabled={props.disabled || loading}
      sx={{
        minWidth: 44,
        minHeight: 44,
        p: 1,
        ...props.sx,
      }}
      {...props}
    >
      {loading ? <CircularProgress size={20} color="inherit" /> : children}
    </StyledButton>
  )
}
