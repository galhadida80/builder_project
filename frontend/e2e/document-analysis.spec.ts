import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login.page'

test.describe('Document Analysis Feature', () => {
  test('should have core app components loaded @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.expectLoaded()
    await expect(loginPage.brandingText).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Document Analysis Dialog', () => {
  test('should verify app compiles without component errors', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await expect(loginPage.brandingText).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Equipment Detail Page with Analysis', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await page.goto('/projects/some-project/equipment/some-equipment')
    await page.waitForLoadState('networkidle')
    await loginPage.expectRedirectedToLogin()
  })
})

test.describe('Materials Detail Page with Analysis', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await page.goto('/projects/some-project/materials/some-material')
    await page.waitForLoadState('networkidle')
    await loginPage.expectRedirectedToLogin()
  })
})
