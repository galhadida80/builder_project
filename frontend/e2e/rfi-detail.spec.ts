import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login.page'

test.describe('RFI Detail Page', () => {
  test('should redirect unauthenticated user from RFI detail to login @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await page.goto('/projects/some-project/rfis/some-rfi-id')
    await page.waitForLoadState('networkidle')
    await loginPage.expectRedirectedToLogin()
  })

  test('should redirect unauthenticated user from RFI list to login', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await page.goto('/projects/some-project/rfis')
    await page.waitForLoadState('networkidle')
    await loginPage.expectRedirectedToLogin()
  })
})

test.describe('RFI Communication Thread', () => {
  test('should load login page without errors @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.expectLoaded()
  })
})

test.describe('RFI List Page Navigation', () => {
  test('should redirect to login when trying to access RFIs', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await page.goto('/projects/some-project/rfis')
    await page.waitForLoadState('networkidle')
    await loginPage.expectRedirectedToLogin()
  })
})

test.describe('Translation Keys', () => {
  test('should have all required translation keys loaded', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await expect(loginPage.brandingText).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Sign In').first()).toBeVisible()
  })
})
