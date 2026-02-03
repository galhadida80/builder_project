import {
  FormControl,
  InputLabel,
  Select as MuiSelect,
  SelectProps as MuiSelectProps,
  MenuItem,
  FormHelperText,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { SelectInputBaseProps, SelectOption } from './types'

export interface SelectInputProps<T = string> extends SelectInputBaseProps<T> {
  /**
   * Additional Material UI Select props
   */
  SelectProps?: Omit<MuiSelectProps<T | T[]>, 'value' | 'onChange' | 'error' | 'label' | 'required' | 'disabled' | 'multiple'>
}

const StyledFormControl = styled(FormControl)(({ theme }) => ({
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
  '& .MuiSelect-select': {
    fontSize: '0.875rem',
  },
}))

/**
 * SelectInput component for dropdown selections
 *
 * Wraps Material UI Select with custom styling and simplified onChange API.
 * Supports both single and multiple selection modes.
 */
export function SelectInput<T = string>({
  label,
  value,
  onChange,
  options,
  error,
  helperText,
  required = false,
  disabled = false,
  multiple = false,
  id,
  name,
  className,
  SelectProps,
}: SelectInputProps<T>) {
  const handleChange = (event: any) => {
    onChange(event.target.value as T | T[])
  }

  return (
    <StyledFormControl
      fullWidth
      error={!!error}
      required={required}
      disabled={disabled}
      className={className}
      variant="outlined"
    >
      {label && <InputLabel id={id ? `${id}-label` : undefined}>{label}</InputLabel>}
      <MuiSelect
        id={id}
        name={name}
        labelId={id ? `${id}-label` : undefined}
        label={label}
        value={value}
        onChange={handleChange}
        multiple={multiple}
        {...SelectProps}
      >
        {options.map((option) => (
          <MenuItem key={String(option.value)} value={option.value as any} disabled={option.disabled}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {(error || helperText) && <FormHelperText>{error || helperText}</FormHelperText>}
    </StyledFormControl>
  )
}
