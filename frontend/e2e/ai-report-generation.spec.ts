import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for AI Report Generation
 *
 * These tests verify the complete workflow for generating AI-powered reports:
 * - Weekly progress reports
 * - Inspection summary reports
 * - Preview and download functionality
 * - Bilingual support
 */

// Helper function to perform login
async function login(page: Page, email: string = 'user@example.com', password: string = 'password123') {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  const emailInput = page.locator('input[type="email"]').first()
  const passwordInput = page.locator('input[type="password"]').first()

  await emailInput.fill(email)
  await passwordInput.fill(password)

  // Click login button (handles both English and Hebrew)
  const loginButton = page.locator('button:has-text("Login"), button:has-text("התחברות")').first()
  await loginButton.click()

  // Wait for navigation (could be dashboard or projects page)
  await page.waitForLoadState('networkidle', { timeout: 10000 })
}

// Helper function to navigate to reports page
async function navigateToReports(page: Page, projectId: string = 'test-project-id') {
  await page.goto(`/projects/${projectId}/reports`)
  await page.waitForLoadState('networkidle')
}

test.describe('AI Report Generation - Component Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
  })

  test('should load login page without errors', async ({ page }) => {
    // Verify the app loads (meaning all components including report generation parsed without errors)
    await expect(page.locator('text=BuilderOps').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('should redirect unauthenticated user from reports page to login', async ({ page }) => {
    await page.goto('/projects/some-project/reports')
    await page.waitForLoadState('networkidle')

    // Unauthenticated user should be redirected to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

test.describe('AI Report Generation - Weekly Report Flow', () => {
  test.skip('should generate weekly report from UI', async ({ page }) => {
    // This test requires authentication and a running backend
    await login(page)
    await navigateToReports(page)

    // Verify Reports page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /Reports|דוחות/ })).toBeVisible({ timeout: 10000 })

    // Click "Generate AI Report" button
    const generateButton = page.locator('button').filter({ hasText: /Generate.*Report|צור.*דוח/ }).first()
    await expect(generateButton).toBeVisible({ timeout: 5000 })
    await generateButton.click()

    // Verify Report Generation Wizard opened
    await expect(page.locator('text=/Select Report Type|בחר סוג דוח/')).toBeVisible({ timeout: 5000 })

    // Select "Weekly Progress Report"
    await page.locator('[role="button"]').filter({ hasText: /Weekly.*Progress|דוח.*שבועי/ }).click()
    await page.locator('button').filter({ hasText: /Next|הבא/ }).click()

    // Configure date range
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 7)
    await page.locator('input[type="date"]').first().fill(weekAgo.toISOString().split('T')[0])
    await page.locator('input[type="date"]').last().fill(today.toISOString().split('T')[0])

    // Select language and proceed
    const hebrewLanguageOption = page.locator('[role="button"]').filter({ hasText: /Hebrew|עברית/ })
    if (await hebrewLanguageOption.isVisible()) {
      await hebrewLanguageOption.click()
    }
    await page.locator('button').filter({ hasText: /Next|הבא/ }).click()

    // Generate report
    await page.locator('button').filter({ hasText: /Generate.*Report|צור.*דוח/ }).click()

    // Verify preview dialog opened with tabs
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('button[role="tab"]').filter({ hasText: /Preview|תצוגה/ })).toBeVisible()
    await expect(page.locator('button[role="tab"]').filter({ hasText: /Edit|עריכה/ })).toBeVisible()

    // Verify preview iframe loaded
    await expect(page.locator('iframe').first()).toBeVisible({ timeout: 5000 })

    // Download PDF
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.locator('button').filter({ hasText: /Download.*PDF|הורד.*PDF/ }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/weekly.*report.*\.pdf/i)
    expect(await download.path()).toBeTruthy()
  })

  test.skip('should preview and edit report before download', async ({ page }) => {
    // This test requires authentication and a running backend
    await login(page)
    await navigateToReports(page)

    // Generate report through wizard
    await page.locator('button').filter({ hasText: /Generate.*Report|צור.*דוח/ }).first().click()
    await page.locator('[role="button"]').filter({ hasText: /Weekly.*Progress|דוח.*שבועי/ }).click()
    await page.locator('button').filter({ hasText: /Next|הבא/ }).click()
    await page.locator('button').filter({ hasText: /Next|הבא/ }).click()
    await page.locator('button').filter({ hasText: /Generate.*Report|צור.*דוח/ }).click()

    // Wait for preview dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 15000 })

    // Switch to Edit tab and verify HTML content
    await page.locator('button[role="tab"]').filter({ hasText: /Edit|עריכה/ }).click()
    const htmlTextarea = page.locator('textarea').first()
    await expect(htmlTextarea).toBeVisible()
    const originalHtml = await htmlTextarea.inputValue()
    expect(originalHtml).toContain('<!DOCTYPE html>')

    // Edit and download
    const editedHtml = originalHtml.replace('<body', '<!-- User edited --><body')
    await htmlTextarea.fill(editedHtml)
    await expect(page.locator('text=/careful|זהירות/')).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.locator('button').filter({ hasText: /Download.*PDF|הורד.*PDF/ }).click()
    expect((await downloadPromise).suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test.skip('should generate bilingual report', async ({ page }) => {
    // This test requires authentication and a running backend
    await login(page)
    await navigateToReports(page)

    // Open wizard and configure
    await page.locator('button').filter({ hasText: /Generate.*Report|צור.*דוח/ }).first().click()
    await page.locator('[role="button"]').filter({ hasText: /Weekly.*Progress|דוח.*שבועי/ }).click()
    await page.locator('button').filter({ hasText: /Next|הבא/ }).click()

    // Set date range
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 7)
    await page.locator('input[type="date"]').first().fill(weekAgo.toISOString().split('T')[0])
    await page.locator('input[type="date"]').last().fill(today.toISOString().split('T')[0])

    // Select both languages if available
    const bothOption = page.locator('[role="button"]').filter({ hasText: /Both|שניהם/ })
    if (await bothOption.isVisible()) await bothOption.click()

    // Generate and verify bilingual content
    await page.locator('button').filter({ hasText: /Next|הבא/ }).click()
    await page.locator('button').filter({ hasText: /Generate.*Report|צור.*דוח/ }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 15000 })

    // Check HTML for bilingual markers
    await page.locator('button[role="tab"]').filter({ hasText: /Edit|עריכה/ }).click()
    const htmlContent = await page.locator('textarea').first().inputValue()
    expect(htmlContent).toContain('lang="he"')
    expect(htmlContent).toContain('dir="rtl"')
  })
})

test.describe('AI Report Generation - Inspection Summary Flow', () => {
  test.skip('should generate inspection summary report', async ({ page }) => {
    // This test requires authentication and a running backend
    await login(page)
    await navigateToReports(page)

    // Open wizard and select inspection summary
    await page.locator('button').filter({ hasText: /Generate.*Report|צור.*דוח/ }).first().click()
    const inspectionOption = page.locator('[role="button"]').filter({ hasText: /Inspection.*Summary|סיכום.*בדיקה/ })
    await expect(inspectionOption).toBeVisible()
    await inspectionOption.click()
    await page.locator('button').filter({ hasText: /Next|הבא/ }).click()

    // Configure date range (last month)
    const today = new Date()
    const monthAgo = new Date(today)
    monthAgo.setMonth(today.getMonth() - 1)
    await page.locator('input[type="date"]').first().fill(monthAgo.toISOString().split('T')[0])
    await page.locator('input[type="date"]').last().fill(today.toISOString().split('T')[0])

    // Generate and download
    await page.locator('button').filter({ hasText: /Next|הבא/ }).click()
    await page.locator('button').filter({ hasText: /Generate.*Report|צור.*דוח/ }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 15000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.locator('button').filter({ hasText: /Download.*PDF|הורד.*PDF/ }).click()
    expect((await downloadPromise).suggestedFilename()).toMatch(/inspection.*summary.*\.pdf/i)
  })
})

test.describe('AI Report Generation - Error Handling', () => {
  test.skip('should handle invalid date range gracefully', async ({ page }) => {
    // This test requires authentication and a running backend
    await login(page)
    await navigateToReports(page)

    // Open wizard and select report type
    await page.locator('button').filter({ hasText: /Generate.*Report|צור.*דוח/ }).first().click()
    await page.locator('[role="button"]').filter({ hasText: /Weekly.*Progress|דוח.*שבועי/ }).click()
    await page.locator('button').filter({ hasText: /Next|הבא/ }).click()

    // Enter invalid date range (to_date before from_date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    await page.locator('input[type="date"]').first().fill(tomorrow.toISOString().split('T')[0])
    await page.locator('input[type="date"]').last().fill(today.toISOString().split('T')[0])

    // Try to proceed - should show validation error
    await page.locator('button').filter({ hasText: /Next|הבא/ }).click()
    await expect(page.locator('text=/invalid|שגיאה/')).toBeVisible({ timeout: 5000 })
  })
})
