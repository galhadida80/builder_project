import { TextInputBaseProps } from './types'
import { shake } from '@/utils/animations'
import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps, styled } from '@/mui'

export interface TextInputProps extends Omit<TextInputBaseProps, 'onChange'> {
  /**
   * Callback fired when the value changes
   */
  onChange: (value: string) => void
  /**
   * Input type (text, email, password, etc.)
   */
  type?: string
  /**
   * Additional Material UI TextField props
   */
  TextFieldProps?: Omit<MuiTextFieldProps, 'value' | 'onChange' | 'error' | 'helperText' | 'required' | 'disabled' | 'label' | 'placeholder' | 'type'>
}

const StyledTextField = styled(MuiTextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    transition: 'all 200ms ease-out',
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
    '&.Mui-error': {
      animation: `${shake} 500ms cubic-bezier(0.4, 0.0, 0.6, 1)`,
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
  },
}))

/**
 * TextInput component for single-line text entry
 *
 * Wraps Material UI TextField with custom styling and simplified onChange API
 */
export function TextInput({
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  placeholder,
  type = 'text',
  id,
  name,
  className,
  TextFieldProps,
}: TextInputProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }

  return (
    <StyledTextField
      id={id}
      name={name}
      className={className}
      label={label}
      value={value}
      onChange={handleChange}
      error={!!error}
      helperText={error || helperText}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      type={type}
      variant="outlined"
      fullWidth
      {...TextFieldProps}
    />
  )
}
