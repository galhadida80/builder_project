/**
 * Security utilities for XSS prevention and input sanitization
 */

const XSS_PATTERNS = {
  script: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  eventHandler: /on\w+\s*=/gi,
  htmlTag: /<[^>]+>/g,
  dataProtocol: /data:/gi,
  jsProtocol: /javascript:/gi,
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  let sanitized = html

  // Remove script tags
  sanitized = sanitized.replace(XSS_PATTERNS.script, '')

  // Remove event handlers
  sanitized = sanitized.replace(XSS_PATTERNS.eventHandler, '')

  // Remove data: and javascript: protocols
  sanitized = sanitized.replace(XSS_PATTERNS.dataProtocol, '')
  sanitized = sanitized.replace(XSS_PATTERNS.jsProtocol, '')

  return sanitized.trim()
}

export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const trimmed = url.trim().toLowerCase()

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return ''
  }

  return url
}

export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    // Only allow http and https
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

export function preventXSSInjection(input: unknown): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Create a safe string by escaping special HTML characters
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function validateFormInput(value: unknown, type: 'email' | 'text' | 'number' | 'url'): boolean {
  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()

  switch (type) {
    case 'email':
      return validateEmail(trimmed)
    case 'url':
      return validateUrl(trimmed)
    case 'number':
      return !isNaN(Number(trimmed))
    case 'text':
      return trimmed.length > 0 && trimmed.length <= 10000
    default:
      return false
  }
}

export function detectXSSAttempt(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }

  const lowerInput = input.toLowerCase()

  // Check for common XSS patterns
  const xssPatterns = [
    '<script',
    'javascript:',
    'onerror=',
    'onload=',
    'onclick=',
    'onmouseover=',
    'eval(',
    'expression(',
  ]

  return xssPatterns.some((pattern) => lowerInput.includes(pattern))
}

export function sanitizeUserInput(input: unknown): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove potentially dangerous patterns
  let sanitized = input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/script/gi, '')
    .trim()

  // Limit length to prevent abuse
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000)
  }

  return sanitized
}

export function createContentSecurityPolicyMeta(): HTMLMetaElement {
  const meta = document.createElement('meta')
  meta.httpEquiv = 'Content-Security-Policy'
  meta.content =
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"

  return meta
}
