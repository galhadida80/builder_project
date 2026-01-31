import {
  Checkbox as MuiCheckbox,
  CheckboxProps as MuiCheckboxProps,
  FormControlLabel,
  FormControl,
  FormHelperText,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { CheckboxInputBaseProps } from './types'

export interface CheckboxInputProps extends CheckboxInputBaseProps {
  /**
   * Additional Material UI Checkbox props
   */
  CheckboxProps?: Omit<MuiCheckboxProps, 'checked' | 'onChange' | 'disabled' | 'required' | 'indeterminate'>
}

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiFormControlLabel-root': {
    marginLeft: 0,
    marginRight: 0,
  },
  '& .MuiCheckbox-root': {
    transition: 'all 200ms ease-out',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  '& .MuiFormControlLabel-label': {
    fontSize: '0.875rem',
  },
}))

/**
 * CheckboxInput component for boolean checkbox inputs
 *
 * Wraps Material UI Checkbox with FormControlLabel and custom styling.
 * Supports checked, indeterminate states, and simplified onChange API.
 */
export function CheckboxInput({
  label,
  checked,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  indeterminate = false,
  id,
  name,
  className,
  CheckboxProps,
}: CheckboxInputProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked)
  }

  return (
    <StyledFormControl
      error={!!error}
      required={required}
      disabled={disabled}
      className={className}
      component="fieldset"
      variant="standard"
    >
      <FormControlLabel
        control={
          <MuiCheckbox
            id={id}
            name={name}
            checked={checked}
            onChange={handleChange}
            indeterminate={indeterminate}
            {...CheckboxProps}
          />
        }
        label={label}
      />
      {(error || helperText) && <FormHelperText>{error || helperText}</FormHelperText>}
    </StyledFormControl>
  )
}
