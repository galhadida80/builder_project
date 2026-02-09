import { DatePicker, DatePickerProps as MuiDatePickerProps } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { FormControl, FormHelperText } from '@mui/material'
import { styled } from '@mui/material'
import { DatePickerInputBaseProps } from './types'
import dayjs, { Dayjs } from 'dayjs'

export interface DatePickerInputProps extends Omit<DatePickerInputBaseProps, 'onChange'> {
  /**
   * Callback fired when the date changes
   */
  onChange: (date: Date | null) => void
  /**
   * Additional Material UI DatePicker props
   */
  DatePickerProps?: Omit<MuiDatePickerProps<Dayjs>, 'value' | 'onChange' | 'label' | 'disabled' | 'minDate' | 'maxDate'>
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
  '& .MuiInputBase-input': {
    fontSize: '0.875rem',
  },
}))

/**
 * DatePickerInput component for date selection
 *
 * Wraps Material UI DatePicker with custom styling and simplified onChange API.
 * Uses dayjs for date handling and supports min/max date validation.
 */
export function DatePickerInput({
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  id,
  name,
  className,
  DatePickerProps,
}: DatePickerInputProps) {
  const handleChange = (newValue: Dayjs | null) => {
    onChange(newValue ? newValue.toDate() : null)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <StyledFormControl
        fullWidth
        error={!!error}
        required={required}
        disabled={disabled}
        className={className}
      >
        <DatePicker
          label={label}
          value={value ? dayjs(value) : null}
          onChange={handleChange}
          disabled={disabled}
          minDate={minDate ? dayjs(minDate) : undefined}
          maxDate={maxDate ? dayjs(maxDate) : undefined}
          slotProps={{
            textField: {
              id,
              name,
              error: !!error,
              required,
              fullWidth: true,
            },
          }}
          {...DatePickerProps}
        />
        {(error || helperText) && <FormHelperText>{error || helperText}</FormHelperText>}
      </StyledFormControl>
    </LocalizationProvider>
  )
}
