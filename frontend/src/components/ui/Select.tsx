import {
  FormControl,
  InputLabel,
  Select as MuiSelect,
  SelectProps as MuiSelectProps,
  MenuItem,
  FormHelperText,
  Fade,
} from '@mui/material'
import { styled } from '@mui/material'
import { transitions, animations, borderRadius } from '../../theme/tokens'

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
    borderRadius: borderRadius.md,
    transition: `all ${transitions.normal}`,
    '&:hover': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
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
    transition: `all ${transitions.fast}`,
  },
  '& .MuiSelect-select': {
    fontSize: '0.875rem',
    textAlign: 'start',
  },
}))

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  fontSize: '0.875rem',
  padding: '10px 16px',
  transition: `background-color ${transitions.fast}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&.Mui-selected': {
    backgroundColor: theme.palette.action.selected,
    '&:hover': {
      backgroundColor: theme.palette.action.selected,
      opacity: 0.9,
    },
  },
  '&.Mui-disabled': {
    opacity: 0.5,
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
      <MuiSelect
        label={label}
        MenuProps={{
          TransitionComponent: Fade,
          transitionDuration: animations.duration.normal,
          PaperProps: {
            sx: {
              borderRadius: `${borderRadius.md}px`,
              marginTop: 1,
              maxHeight: 400,
            },
          },
        }}
        {...props}
      >
        {options.map((option) => (
          <StyledMenuItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </StyledMenuItem>
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
