/**
 * Shared TypeScript types and interfaces for form input components
 */

/**
 * Base props shared by all form input components
 */
export interface BaseInputProps {
  /**
   * Label text displayed above the input
   */
  label: string
  /**
   * Error message to display below the input
   */
  error?: string
  /**
   * Helper text to display below the input (when no error is present)
   */
  helperText?: string
  /**
   * Whether the field is required
   */
  required?: boolean
  /**
   * Whether the field is disabled
   */
  disabled?: boolean
  /**
   * Unique identifier for the input field
   */
  id?: string
  /**
   * Name attribute for the input field
   */
  name?: string
  /**
   * CSS class name for custom styling
   */
  className?: string
}

/**
 * Option shape for SelectInput component
 */
export interface SelectOption<T = string> {
  /**
   * Display label for the option
   */
  label: string
  /**
   * Value of the option
   */
  value: T
  /**
   * Whether this option is disabled
   */
  disabled?: boolean
}

/**
 * File input value type - can be single file, multiple files, or null
 */
export type FileInputValue = File | File[] | null

/**
 * Props for text-based inputs (TextInput, TextareaInput)
 */
export interface TextInputBaseProps extends BaseInputProps {
  /**
   * Current value of the input
   */
  value: string
  /**
   * Callback fired when the value changes
   */
  onChange: (value: string) => void
  /**
   * Placeholder text when input is empty
   */
  placeholder?: string
}

/**
 * Props for selection inputs (SelectInput)
 */
export interface SelectInputBaseProps<T = string> extends BaseInputProps {
  /**
   * Current selected value(s)
   */
  value: T | T[]
  /**
   * Callback fired when selection changes
   */
  onChange: (value: T | T[]) => void
  /**
   * Array of available options
   */
  options: SelectOption<T>[]
  /**
   * Whether multiple values can be selected
   */
  multiple?: boolean
}

/**
 * Props for checkbox inputs
 */
export interface CheckboxInputBaseProps extends BaseInputProps {
  /**
   * Whether the checkbox is checked
   */
  checked: boolean
  /**
   * Callback fired when checked state changes
   */
  onChange: (checked: boolean) => void
  /**
   * Whether the checkbox is in an indeterminate state
   */
  indeterminate?: boolean
}

/**
 * Props for date picker inputs
 */
export interface DatePickerInputBaseProps extends BaseInputProps {
  /**
   * Current date value (or null if no date selected)
   */
  value: Date | null
  /**
   * Callback fired when date changes
   */
  onChange: (date: Date | null) => void
  /**
   * Minimum selectable date
   */
  minDate?: Date
  /**
   * Maximum selectable date
   */
  maxDate?: Date
}

/**
 * Props for file upload inputs
 */
export interface FileUploadInputBaseProps extends BaseInputProps {
  /**
   * Current file(s) value
   */
  value: FileInputValue
  /**
   * Callback fired when file(s) change
   */
  onChange: (files: FileInputValue) => void
  /**
   * Accepted file types (e.g., 'image/*', '.pdf', etc.)
   */
  accept?: string | string[]
  /**
   * Whether multiple files can be uploaded
   */
  multiple?: boolean
  /**
   * Maximum file size in bytes
   */
  maxSize?: number
}
