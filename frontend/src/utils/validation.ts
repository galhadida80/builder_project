export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 255,
  MAX_CODE_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_NOTES_LENGTH: 5000,
  MAX_PHONE_LENGTH: 30,
  MAX_ADDRESS_LENGTH: 500,
  MAX_SERIAL_NUMBER_LENGTH: 100,
  MAX_TYPE_LENGTH: 100,
  MAX_MANUFACTURER_LENGTH: 255,
  MAX_MODEL_NUMBER_LENGTH: 100,
  MAX_UNIT_LENGTH: 50,
  MAX_LOCATION_LENGTH: 255,
  MAX_ROLE_DESCRIPTION_LENGTH: 2000,
  MAX_CONTACT_TYPE_LENGTH: 50,
  MAX_COMPANY_NAME_LENGTH: 255,
  MAX_MEETING_TYPE_LENGTH: 50,
  MAX_SUBJECT_LENGTH: 500,
  MAX_QUESTION_LENGTH: 5000,
  MAX_DRAWING_REF_LENGTH: 255,
  MAX_SPEC_REF_LENGTH: 255,
  MAX_TO_NAME_LENGTH: 255,
  MIN_SUBJECT_LENGTH: 2,
  MIN_QUESTION_LENGTH: 2,
}

const DANGEROUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>/gi,
  /<img[^>]*>/gi,
  /<svg[^>]*>.*?<\/svg>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  /<style[^>]*>.*?<\/style>/gi,
]

export const sanitizeString = (value: string | undefined | null): string => {
  if (!value) return ''
  let sanitized = value.trim()
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }
  return sanitized
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

export const validateNumberRange = (value: number | undefined | null, min: number, max: number, fieldName: string): string | null => {
  if (value === undefined || value === null) return null
  if (value < min || value > max) {
    return `${fieldName} must be between ${min} and ${max}`
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

export const validateSerialNumber = (value: string | undefined | null, fieldName: string): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9\-_]*[A-Za-z0-9]?$/.test(trimmed)) {
    return `${fieldName} must contain only letters, numbers, hyphens, and underscores`
  }
  return null
}

export const validatePhone = (value: string | undefined | null): string | null => {
  if (!value || !value.trim()) return null
  if (!/^[\d\s\-+().]+$/.test(value)) {
    return 'Phone must contain only digits, spaces, and standard phone characters'
  }
  let digits = value.replace(/[\s\-().]/g, '')
  if (digits.startsWith('+972')) {
    digits = '0' + digits.slice(4)
  } else if (digits.startsWith('972')) {
    digits = '0' + digits.slice(3)
  }
  if (!/^0[2-9]\d{7,8}$/.test(digits)) {
    return 'Please enter a valid Israeli phone number (e.g. 050-1234567, 02-1234567)'
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

export const validateRequiredEmail = (value: string | undefined | null, fieldName: string): string | null => {
  return validateRequired(value, fieldName) || validateEmail(value)
}

export const validatePositiveNumber = (value: number | undefined | null, fieldName: string): string | null => {
  if (value !== undefined && value !== null && value < 0) {
    return `${fieldName} must be a positive number`
  }
  return null
}

export const validateDateRange = (startDate: string | undefined | null, endDate: string | undefined | null): string | null => {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (end < start) {
    return 'End date must be after start date'
  }
  return null
}

const RFI_CATEGORIES = ['design', 'structural', 'mep', 'architectural', 'specifications', 'schedule', 'cost', 'other']
const RFI_PRIORITIES = ['low', 'medium', 'high', 'urgent']

export const validateEnum = (value: string | undefined | null, allowed: string[], fieldName: string): string | null => {
  if (!value) return null
  if (!allowed.includes(value)) {
    return `${fieldName} must be one of: ${allowed.join(', ')}`
  }
  return null
}

export interface ValidationError {
  [field: string]: string | null
}

export const validateProjectForm = (data: { name?: string; code?: string; description?: string; address?: string; startDate?: string; estimatedEndDate?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Project Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Project Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Project Name')

  errors.code = validateRequired(data.code, 'Project Code')
    || validateCode(data.code, 'Project Code')
    || validateMaxLength(data.code, VALIDATION.MAX_CODE_LENGTH, 'Project Code')

  errors.description = validateMaxLength(data.description, VALIDATION.MAX_DESCRIPTION_LENGTH, 'Description')
  errors.address = validateMaxLength(data.address, VALIDATION.MAX_ADDRESS_LENGTH, 'Address')
  errors.estimatedEndDate = validateDateRange(data.startDate, data.estimatedEndDate)

  return errors
}

export const validateEquipmentForm = (data: { name?: string; notes?: string; serialNumber?: string; equipment_type?: string; manufacturer?: string; model_number?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Equipment Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Equipment Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Equipment Name')

  errors.serialNumber = validateSerialNumber(data.serialNumber, 'Serial Number')
    || validateMaxLength(data.serialNumber, VALIDATION.MAX_SERIAL_NUMBER_LENGTH, 'Serial Number')

  errors.equipment_type = validateMaxLength(data.equipment_type, VALIDATION.MAX_TYPE_LENGTH, 'Type')
  errors.manufacturer = validateMaxLength(data.manufacturer, VALIDATION.MAX_MANUFACTURER_LENGTH, 'Manufacturer')
  errors.model_number = validateMaxLength(data.model_number, VALIDATION.MAX_MODEL_NUMBER_LENGTH, 'Model')
  errors.notes = validateMaxLength(data.notes, VALIDATION.MAX_NOTES_LENGTH, 'Notes')

  return errors
}

export const validateMaterialForm = (data: { name?: string; notes?: string; quantity?: number; material_type?: string; manufacturer?: string; model_number?: string; unit?: string; storage_location?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Material Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Material Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Material Name')

  errors.notes = validateMaxLength(data.notes, VALIDATION.MAX_NOTES_LENGTH, 'Notes')
  errors.quantity = validateNumberRange(data.quantity, 0, 999999999, 'Quantity')
  errors.material_type = validateMaxLength(data.material_type, VALIDATION.MAX_TYPE_LENGTH, 'Type')
  errors.manufacturer = validateMaxLength(data.manufacturer, VALIDATION.MAX_MANUFACTURER_LENGTH, 'Manufacturer')
  errors.model_number = validateMaxLength(data.model_number, VALIDATION.MAX_MODEL_NUMBER_LENGTH, 'Model')
  errors.unit = validateMaxLength(data.unit, VALIDATION.MAX_UNIT_LENGTH, 'Unit')
  errors.storage_location = validateMaxLength(data.storage_location, VALIDATION.MAX_LOCATION_LENGTH, 'Storage Location')

  return errors
}

export const validateContactForm = (data: { contact_name?: string; email?: string; phone?: string; contact_type?: string; company_name?: string; role_description?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.contact_name = validateRequired(data.contact_name, 'Contact Name')
    || validateMinLength(data.contact_name, VALIDATION.MIN_NAME_LENGTH, 'Contact Name')
    || validateMaxLength(data.contact_name, VALIDATION.MAX_NAME_LENGTH, 'Contact Name')

  errors.contact_type = validateRequired(data.contact_type, 'Contact Type')
    || validateMaxLength(data.contact_type, VALIDATION.MAX_CONTACT_TYPE_LENGTH, 'Contact Type')

  errors.email = validateRequired(data.email, 'Email') || validateEmail(data.email)
  errors.phone = validatePhone(data.phone)
  errors.company_name = validateMaxLength(data.company_name, VALIDATION.MAX_COMPANY_NAME_LENGTH, 'Company')
  errors.role_description = validateMaxLength(data.role_description, VALIDATION.MAX_ROLE_DESCRIPTION_LENGTH, 'Role Description')

  return errors
}

export const validateMeetingForm = (data: { title?: string; description?: string; meeting_type?: string; location?: string; scheduled_date?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.title = validateRequired(data.title, 'Meeting Title')
    || validateMinLength(data.title, VALIDATION.MIN_NAME_LENGTH, 'Meeting Title')
    || validateMaxLength(data.title, VALIDATION.MAX_NAME_LENGTH, 'Meeting Title')

  errors.description = validateMaxLength(data.description, VALIDATION.MAX_DESCRIPTION_LENGTH, 'Description')
  errors.meeting_type = validateMaxLength(data.meeting_type, VALIDATION.MAX_MEETING_TYPE_LENGTH, 'Meeting Type')
  errors.location = validateMaxLength(data.location, VALIDATION.MAX_LOCATION_LENGTH, 'Location')
  errors.scheduled_date = validateRequired(data.scheduled_date, 'Date')

  return errors
}

export const validateAreaForm = (data: { name?: string; areaCode?: string; floor_number?: number; total_units?: number; progress?: number }): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Area Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Area Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Area Name')

  errors.areaCode = validateRequired(data.areaCode, 'Area Code')
    || validateCode(data.areaCode, 'Area Code')
    || validateMaxLength(data.areaCode, VALIDATION.MAX_CODE_LENGTH, 'Area Code')

  errors.floor_number = validateNumberRange(data.floor_number, -99, 999, 'Floor Number')
  errors.total_units = validateNumberRange(data.total_units, 1, 10000, 'Total Units')
  errors.progress = validateNumberRange(data.progress, 0, 100, 'Progress')

  return errors
}

export const validateRFIForm = (data: { subject?: string; question?: string; to_email?: string; category?: string; priority?: string; to_name?: string; location?: string; drawing_reference?: string; specification_reference?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.subject = validateRequired(data.subject, 'Subject')
    || validateMinLength(data.subject, VALIDATION.MIN_SUBJECT_LENGTH, 'Subject')
    || validateMaxLength(data.subject, VALIDATION.MAX_SUBJECT_LENGTH, 'Subject')

  errors.question = validateRequired(data.question, 'Question')
    || validateMinLength(data.question, VALIDATION.MIN_QUESTION_LENGTH, 'Question')
    || validateMaxLength(data.question, VALIDATION.MAX_QUESTION_LENGTH, 'Question')

  errors.to_email = validateRequiredEmail(data.to_email, 'To Email')
  errors.category = validateEnum(data.category, RFI_CATEGORIES, 'Category')
  errors.priority = validateEnum(data.priority, RFI_PRIORITIES, 'Priority')
  errors.to_name = validateMaxLength(data.to_name, VALIDATION.MAX_TO_NAME_LENGTH, 'To Name')
  errors.location = validateMaxLength(data.location, VALIDATION.MAX_LOCATION_LENGTH, 'Location')
  errors.drawing_reference = validateMaxLength(data.drawing_reference, VALIDATION.MAX_DRAWING_REF_LENGTH, 'Drawing Reference')
  errors.specification_reference = validateMaxLength(data.specification_reference, VALIDATION.MAX_SPEC_REF_LENGTH, 'Specification Reference')

  return errors
}

export const validateInspectionForm = (data: { consultant_type_id?: string; scheduled_date?: string; notes?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.consultant_type_id = validateRequired(data.consultant_type_id, 'Consultant Type')
  errors.scheduled_date = validateRequired(data.scheduled_date, 'Scheduled Date')
  errors.notes = validateMaxLength(data.notes, VALIDATION.MAX_NOTES_LENGTH, 'Notes')

  return errors
}

export const hasErrors = (errors: ValidationError): boolean => {
  return Object.values(errors).some(error => error !== null)
}
