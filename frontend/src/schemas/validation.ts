/**
 * Form validation schemas using Zod for runtime type safety
 */

import { z } from 'zod'

// Email validation schema
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must not exceed 254 characters')
  .toLowerCase()
  .trim()

// Password validation schema with strength requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (val) => /[a-z]/.test(val),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (val) => /\d/.test(val),
    'Password must contain at least one digit'
  )

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Registration form schema
export const registerSchema = z
  .object({
    email: emailSchema,
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must not exceed 100 characters')
      .trim(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterFormData = z.infer<typeof registerSchema>

// Project creation schema
export const projectSchema = z.object({
  name: z
    .string()
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must not exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  location: z
    .string()
    .max(255, 'Location must not exceed 255 characters')
    .optional(),
})

export type ProjectFormData = z.infer<typeof projectSchema>

// Equipment schema
export const equipmentSchema = z.object({
  name: z
    .string()
    .min(1, 'Equipment name is required')
    .max(255, 'Name must not exceed 255 characters')
    .trim(),
  code: z
    .string()
    .min(1, 'Equipment code is required')
    .max(50, 'Code must not exceed 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
})

export type EquipmentFormData = z.infer<typeof equipmentSchema>

// URL validation schema
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .refine(
    (val) => val.startsWith('http://') || val.startsWith('https://'),
    'URL must start with http:// or https://'
  )

// File upload validation
export const fileUploadSchema = z.object({
  file: z
    .any()
    .refine((file) => file instanceof File, 'File is required')
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      'File must not exceed 10MB'
    )
    .refine(
      (file) => {
        const allowed = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]
        return allowed.includes(file.type)
      },
      'File type not allowed'
    ),
})

export type FileUploadData = z.infer<typeof fileUploadSchema>

// Generic text input validation
export const textInputSchema = z
  .string()
  .min(1, 'Field is required')
  .max(500, 'Input must not exceed 500 characters')
  .trim()

// Numeric input validation
export const numericInputSchema = z
  .number()
  .min(0, 'Value must be non-negative')
  .max(999999999, 'Value exceeds maximum')

// UUID validation
export const uuidSchema = z
  .string()
  .uuid('Invalid ID format')

// CSRF token schema
export const csrfTokenSchema = z
  .string()
  .min(20, 'Invalid CSRF token')
  .max(100, 'Invalid CSRF token')

// Search query schema with XSS protection
export const searchQuerySchema = z
  .string()
  .max(200, 'Search query too long')
  .transform((val) => val.trim())
  .refine(
    (val) => !/[<>\"']/g.test(val),
    'Search query contains invalid characters'
  )

export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): { valid: boolean; data?: T; errors?: Record<string, string> } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { valid: true, data: result.data }
  }

  const errors: Record<string, string> = {}
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.')
    errors[path] = issue.message
  })

  return { valid: false, errors }
}
