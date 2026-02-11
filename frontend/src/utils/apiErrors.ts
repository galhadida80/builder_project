import type { AxiosError } from 'axios'

interface PydanticError {
  loc: (string | number)[]
  msg: string
  type: string
}

interface ValidationErrorResponse {
  detail: PydanticError[]
}

export function parseValidationErrors(error: unknown): Record<string, string> {
  const axiosError = error as AxiosError<ValidationErrorResponse>
  if (!axiosError?.response || axiosError.response.status !== 422) return {}
  const detail = axiosError.response.data?.detail
  if (!Array.isArray(detail)) return {}
  const errors: Record<string, string> = {}
  for (const err of detail) {
    const field = err.loc?.[err.loc.length - 1]
    if (field && typeof field === 'string') {
      errors[field] = err.msg
    }
  }
  return errors
}

export function mergeFieldErrors(
  clientErrors: Record<string, string | null>,
  serverErrors: Record<string, string>
): Record<string, string | null> {
  const merged = { ...clientErrors }
  for (const [field, msg] of Object.entries(serverErrors)) {
    if (!merged[field]) {
      merged[field] = msg
    }
  }
  return merged
}
