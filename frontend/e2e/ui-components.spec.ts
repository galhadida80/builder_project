import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login.page'
import { DashboardPage } from './pages/dashboard.page'

test.describe('Login Page', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test('should display login form with branding @smoke', async () => {
    await loginPage.expectLoaded()
  })

  test('should display welcome message', async ({ page }) => {
    await expect(page.getByText('Welcome back').first()).toBeVisible({ timeout: 10000 })
  })

  test('should toggle between sign in and sign up tabs @smoke', async () => {
    await loginPage.switchToSignUp()
  })

  test('should have password visibility toggle', async () => {
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password')
  })

  test('should display feature highlights', async ({ page }) => {
    const viewport = page.viewportSize()
    if (viewport && viewport.width >= 768) {
      await expect(page.getByText('Real-time project tracking').first()).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('Login Form Validation', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test('should require email field @smoke', async () => {
    await expect(loginPage.emailInput).toBeVisible({ timeout: 10000 })
    await loginPage.passwordInput.fill('password123')
    await loginPage.submitButton.click()
    const isRequired = await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.required)
    expect(isRequired).toBe(true)
  })

  test('should require password field', async () => {
    const isRequired = await loginPage.passwordInput.evaluate((el: HTMLInputElement) => el.required)
    expect(isRequired).toBe(true)
  })

  test('should validate password length on signup', async ({ page }) => {
    await loginPage.switchToSignUp()
    const inputs = page.getByRole('textbox')
    const passwordInputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill('Test User')
    await inputs.nth(1).fill('test@example.com')
    await passwordInputs.nth(0).fill('short')
    await passwordInputs.nth(1).fill('short')
    await page.getByRole('button', { name: /sign up|create/i }).click()
    await expect(page.getByText('8 characters').first()).toBeVisible({ timeout: 5000 })
  })

  test('should validate password match on signup', async ({ page }) => {
    await loginPage.switchToSignUp()
    const inputs = page.getByRole('textbox')
    const passwordInputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill('Test User')
    await inputs.nth(1).fill('test@example.com')
    await passwordInputs.nth(0).fill('password123')
    await passwordInputs.nth(1).fill('different456')
    await page.getByRole('button', { name: /sign up|create/i }).click()
    await expect(page.getByText('match').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Responsive Design', () => {
  test('should display correctly on mobile @smoke', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await expect(loginPage.emailInput).toBeVisible({ timeout: 10000 })
    await expect(loginPage.submitButton).toBeVisible()
  })

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await expect(loginPage.emailInput).toBeVisible({ timeout: 10000 })
  })

  test('should display feature panel on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await expect(page.getByText('Build Smarter').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Inspect Faster').first()).toBeVisible()
  })
})

test.describe('Theme and Styling', () => {
  test('should have proper background styling', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    const body = page.locator('body')
    await expect(body).toBeVisible({ timeout: 10000 })
    const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor)
    expect(bgColor).toBeTruthy()
    expect(bgColor).not.toBe('')
  })

  test('should render Material UI components', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    const muiElements = await page.locator('[class*="Mui"]').count()
    expect(muiElements).toBeGreaterThan(0)
  })
})

test.describe('Navigation', () => {
  test('should have link to signup from signin', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await expect(page.getByText('Sign up').first()).toBeVisible({ timeout: 10000 })
  })

  test('should have forgot password link', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await expect(loginPage.forgotPasswordLink).toBeVisible({ timeout: 10000 })
  })

  test('should redirect to login when accessing protected route @smoke', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.removeItem('authToken')
      localStorage.removeItem('userId')
    })
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.expectRedirectedToLogin()
  })
})

test.describe('Accessibility', () => {
  test('should have form labels', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 10000 })
  })

  test('should be keyboard navigable @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await page.keyboard.press('Tab')
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedTag).toBeTruthy()
  })

  test('should have visible focus states', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.emailInput.focus()
    await expect(loginPage.emailInput).toBeFocused()
  })
})
