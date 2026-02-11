import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress, styled } from '@/mui'

export interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'start' | 'end'
  href?: string
  target?: string
  rel?: string
}

const StyledButton = styled(MuiButton)(({ theme }) => ({
  fontWeight: 600,
  transition: 'background-color 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out',
  touchAction: 'manipulation',
}))

export function Button({
  variant = 'primary',
  loading = false,
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

  const startIcon = icon && iconPosition === 'start' ? icon : undefined
  const endIcon = icon && iconPosition === 'end' ? icon : undefined

  return (
    <StyledButton
      variant={getMuiVariant()}
      color={getColor()}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : startIcon}
      endIcon={endIcon}
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
      {...props}
      sx={{
        minWidth: '36px',
        width: '36px',
        height: '36px',
        p: 0.75,
        ...props.sx,
      }}
    >
      {loading ? <CircularProgress size={20} color="inherit" /> : children}
    </StyledButton>
  )
}
