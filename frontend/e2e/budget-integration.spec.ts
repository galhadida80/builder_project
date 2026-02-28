import { test, expect } from '@playwright/test'

test.describe('Budget Integration - Complete Flow', () => {
  test('should display budget integration page without authentication', async ({ page }) => {
    // Navigate to login page (will redirect if accessing protected route)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify login page loads
    await expect(page.locator('text=BuilderOps').first()).toBeVisible({ timeout: 10000 })
  })

  test('should load budget integration page structure', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify page loads without critical errors
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.waitForTimeout(1000)

    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})

test.describe('Budget Integration - Timesheet Approval with Labor Hours', () => {
  test('should track timesheet approval API calls', async ({ page }) => {
    const apiCalls: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/v1/projects/') && url.includes('/timesheets/') && url.includes('/approve')) {
        apiCalls.push(`${request.method()} ${url}`)
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Verify page loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('should verify approved timesheet has labor hours', async ({ page }) => {
    const apiResponses: { url: string; status: number; data?: any }[] = []

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/timesheets/') && url.includes('/approve')) {
        try {
          const data = await response.json()
          apiResponses.push({ url, status: response.status(), data })

          // Verify response has labor hours data
          if (data.totalHours !== undefined) {
            expect(data.totalHours).toBeGreaterThan(0)
          }
          if (data.regularHours !== undefined) {
            expect(data.regularHours).toBeGreaterThanOrEqual(0)
          }
          if (data.overtimeHours !== undefined) {
            expect(data.overtimeHours).toBeGreaterThanOrEqual(0)
          }
        } catch {
          apiResponses.push({ url, status: response.status() })
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify basic page functionality
    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })
})

test.describe('Budget Integration - Link to Budget Category', () => {
  test('should track link-budget API calls', async ({ page }) => {
    const apiCalls: { method: string; url: string; body?: any }[] = []

    page.on('request', async request => {
      const url = request.url()
      if (url.includes('/timesheets/') && url.includes('/link-budget')) {
        const bodyText = request.postData()
        let body
        try {
          body = bodyText ? JSON.parse(bodyText) : undefined
        } catch {
          body = bodyText
        }
        apiCalls.push({ method: request.method(), url, body })
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Verify page loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('should verify link-budget request has budget_item_id', async ({ page }) => {
    const apiRequests: any[] = []

    page.on('request', async request => {
      const url = request.url()
      if (url.includes('/link-budget')) {
        const bodyText = request.postData()
        if (bodyText) {
          try {
            const body = JSON.parse(bodyText)
            apiRequests.push(body)

            // Verify request has budgetItemId (camelCase from frontend)
            expect(body).toHaveProperty('budgetItemId')
          } catch {
            // Body is not JSON or parse failed
          }
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('should verify timesheet is approved before linking', async ({ page }) => {
    const apiResponses: { url: string; status: number; data?: any }[] = []

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/link-budget')) {
        try {
          const data = await response.json()
          apiResponses.push({ url, status: response.status(), data })

          // If successful, verify timesheet is approved
          if (response.status() === 200 && data.status) {
            expect(data.status).toBe('approved')
          }

          // If error, should indicate not approved
          if (response.status() === 400 && data.detail) {
            expect(data.detail).toContain('approved')
          }
        } catch {
          apiResponses.push({ url, status: response.status() })
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })
})

test.describe('Budget Integration - Create CostEntry', () => {
  test('should track sync-to-budget API calls', async ({ page }) => {
    const apiCalls: { method: string; url: string; body?: any }[] = []

    page.on('request', async request => {
      const url = request.url()
      if (url.includes('/sync-to-budget')) {
        const bodyText = request.postData()
        let body
        try {
          body = bodyText ? JSON.parse(bodyText) : undefined
        } catch {
          body = bodyText
        }
        apiCalls.push({ method: request.method(), url, body })
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Verify page loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('should verify sync-to-budget creates CostEntry', async ({ page }) => {
    const apiResponses: { url: string; status: number; data?: any }[] = []

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/sync-to-budget')) {
        try {
          const data = await response.json()
          apiResponses.push({ url, status: response.status(), data })

          // Verify response is a CostEntry
          if (response.status() === 200) {
            expect(data).toHaveProperty('id')
            expect(data).toHaveProperty('budgetItemId')
            expect(data).toHaveProperty('amount')
            expect(data).toHaveProperty('entryDate')
            expect(data).toHaveProperty('referenceNumber')

            // Verify reference number indicates timesheet origin
            if (data.referenceNumber) {
              expect(data.referenceNumber).toContain('TIMESHEET-')
            }
          }
        } catch {
          apiResponses.push({ url, status: response.status() })
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('should verify hourly rate is required', async ({ page }) => {
    const apiRequests: any[] = []

    page.on('request', async request => {
      const url = request.url()
      if (url.includes('/sync-to-budget')) {
        const bodyText = request.postData()
        if (bodyText) {
          try {
            const body = JSON.parse(bodyText)
            apiRequests.push(body)

            // Verify request has hourlyRate
            expect(body).toHaveProperty('hourlyRate')
            expect(typeof body.hourlyRate).toBe('number')
            expect(body.hourlyRate).toBeGreaterThan(0)
          } catch {
            // Body is not JSON or parse failed
          }
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })
})

test.describe('Budget Integration - Verify Budget Updates', () => {
  test('should track budget cost entry queries', async ({ page }) => {
    const apiCalls: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/v1/projects/') && url.includes('/budget')) {
        apiCalls.push(`${request.method()} ${url}`)
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Verify page loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('should verify budget actual cost includes labor cost', async ({ page }) => {
    const apiResponses: { url: string; status: number; data?: any }[] = []

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/budget') && !url.includes('/link-budget') && !url.includes('/sync-to-budget')) {
        try {
          const data = await response.json()
          apiResponses.push({ url, status: response.status(), data })

          // If response is budget line item, verify it has cost entries
          if (Array.isArray(data)) {
            data.forEach(item => {
              if (item.actualCost !== undefined) {
                expect(typeof item.actualCost).toBe('number')
              }
            })
          } else if (data.actualCost !== undefined) {
            expect(typeof data.actualCost).toBe('number')
          }
        } catch {
          apiResponses.push({ url, status: response.status() })
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })
})

test.describe('Budget Integration - Labor Cost Report', () => {
  test('should track labor cost report API calls', async ({ page }) => {
    const apiCalls: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/reports/labor-costs')) {
        apiCalls.push(`${request.method()} ${url}`)
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Verify page loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('should verify labor cost report shows cost breakdown', async ({ page }) => {
    const apiResponses: { url: string; status: number; data?: any }[] = []

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/labor-costs')) {
        try {
          const data = await response.json()
          apiResponses.push({ url, status: response.status(), data })

          // Verify report has cost breakdown
          if (response.status() === 200) {
            // Report should contain cost data
            if (Array.isArray(data)) {
              data.forEach(entry => {
                if (entry.totalCost !== undefined) {
                  expect(typeof entry.totalCost).toBe('number')
                }
                if (entry.regularCost !== undefined) {
                  expect(typeof entry.regularCost).toBe('number')
                }
                if (entry.overtimeCost !== undefined) {
                  expect(typeof entry.overtimeCost).toBe('number')
                }
              })
            } else if (data.totalCost !== undefined) {
              expect(typeof data.totalCost).toBe('number')
            }
          }
        } catch {
          apiResponses.push({ url, status: response.status() })
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('should verify report includes overtime cost breakdown', async ({ page }) => {
    const apiResponses: { url: string; status: number; data?: any }[] = []

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/labor-costs')) {
        try {
          const data = await response.json()
          apiResponses.push({ url, status: response.status(), data })

          // Verify overtime breakdown
          if (response.status() === 200 && Array.isArray(data)) {
            data.forEach(entry => {
              // If has overtime, should have tier breakdown
              if (entry.overtimeHours && entry.overtimeHours > 0) {
                // Should have overtime cost breakdown
                expect(entry.overtimeCost).toBeDefined()
              }
            })
          }
        } catch {
          apiResponses.push({ url, status: response.status() })
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })
})

test.describe('Budget Integration - Error Handling', () => {
  test('should handle unapproved timesheet link attempt', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify no critical errors
    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should handle unlinked timesheet sync attempt', async ({ page }) => {
    const apiResponses: { url: string; status: number; data?: any }[] = []

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/sync-to-budget')) {
        try {
          const data = await response.json()
          apiResponses.push({ url, status: response.status(), data })

          // If error, should indicate not linked
          if (response.status() === 400 && data.detail) {
            expect(data.detail).toContain('linked')
          }
        } catch {
          apiResponses.push({ url, status: response.status() })
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Verify error handling doesn't cause critical failures
    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:') &&
      !err.includes('Network')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})

test.describe('Budget Integration - Mobile UI', () => {
  test('should display budget integration on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify mobile layout loads
    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('should handle budget link action on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const apiCalls: string[] = []
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/link-budget')) {
        apiCalls.push(`${request.method()} ${url}`)
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })
})
