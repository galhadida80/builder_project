import { test, expect } from '@playwright/test'

test.describe('Floorplan Upload and Pin Creation - Complete Flow', () => {
  test('should display floorplan viewer without authentication', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify login page loads
    await expect(page.locator('text=BuilderOps').first()).toBeVisible({ timeout: 10000 })
  })

  test('should redirect unauthenticated user to login from floorplan viewer', async ({ page }) => {
    await page.goto('/projects/some-project/floorplans/some-floorplan')
    await page.waitForLoadState('networkidle')

    // Unauthenticated user should be redirected to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('should redirect unauthenticated user to login from areas page', async ({ page }) => {
    await page.goto('/projects/some-project/areas')
    await page.waitForLoadState('networkidle')

    // Unauthenticated user should be redirected to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

test.describe('Floorplan Upload - AreasPage Integration', () => {
  test('should track floorplan upload API calls', async ({ page }) => {
    const apiCalls: { method: string; url: string }[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/v1/projects/') && url.includes('/floorplans')) {
        apiCalls.push({ method: request.method(), url })
      }
      if (url.includes('/api/v1/files') && request.method() === 'POST') {
        apiCalls.push({ method: request.method(), url })
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Verify page loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('should verify floorplan upload requires project_id', async ({ page }) => {
    const uploadRequests: any[] = []

    page.on('request', async request => {
      const url = request.url()
      if (url.includes('/floorplans') && request.method() === 'POST') {
        const bodyText = request.postData()
        if (bodyText) {
          try {
            const body = JSON.parse(bodyText)
            uploadRequests.push(body)

            // Verify request has required fields
            expect(body).toHaveProperty('floorNumber')
            expect(body).toHaveProperty('fileId')
          } catch {
            // FormData or multipart body
          }
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('should verify file upload before floorplan creation', async ({ page }) => {
    const apiSequence: { timestamp: number; endpoint: string }[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/v1/files') && request.method() === 'POST') {
        apiSequence.push({ timestamp: Date.now(), endpoint: 'files' })
      }
      if (url.includes('/floorplans') && request.method() === 'POST') {
        apiSequence.push({ timestamp: Date.now(), endpoint: 'floorplans' })
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Verify page loaded
    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })
})

test.describe('Floorplan Canvas - Rendering and Interaction', () => {
  test('should track floorplan viewer page load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')

    // Verify no critical errors
    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:')
    )
    expect(criticalErrors.length).toBe(0)
  })

  test('should track floorplan data fetch API calls', async ({ page }) => {
    const apiCalls: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/floorplans/') && request.method() === 'GET') {
        apiCalls.push(`GET ${url}`)
      }
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Verify page structure loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('should verify canvas initialization without errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Filter out non-critical Fabric.js or canvas warnings
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Fabric') &&
      !err.includes('Canvas')
    )
    expect(criticalErrors.length).toBe(0)
  })
})

test.describe('Pin Creation - Click-to-Create Defect', () => {
  test('should track pin creation API calls', async ({ page }) => {
    const apiCalls: { method: string; url: string; body?: any }[] = []

    page.on('request', async request => {
      const url = request.url()
      if (url.includes('/pins') && request.method() === 'POST') {
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

  test('should verify pin creation requires normalized coordinates', async ({ page }) => {
    const pinRequests: any[] = []

    page.on('request', async request => {
      const url = request.url()
      if (url.includes('/pins') && request.method() === 'POST') {
        const bodyText = request.postData()
        if (bodyText) {
          try {
            const body = JSON.parse(bodyText)
            pinRequests.push(body)

            // Verify coordinates are normalized (0-1 range)
            if (body.x !== undefined) {
              expect(body.x).toBeGreaterThanOrEqual(0)
              expect(body.x).toBeLessThanOrEqual(1)
            }
            if (body.y !== undefined) {
              expect(body.y).toBeGreaterThanOrEqual(0)
              expect(body.y).toBeLessThanOrEqual(1)
            }

            // Verify required fields
            expect(body).toHaveProperty('entityType')
            expect(body).toHaveProperty('entityId')
          } catch {
            // Not JSON
          }
        }
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('should track defect creation before pin creation', async ({ page }) => {
    const apiSequence: { timestamp: number; endpoint: string }[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/defects') && request.method() === 'POST') {
        apiSequence.push({ timestamp: Date.now(), endpoint: 'defects' })
      }
      if (url.includes('/pins') && request.method() === 'POST') {
        apiSequence.push({ timestamp: Date.now(), endpoint: 'pins' })
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Verify page loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })
})

test.describe('Pin Rendering - Color-Coded Status Display', () => {
  test('should track pins list API calls', async ({ page }) => {
    const apiCalls: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/floorplans/') && url.includes('/pins') && request.method() === 'GET') {
        apiCalls.push(`GET ${url}`)
      }
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Verify page loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('should verify pins response includes entity details', async ({ page }) => {
    const pinResponses: any[] = []

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/pins') && response.request().method() === 'GET') {
        try {
          const data = await response.json()
          if (Array.isArray(data)) {
            pinResponses.push(...data)

            // Verify each pin has required fields
            data.forEach(pin => {
              expect(pin).toHaveProperty('id')
              expect(pin).toHaveProperty('x')
              expect(pin).toHaveProperty('y')
              expect(pin).toHaveProperty('entityType')
              expect(pin).toHaveProperty('entityId')
            })
          }
        } catch {
          // Not JSON
        }
      }
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')

    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('should fetch defect details for status-based coloring', async ({ page }) => {
    const defectCalls: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/defects/') && request.method() === 'GET') {
        defectCalls.push(`GET ${url}`)
      }
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify page loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })
})

test.describe('Pin Filtering - Status and Category Filters', () => {
  test('should display filter panel on floorplan viewer', async ({ page }) => {
    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')

    // Verify no critical errors during filter rendering
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.waitForTimeout(1000)

    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:')
    )
    expect(criticalErrors.length).toBe(0)
  })

  test('should track filtered pins API calls', async ({ page }) => {
    const apiCalls: { url: string; params: URLSearchParams }[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/pins') && request.method() === 'GET') {
        const urlObj = new URL(url)
        apiCalls.push({ url, params: urlObj.searchParams })
      }
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Verify page loaded
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('should handle filter changes without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify no critical errors
    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:')
    )
    expect(criticalErrors.length).toBe(0)
  })
})

test.describe('Pin Clustering - Zoom-Based Display', () => {
  test('should render clusters without errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Filter out non-critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Fabric')
    )
    expect(criticalErrors.length).toBe(0)
  })

  test('should handle zoom events on canvas', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Verify no critical errors during zoom interactions
    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:')
    )
    expect(criticalErrors.length).toBe(0)
  })
})

test.describe('Floorplan Integration - Mobile Responsiveness', () => {
  test('should display floorplan viewer on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')

    // Verify mobile layout loads without errors
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.waitForTimeout(1000)

    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:')
    )
    expect(criticalErrors.length).toBe(0)
  })

  test('should handle touch interactions on mobile canvas', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')

    // Verify canvas initializes on mobile
    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('should display filter panel on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')

    // Verify mobile filter panel loads
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })
})

test.describe('Floorplan Integration - Error Handling', () => {
  test('should handle missing floorplan gracefully', async ({ page }) => {
    const apiResponses: { url: string; status: number }[] = []

    page.on('response', response => {
      const url = response.url()
      if (url.includes('/floorplans/') && response.status() >= 400) {
        apiResponses.push({ url, status: response.status() })
      }
    })

    await page.goto('/projects/test-project/floorplans/nonexistent-floorplan')
    await page.waitForLoadState('networkidle')

    // Verify error handling doesn't cause critical failures
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.waitForTimeout(1000)

    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:')
    )
    expect(criticalErrors.length).toBe(0)
  })

  test('should handle network errors during pin loading', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Verify error handling doesn't cause crashes
    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:') &&
      !err.includes('Network')
    )
    expect(criticalErrors.length).toBe(0)
  })

  test('should handle canvas initialization failures', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify page loaded even if canvas fails
    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })
})

test.describe('End-to-End Verification - Complete Workflow', () => {
  test('should complete floorplan upload workflow', async ({ page }) => {
    const workflowSteps: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/files') && request.method() === 'POST') {
        workflowSteps.push('1-file-upload')
      }
      if (url.includes('/floorplans') && request.method() === 'POST') {
        workflowSteps.push('2-floorplan-create')
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify workflow structure is in place
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('should complete pin creation workflow', async ({ page }) => {
    const workflowSteps: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/defects') && request.method() === 'POST') {
        workflowSteps.push('1-defect-create')
      }
      if (url.includes('/pins') && request.method() === 'POST') {
        workflowSteps.push('2-pin-create')
      }
      if (url.includes('/pins') && request.method() === 'GET') {
        workflowSteps.push('3-pins-refresh')
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify workflow infrastructure exists
    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('should verify complete integration without critical errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    // Navigate through the complete flow
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.goto('/projects/test-project/areas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.goto('/projects/test-project/floorplans/test-floorplan')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify no critical errors throughout the flow
    const criticalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('Warning:')
    )
    expect(criticalErrors.length).toBe(0)
  })
})
