/**
 * Form validation schemas using Zod for runtime type safety
 */

import { z } from 'zod'

// Email validation schema
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must not exceed 254 characters')

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
    (val) => !/[<>"']/g.test(val),
    'Search query contains invalid characters'
  )

// Phone validation (Israeli format)
const phoneCharRegex = /^[\d\s\-+().]+$/
export const phoneSchema = z
  .string()
  .max(30, 'Phone must not exceed 30 characters')
  .refine((val) => !val || phoneCharRegex.test(val), 'Phone must contain only digits, spaces, and standard phone characters')
  .refine((val) => {
    if (!val) return true
    let digits = val.replace(/[\s\-().]/g, '')
    if (digits.startsWith('+972')) digits = '0' + digits.slice(4)
    else if (digits.startsWith('972')) digits = '0' + digits.slice(3)
    return /^0[2-9]\d{7,8}$/.test(digits)
  }, 'Please enter a valid Israeli phone number (e.g. 050-1234567, 02-1234567)')
  .optional()
  .or(z.literal(''))

// Profile form schema
export const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters')
    .trim(),
  phone: phoneSchema,
  company: z
    .string()
    .max(255, 'Company must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
})

export type ProfileFormData = z.infer<typeof profileSchema>

// Contact form schema
export const contactSchema = z.object({
  contact_name: z.string().min(2, 'Name is required').max(255).trim(),
  contact_type: z.string().min(1, 'Contact type is required').max(50),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema,
  company_name: z.string().max(255).optional().or(z.literal('')),
  role_description: z.string().max(2000).optional().or(z.literal('')),
})

export type ContactFormData = z.infer<typeof contactSchema>

// Meeting form schema
export const meetingSchema = z.object({
  title: z.string().min(2, 'Title is required').max(255).trim(),
  description: z.string().max(2000).optional().or(z.literal('')),
  meeting_type: z.string().max(50).optional().or(z.literal('')),
  location: z.string().max(255).optional().or(z.literal('')),
  scheduled_date: z.string().min(1, 'Date is required').refine(
    (val) => {
      const date = new Date(val)
      return date >= new Date(new Date().toDateString())
    },
    'Date cannot be in the past'
  ),
})

export type MeetingFormData = z.infer<typeof meetingSchema>

// Area form schema
export const areaSchema = z.object({
  name: z.string().min(2, 'Name is required').max(255).trim(),
  area_code: z.string().min(2, 'Code is required').max(50).trim(),
  floor_number: z.number().min(-99).max(999).optional(),
  total_units: z.number().min(1).max(10000).optional(),
  current_progress: z.number().min(0).max(100).optional(),
})

export type AreaFormData = z.infer<typeof areaSchema>

// Inspection form schema
export const inspectionSchema = z.object({
  consultant_type_id: z.string().uuid('Consultant type is required'),
  scheduled_date: z.string().min(1, 'Date is required').refine(
    (val) => {
      const date = new Date(val)
      return date >= new Date(new Date().toDateString())
    },
    'Scheduled date cannot be in the past'
  ),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

export type InspectionFormData = z.infer<typeof inspectionSchema>

// Material form schema
export const materialSchema = z.object({
  name: z.string().min(2, 'Name is required').max(255).trim(),
  material_type: z.string().max(100).optional().or(z.literal('')),
  manufacturer: z.string().max(255).optional().or(z.literal('')),
  model_number: z.string().max(100).optional().or(z.literal('')),
  quantity: z.number().min(0).max(999999999).optional(),
  unit: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

export type MaterialFormData = z.infer<typeof materialSchema>

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
