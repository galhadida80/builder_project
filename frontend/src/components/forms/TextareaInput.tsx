import { TextInputBaseProps } from './types'
import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps, styled } from '@/mui'

export interface TextareaInputProps extends Omit<TextInputBaseProps, 'onChange'> {
  /**
   * Callback fired when the value changes
   */
  onChange: (value: string) => void
  /**
   * Number of rows to display
   */
  rows?: number
  /**
   * Maximum number of rows to display before scrolling
   */
  maxRows?: number
  /**
   * Additional Material UI TextField props
   */
  TextFieldProps?: Omit<MuiTextFieldProps, 'value' | 'onChange' | 'error' | 'helperText' | 'required' | 'disabled' | 'label' | 'placeholder' | 'multiline' | 'rows' | 'maxRows'>
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
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem',
  },
  '& .MuiInputBase-input': {
    fontSize: '0.875rem',
  },
}))

/**
 * TextareaInput component for multi-line text entry
 *
 * Wraps Material UI TextField with multiline support, custom styling and simplified onChange API
 */
export function TextareaInput({
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  placeholder,
  rows = 4,
  maxRows,
  id,
  name,
  className,
  TextFieldProps,
}: TextareaInputProps) {
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
      multiline
      rows={rows}
      maxRows={maxRows}
      variant="outlined"
      fullWidth
      {...TextFieldProps}
    />
  )
}
