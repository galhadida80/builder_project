/**
 * Tests for form validation schemas
 */

import { describe, it, expect } from 'vitest'
import {
  emailSchema,
  passwordSchema,
  loginSchema,
  registerSchema,
  projectSchema,
  equipmentSchema,
  urlSchema,
  textInputSchema,
  numericInputSchema,
  uuidSchema,
  validateWithSchema,
} from '../schemas/validation'

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should validate correct email', () => {
      expect(emailSchema.safeParse('user@example.com').success).toBe(true)
    })

    it('should reject invalid email', () => {
      expect(emailSchema.safeParse('not-an-email').success).toBe(false)
    })

    it('should reject too short email', () => {
      expect(emailSchema.safeParse('a@b').success).toBe(false)
    })

    it('should reject too long email', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      expect(emailSchema.safeParse(longEmail).success).toBe(false)
    })

    it('should lowercase email', () => {
      const result = emailSchema.safeParse('User@EXAMPLE.COM')
      expect(result.success && result.data).toBe('user@example.com')
    })

    it('should trim whitespace', () => {
      const result = emailSchema.safeParse('  user@example.com  ')
      expect(result.success && result.data).toBe('user@example.com')
    })
  })

  describe('passwordSchema', () => {
    it('should validate strong password', () => {
      expect(passwordSchema.safeParse('SecurePass123').success).toBe(true)
    })

    it('should reject password without uppercase', () => {
      expect(passwordSchema.safeParse('securepass123').success).toBe(false)
    })

    it('should reject password without lowercase', () => {
      expect(passwordSchema.safeParse('SECUREPASS123').success).toBe(false)
    })

    it('should reject password without digit', () => {
      expect(passwordSchema.safeParse('SecurePass').success).toBe(false)
    })

    it('should reject too short password', () => {
      expect(passwordSchema.safeParse('Short1').success).toBe(false)
    })

    it('should reject too long password', () => {
      const longPass = 'ValidPass1' + 'a'.repeat(150)
      expect(passwordSchema.safeParse(longPass).success).toBe(false)
    })
  })

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = { email: 'user@example.com', password: 'SecurePass123' }
      expect(loginSchema.safeParse(data).success).toBe(true)
    })

    it('should reject invalid email', () => {
      const data = { email: 'not-an-email', password: 'SecurePass123' }
      expect(loginSchema.safeParse(data).success).toBe(false)
    })

    it('should reject missing password', () => {
      const data = { email: 'user@example.com', password: '' }
      expect(loginSchema.safeParse(data).success).toBe(false)
    })
  })

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const data = {
        email: 'user@example.com',
        fullName: 'John Doe',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      }
      expect(registerSchema.safeParse(data).success).toBe(true)
    })

    it('should reject mismatched passwords', () => {
      const data = {
        email: 'user@example.com',
        fullName: 'John Doe',
        password: 'SecurePass123',
        confirmPassword: 'DifferentPass123',
      }
      expect(registerSchema.safeParse(data).success).toBe(false)
    })

    it('should reject too short full name', () => {
      const data = {
        email: 'user@example.com',
        fullName: 'J',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      }
      expect(registerSchema.safeParse(data).success).toBe(false)
    })

    it('should reject too long full name', () => {
      const data = {
        email: 'user@example.com',
        fullName: 'a'.repeat(150),
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      }
      expect(registerSchema.safeParse(data).success).toBe(false)
    })
  })

  describe('projectSchema', () => {
    it('should validate correct project data', () => {
      const data = {
        name: 'New Project',
        description: 'Project description',
        location: 'New York',
      }
      expect(projectSchema.safeParse(data).success).toBe(true)
    })

    it('should reject project with too short name', () => {
      const data = { name: 'AB' }
      expect(projectSchema.safeParse(data).success).toBe(false)
    })

    it('should reject project with too long name', () => {
      const data = { name: 'a'.repeat(150) }
      expect(projectSchema.safeParse(data).success).toBe(false)
    })

    it('should allow optional description', () => {
      const data = { name: 'Project Name' }
      expect(projectSchema.safeParse(data).success).toBe(true)
    })
  })

  describe('equipmentSchema', () => {
    it('should validate correct equipment data', () => {
      const data = {
        name: 'Excavator',
        code: 'EXC-001',
        description: 'Heavy equipment',
      }
      expect(equipmentSchema.safeParse(data).success).toBe(true)
    })

    it('should reject equipment with invalid code format', () => {
      const data = {
        name: 'Excavator',
        code: 'exc-001', // lowercase not allowed
      }
      expect(equipmentSchema.safeParse(data).success).toBe(false)
    })

    it('should reject equipment with special characters in code', () => {
      const data = {
        name: 'Excavator',
        code: 'EXC@001',
      }
      expect(equipmentSchema.safeParse(data).success).toBe(false)
    })
  })

  describe('urlSchema', () => {
    it('should validate HTTP URLs', () => {
      expect(urlSchema.safeParse('http://example.com').success).toBe(true)
    })

    it('should validate HTTPS URLs', () => {
      expect(urlSchema.safeParse('https://example.com').success).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(urlSchema.safeParse('not a url').success).toBe(false)
    })

    it('should reject FTP URLs', () => {
      expect(urlSchema.safeParse('ftp://example.com').success).toBe(false)
    })
  })

  describe('textInputSchema', () => {
    it('should validate normal text', () => {
      expect(textInputSchema.safeParse('Hello World').success).toBe(true)
    })

    it('should reject empty text', () => {
      expect(textInputSchema.safeParse('').success).toBe(false)
    })

    it('should reject too long text', () => {
      const longText = 'a'.repeat(600)
      expect(textInputSchema.safeParse(longText).success).toBe(false)
    })
  })

  describe('numericInputSchema', () => {
    it('should validate positive numbers', () => {
      expect(numericInputSchema.safeParse(123).success).toBe(true)
    })

    it('should validate zero', () => {
      expect(numericInputSchema.safeParse(0).success).toBe(true)
    })

    it('should reject negative numbers', () => {
      expect(numericInputSchema.safeParse(-1).success).toBe(false)
    })

    it('should reject too large numbers', () => {
      expect(numericInputSchema.safeParse(999999999999).success).toBe(false)
    })
  })

  describe('uuidSchema', () => {
    it('should validate correct UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(uuidSchema.safeParse(uuid).success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
    })

    it('should reject empty string', () => {
      expect(uuidSchema.safeParse('').success).toBe(false)
    })
  })

  describe('validateWithSchema', () => {
    it('should return valid result for correct data', () => {
      const data = { email: 'user@example.com', password: 'SecurePass123' }
      const result = validateWithSchema(loginSchema, data)

      expect(result.valid).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should return errors for invalid data', () => {
      const data = { email: 'invalid', password: '' }
      const result = validateWithSchema(loginSchema, data)

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(Object.keys(result.errors!).length).toBeGreaterThan(0)
    })

    it('should provide detailed error messages', () => {
      const data = { email: 'invalid-email', password: 'weak' }
      const result = validateWithSchema(loginSchema, data)

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })
})
