import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps, InputAdornment, styled } from '@/mui'

export interface TextFieldProps extends Omit<MuiTextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled'
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

const StyledTextField = styled(MuiTextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    transition: 'border-color 200ms ease-out',
    minHeight: 48,
    '&:hover': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
      },
    },
    '&.Mui-focused': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderWidth: 2,
      },
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem',
  },
  '& .MuiInputBase-input': {
    fontSize: '0.875rem',
    textAlign: 'start',
    padding: '12px 14px',
  },
  '& .MuiInputAdornment-root': {
    marginTop: '0 !important',
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
  const { sx, inputProps, ...rest } = props
  return (
    <TextField
      type="search"
      placeholder="Search..."
      size="small"
      inputProps={{ 'aria-label': 'Search', ...inputProps }}
      sx={{
        minWidth: 200,
        '& .MuiOutlinedInput-root': {
          bgcolor: 'action.hover',
          '&:hover': {
            bgcolor: 'action.selected',
          },
        },
        ...sx,
      }}
      {...rest}
    />
  )
}
