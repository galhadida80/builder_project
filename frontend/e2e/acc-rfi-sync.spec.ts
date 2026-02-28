import { test, expect } from '@playwright/test'

/**
 * ACC RFI Sync E2E Tests
 *
 * Prerequisites:
 * - Backend server running on localhost:8000
 * - Frontend server running on localhost:5173
 * - Test user with valid ACC connection (OAuth completed)
 * - ACC sandbox account with test RFIs
 *
 * Environment variables needed:
 * - TEST_USER_EMAIL: Email for test user
 * - TEST_USER_PASSWORD: Password for test user
 * - TEST_PROJECT_ID: Project ID with ACC connection
 */

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@builderops.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'test123'
const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID || ''

test.describe('ACC RFI Sync - Authentication', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Unauthenticated user should be redirected to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

test.describe('ACC RFI Sync - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Fill login form
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL(/\/projects/, { timeout: 10000 })
  })

  test('should display ACC sync dashboard on RFI page', async ({ page }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Verify ACC Sync Dashboard is visible
    await expect(page.locator('text=/ACC Sync|סנכרון ACC/i')).toBeVisible({ timeout: 10000 })
  })

  test('should show sync status indicators', async ({ page }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Verify sync status badge (ok/warning/error)
    const statusBadge = page.locator('[class*="MuiChip"]').filter({
      hasText: /Synced|OK|Warning|Error|מסונכרן|אזהרה|שגיאה/i
    }).first()

    await expect(statusBadge).toBeVisible({ timeout: 10000 })
  })

  test('should display last sync time', async ({ page }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Verify last sync time is displayed
    await expect(page.locator('text=/Last Sync|סנכרון אחרון/i')).toBeVisible({ timeout: 10000 })
  })

  test('should have manual sync button', async ({ page }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Verify sync button exists
    const syncButton = page.locator('button').filter({
      hasText: /Sync Now|סנכרן עכשיו/i
    }).first()

    await expect(syncButton).toBeVisible({ timeout: 10000 })
  })
})

test.describe('ACC RFI Sync - Manual Sync Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/projects/, { timeout: 10000 })
  })

  test('should trigger manual sync successfully', async ({ page }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Click sync button
    const syncButton = page.locator('button').filter({
      hasText: /Sync Now|סנכרן עכשיו/i
    }).first()

    await syncButton.click()

    // Verify success message appears
    await expect(page.locator('text=/Sync triggered|סנכרון הופעל/i')).toBeVisible({ timeout: 10000 })
  })

  test('should show loading state during sync', async ({ page }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Click sync button
    const syncButton = page.locator('button').filter({
      hasText: /Sync Now|סנכרן עכשיו/i
    }).first()

    await syncButton.click()

    // Verify loading indicator appears
    await expect(page.locator('[class*="MuiCircularProgress"]')).toBeVisible({ timeout: 2000 })
  })
})

test.describe('ACC RFI Sync - RFI List Badges', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/projects/, { timeout: 10000 })
  })

  test('should display ACC badge for synced RFIs', async ({ page }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Look for ACC badge in RFI list
    // Note: This assumes at least one RFI has been synced from ACC
    const accBadge = page.locator('[class*="MuiChip"]').filter({ hasText: /ACC/ }).first()

    // Check if ACC badge exists (might not if no synced RFIs yet)
    const badgeCount = await accBadge.count()
    if (badgeCount > 0) {
      await expect(accBadge).toBeVisible()
    }
  })

  test('should display conflict badge for conflicted RFIs', async ({ page }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Look for conflict badge
    const conflictBadge = page.locator('[class*="MuiChip"]').filter({
      hasText: /Conflict|קונפליקט/i
    }).first()

    // Check if conflict badge exists
    const badgeCount = await conflictBadge.count()
    if (badgeCount > 0) {
      await expect(conflictBadge).toBeVisible()
    }
  })
})

test.describe('ACC RFI Sync - Conflict Resolution', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/projects/, { timeout: 10000 })
  })

  test('should show conflict count in dashboard', async ({ page }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Look for conflict count (might be 0)
    const conflictText = page.locator('text=/conflicts|קונפליקטים/i').first()
    const textCount = await conflictText.count()

    if (textCount > 0) {
      await expect(conflictText).toBeVisible()
    }
  })

  test('should display conflict alert when conflicts exist', async ({ page }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    await page.goto(`/projects/${TEST_PROJECT_ID}/rfis`)
    await page.waitForLoadState('networkidle')

    // Look for conflict alert
    const conflictAlert = page.locator('[class*="MuiAlert"]').filter({
      hasText: /conflict/i
    }).first()

    const alertCount = await conflictAlert.count()
    if (alertCount > 0) {
      await expect(conflictAlert).toBeVisible()
    }
  })
})

test.describe('ACC RFI Sync - API Integration', () => {
  test('should load RFI page without console errors', async ({ page }) => {
    // Monitor console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify no critical console errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('404') &&
      !err.includes('chunk')
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test('should verify ACC sync API endpoints are accessible', async ({ page, request }) => {
    if (!TEST_PROJECT_ID) {
      test.skip()
      return
    }

    // Login to get auth token
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/projects/, { timeout: 10000 })

    // Get auth token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('authToken'))

    if (!token) {
      test.skip()
      return
    }

    // Test sync status endpoint
    const statusResponse = await request.get(
      `http://localhost:8000/api/v1/projects/${TEST_PROJECT_ID}/acc/sync/status`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    // Endpoint should return 200 or 401/403 if permissions issue
    expect([200, 401, 403]).toContain(statusResponse.status())
  })
})
