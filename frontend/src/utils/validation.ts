export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 255,
  MAX_CODE_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_NOTES_LENGTH: 5000,
  MAX_PHONE_LENGTH: 30,
  MAX_ADDRESS_LENGTH: 500,
}

export const validateRequired = (value: string | undefined | null, fieldName: string): string | null => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`
  }
  return null
}

export const validateMinLength = (value: string | undefined | null, min: number, fieldName: string): string | null => {
  if (value && value.trim().length < min) {
    return `${fieldName} must be at least ${min} characters`
  }
  return null
}

export const validateMaxLength = (value: string | undefined | null, max: number, fieldName: string): string | null => {
  if (value && value.length > max) {
    return `${fieldName} must be less than ${max} characters`
  }
  return null
}

export const validateCode = (value: string | undefined | null, fieldName: string): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9\-_]*[A-Za-z0-9]?$/.test(trimmed)) {
    return `${fieldName} must contain only letters, numbers, hyphens, and underscores`
  }
  return null
}

export const validatePhone = (value: string | undefined | null): string | null => {
  if (!value) return null
  if (!/^[\d\s\-\+\(\)\.]+$/.test(value)) {
    return 'Phone must contain only digits, spaces, and standard phone characters'
  }
  return null
}

export const validateEmail = (value: string | undefined | null): string | null => {
  if (!value) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Please enter a valid email address'
  }
  return null
}

export const validatePositiveNumber = (value: number | undefined | null, fieldName: string): string | null => {
  if (value !== undefined && value !== null && value < 0) {
    return `${fieldName} must be a positive number`
  }
  return null
}

export const validateDateRange = (
  startDate: string | undefined | null,
  endDate: string | undefined | null,
  startFieldName: string,
  endFieldName: string
): string | null => {
  if (!startDate || !endDate) return null

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid date format'
  }

  if (end < start) {
    return `${endFieldName} must be after ${startFieldName}`
  }

  return null
}

export interface ValidationError {
  [field: string]: string | null
}

export const validateProjectForm = (data: { name?: string; code?: string; description?: string; address?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Project Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Project Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Project Name')

  errors.code = validateRequired(data.code, 'Project Code')
    || validateCode(data.code, 'Project Code')
    || validateMaxLength(data.code, VALIDATION.MAX_CODE_LENGTH, 'Project Code')

  errors.description = validateMaxLength(data.description, VALIDATION.MAX_DESCRIPTION_LENGTH, 'Description')
  errors.address = validateMaxLength(data.address, VALIDATION.MAX_ADDRESS_LENGTH, 'Address')

  return errors
}

export const validateEquipmentForm = (data: { name?: string; notes?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Equipment Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Equipment Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Equipment Name')

  errors.notes = validateMaxLength(data.notes, VALIDATION.MAX_NOTES_LENGTH, 'Notes')

  return errors
}

export const validateMaterialForm = (data: { name?: string; notes?: string; quantity?: number }): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Material Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Material Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Material Name')

  errors.notes = validateMaxLength(data.notes, VALIDATION.MAX_NOTES_LENGTH, 'Notes')
  errors.quantity = validatePositiveNumber(data.quantity, 'Quantity')

  return errors
}

export const validateContactForm = (data: { contact_name?: string; email?: string; phone?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.contact_name = validateRequired(data.contact_name, 'Contact Name')
    || validateMinLength(data.contact_name, VALIDATION.MIN_NAME_LENGTH, 'Contact Name')
    || validateMaxLength(data.contact_name, VALIDATION.MAX_NAME_LENGTH, 'Contact Name')

  errors.email = validateEmail(data.email)
  errors.phone = validatePhone(data.phone)

  return errors
}

export const validateMeetingForm = (data: { title?: string; description?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.title = validateRequired(data.title, 'Meeting Title')
    || validateMinLength(data.title, VALIDATION.MIN_NAME_LENGTH, 'Meeting Title')
    || validateMaxLength(data.title, VALIDATION.MAX_NAME_LENGTH, 'Meeting Title')

  errors.description = validateMaxLength(data.description, VALIDATION.MAX_DESCRIPTION_LENGTH, 'Description')

  return errors
}

export const hasErrors = (errors: ValidationError): boolean => {
  return Object.values(errors).some(error => error !== null)
}
