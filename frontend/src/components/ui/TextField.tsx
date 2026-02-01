import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps, InputAdornment } from '@mui/material'
import { styled } from '@mui/material/styles'
import { animations, transitions } from '../../theme/tokens'
import { shake, fadeIn } from '../../utils/animations'

export interface TextFieldProps extends Omit<MuiTextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled'
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

const StyledTextField = styled(MuiTextField)(({ theme, error }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    transition: `all ${animations.duration.normal}ms ${animations.easing.standard}`,
    ...(error && {
      animation: `${shake} 500ms cubic-bezier(0.4, 0.0, 0.6, 1)`,
    }),
    '&:hover:not(.Mui-disabled)': {
      transform: 'translateY(-1px)',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: 1.5,
      },
    },
    '&.Mui-focused': {
      transform: 'translateY(-2px)',
      boxShadow: `0 4px 12px ${
        theme.palette.mode === 'light'
          ? 'rgba(3, 105, 161, 0.15)'
          : 'rgba(2, 132, 199, 0.25)'
      }`,
      '& .MuiOutlinedInput-notchedOutline': {
        borderWidth: 2,
        borderColor: theme.palette.primary.main,
      },
    },
    '&.Mui-disabled': {
      opacity: 0.6,
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem',
    transition: `all ${transitions.fast}`,
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },
  '& .MuiInputBase-input': {
    fontSize: '0.875rem',
    transition: `all ${transitions.fast}`,
  },
  '& .MuiFormHelperText-root': {
    animation: error ? `${fadeIn} 250ms cubic-bezier(0.0, 0.0, 0.2, 1)` : 'none',
    fontSize: '0.75rem',
  },
}))

export function TextField({
  variant = 'outlined',
  startIcon,
  endIcon,
  InputProps,
  ...props
}: TextFieldProps) {
  return (
    <StyledTextField
      variant={variant}
      InputProps={{
        ...InputProps,
        startAdornment: startIcon ? (
          <InputAdornment position="start">{startIcon}</InputAdornment>
        ) : InputProps?.startAdornment,
        endAdornment: endIcon ? (
          <InputAdornment position="end">{endIcon}</InputAdornment>
        ) : InputProps?.endAdornment,
      }}
      {...props}
    />
  )
}

export function SearchField(props: Omit<TextFieldProps, 'type'>) {
  return (
    <TextField
      type="search"
      placeholder="Search..."
      size="small"
      sx={{
        minWidth: 200,
        '& .MuiOutlinedInput-root': {
          bgcolor: 'action.hover',
          '&:hover': {
            bgcolor: 'action.selected',
          },
        },
        ...props.sx,
      }}
      {...props}
    />
  )
}
