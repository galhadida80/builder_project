import {
  FormControl,
  InputLabel,
  Select as MuiSelect,
  SelectProps as MuiSelectProps,
  MenuItem,
  FormHelperText,
} from '@mui/material'
import { styled } from '@mui/material/styles'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<MuiSelectProps, 'variant'> {
  options: SelectOption[]
  helperText?: string
  variant?: 'outlined' | 'filled'
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
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem',
  },
  '& .MuiSelect-select': {
    fontSize: '0.875rem',
    textAlign: 'start',
  },
}))

export function Select({
  options,
  label,
  helperText,
  error,
  fullWidth = true,
  size = 'medium',
  variant = 'outlined',
  ...props
}: SelectProps) {
  return (
    <StyledFormControl fullWidth={fullWidth} error={error} size={size} variant={variant}>
      {label && <InputLabel>{label}</InputLabel>}
      <MuiSelect label={label} {...props}>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </StyledFormControl>
  )
}

export function StatusSelect({
  value,
  onChange,
  ...props
}: Omit<SelectProps, 'options'>) {
  const statusOptions: SelectOption[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  return <Select options={statusOptions} value={value} onChange={onChange} {...props} />
}

export function PrioritySelect({
  value,
  onChange,
  ...props
}: Omit<SelectProps, 'options'>) {
  const priorityOptions: SelectOption[] = [
    { value: 1, label: 'Urgent' },
    { value: 2, label: 'High' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Low' },
  ]

  return <Select options={priorityOptions} value={value} onChange={onChange} {...props} />
}
