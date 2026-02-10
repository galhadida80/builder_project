/**
 * Tests for frontend security utilities
 */

import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml,
  sanitizeUrl,
  escapeHtml,
  validateEmail,
  validateUrl,
  preventXSSInjection,
  validateFormInput,
  detectXSSAttempt,
  sanitizeUserInput,
} from '../utils/security'

describe('Security Utilities', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("xss")</script>Hello'
      expect(sanitizeHtml(malicious)).toBe('Hello')
    })

    it('should remove event handlers', () => {
      const malicious = '<div onclick="alert(1)">Click</div>'
      expect(sanitizeHtml(malicious)).not.toContain('onclick')
    })

    it('should remove data: protocol', () => {
      const malicious = '<a href="data:text/html,<script>alert(1)</script>">Click</a>'
      expect(sanitizeHtml(malicious)).not.toContain('data:')
    })

    it('should remove javascript: protocol', () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>'
      expect(sanitizeHtml(malicious)).not.toContain('javascript:')
    })

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('')
      expect(sanitizeHtml(null as unknown as string)).toBe('')
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow valid HTTP URLs', () => {
      const url = 'http://example.com'
      expect(sanitizeUrl(url)).toBe(url)
    })

    it('should allow valid HTTPS URLs', () => {
      const url = 'https://example.com'
      expect(sanitizeUrl(url)).toBe(url)
    })

    it('should block javascript: protocol', () => {
      const malicious = 'javascript:alert(1)'
      expect(sanitizeUrl(malicious)).toBe('')
    })

    it('should block data: protocol', () => {
      const malicious = 'data:text/html,<script>alert(1)</script>'
      expect(sanitizeUrl(malicious)).toBe('')
    })

    it('should block vbscript: protocol', () => {
      const malicious = 'vbscript:msgbox(1)'
      expect(sanitizeUrl(malicious)).toBe('')
    })
  })

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>'
      expect(escapeHtml(input)).not.toContain('<script>')
    })

    it('should handle quotes', () => {
      const input = 'Hello "World"'
      const result = escapeHtml(input)
      expect(result).not.toContain('<')
      expect(result).toContain('Hello')
    })

    it('should handle single quotes', () => {
      const input = "Hello 'World'"
      const result = escapeHtml(input)
      expect(result).not.toContain('<')
      expect(result).toContain('Hello')
    })

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('')
      expect(escapeHtml(null as unknown as string)).toBe('')
    })
  })

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com',
      ]
      validEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'not-an-email',
        'user@',
        '@example.com',
        'user name@example.com',
      ]
      invalidEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(false)
      })
    })
  })

  describe('validateUrl', () => {
    it('should validate HTTP URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true)
    })

    it('should validate HTTPS URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true)
    })

    it('should reject javascript: URLs', () => {
      expect(validateUrl('javascript:alert(1)')).toBe(false)
    })

    it('should reject data: URLs', () => {
      expect(validateUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    })

    it('should reject invalid URLs', () => {
      expect(validateUrl('not a url')).toBe(false)
    })
  })

  describe('preventXSSInjection', () => {
    it('should escape ampersands', () => {
      expect(preventXSSInjection('Hello & goodbye')).toContain('&amp;')
    })

    it('should escape less than', () => {
      expect(preventXSSInjection('<script>')).toContain('&lt;')
    })

    it('should escape greater than', () => {
      expect(preventXSSInjection('</script>')).toContain('&gt;')
    })

    it('should escape double quotes', () => {
      expect(preventXSSInjection('"quoted"')).toContain('&quot;')
    })

    it('should escape single quotes', () => {
      expect(preventXSSInjection("'quoted'")).toContain('&#x27;')
    })

    it('should escape slashes', () => {
      expect(preventXSSInjection('path/to/file')).toContain('&#x2F;')
    })

    it('should handle non-string input', () => {
      expect(preventXSSInjection(null as unknown as string)).toBe('')
      expect(preventXSSInjection(123 as unknown as string)).toBe('')
    })
  })

  describe('validateFormInput', () => {
    it('should validate email input', () => {
      expect(validateFormInput('user@example.com', 'email')).toBe(true)
      expect(validateFormInput('invalid', 'email')).toBe(false)
    })

    it('should validate text input', () => {
      expect(validateFormInput('Hello World', 'text')).toBe(true)
      expect(validateFormInput('', 'text')).toBe(false)
    })

    it('should validate numeric input', () => {
      expect(validateFormInput('123', 'number')).toBe(true)
      expect(validateFormInput('not-a-number', 'number')).toBe(false)
    })

    it('should validate URL input', () => {
      expect(validateFormInput('https://example.com', 'url')).toBe(true)
      expect(validateFormInput('not a url', 'url')).toBe(false)
    })

    it('should reject non-string input', () => {
      expect(validateFormInput(123 as unknown as string, 'text')).toBe(false)
      expect(validateFormInput(null as unknown as string, 'text')).toBe(false)
    })
  })

  describe('detectXSSAttempt', () => {
    it('should detect script tags', () => {
      expect(detectXSSAttempt('<script>alert(1)</script>')).toBe(true)
    })

    it('should detect javascript protocol', () => {
      expect(detectXSSAttempt('javascript:alert(1)')).toBe(true)
    })

    it('should detect onerror handler', () => {
      expect(detectXSSAttempt('onerror=alert(1)')).toBe(true)
    })

    it('should detect onload handler', () => {
      expect(detectXSSAttempt('onload=alert(1)')).toBe(true)
    })

    it('should detect eval', () => {
      expect(detectXSSAttempt('eval(code)')).toBe(true)
    })

    it('should allow normal input', () => {
      expect(detectXSSAttempt('Hello World')).toBe(false)
      expect(detectXSSAttempt('user@example.com')).toBe(false)
    })

    it('should handle empty/null input', () => {
      expect(detectXSSAttempt('')).toBe(false)
      expect(detectXSSAttempt(null as unknown as string)).toBe(false)
    })
  })

  describe('sanitizeUserInput', () => {
    it('should remove angle brackets', () => {
      expect(sanitizeUserInput('<hello>')).not.toContain('<')
      expect(sanitizeUserInput('<hello>')).not.toContain('>')
    })

    it('should remove javascript protocol', () => {
      expect(sanitizeUserInput('javascript:alert(1)')).not.toContain('javascript:')
    })

    it('should remove event handlers', () => {
      expect(sanitizeUserInput('onclick=alert(1)')).not.toContain('onclick=')
    })

    it('should remove script keyword', () => {
      expect(sanitizeUserInput('<script>')).not.toContain('script')
    })

    it('should strip whitespace', () => {
      expect(sanitizeUserInput('  hello  ')).toBe('hello')
    })

    it('should limit length', () => {
      const longInput = 'a'.repeat(15000)
      const sanitized = sanitizeUserInput(longInput)
      expect(sanitized.length).toBeLessThanOrEqual(10000)
    })

    it('should handle non-string input', () => {
      expect(sanitizeUserInput(null as unknown as string)).toBe('')
      expect(sanitizeUserInput(123 as unknown as string)).toBe('')
    })
  })
})
