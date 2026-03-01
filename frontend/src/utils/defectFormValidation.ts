/**
 * Defect form validation utility
 */

import type { DefectCreateData } from '@/api/defects'
import type { ValidationError } from '@/utils/validation'
import { validateRequired, validateMinLength } from '@/utils/validation'

/**
 * Validates defect form data
 * @param data - The defect form data to validate
 * @param t - Translation function for error messages
 * @returns ValidationError object with field-level errors
 */
export function validateDefectForm(
  data: DefectCreateData,
  t: (key: string) => string
): ValidationError {
  const errors: ValidationError = {}
  errors.description =
    validateRequired(data.description, t('defects.description')) ||
    validateMinLength(data.description, 2, t('defects.description'))
  errors.category = validateRequired(data.category, t('defects.category'))
  errors.severity = validateRequired(data.severity, t('defects.severity'))
  return errors
}
