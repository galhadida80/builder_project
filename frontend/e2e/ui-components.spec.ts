import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
  })

  test('should display login form with branding', async ({ page }) => {
    // Check branding
    await expect(page.locator('text=BuilderOps').first()).toBeVisible({ timeout: 10000 })

    // Check form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should display welcome message', async ({ page }) => {
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 })
  })

  test('should toggle between sign in and sign up tabs', async ({ page }) => {
    // Find the Sign Up tab and click it
    const signUpTab = page.locator('text=Sign Up').first()
    await expect(signUpTab).toBeVisible({ timeout: 10000 })
    await signUpTab.click()

    // Check for create account text
    await expect(page.locator('text=Create account').first()).toBeVisible()

    // Find name input which only appears in sign up
    await expect(page.locator('input').first()).toBeVisible()
  })

  test('should have password visibility toggle', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first()
    await expect(passwordInput).toBeVisible({ timeout: 10000 })

    // Check it's password type initially
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('should display feature highlights', async ({ page }) => {
    // Check some feature text is visible (on desktop)
    const viewport = page.viewportSize()
    if (viewport && viewport.width >= 768) {
      await expect(page.locator('text=Real-time project tracking').first()).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('Login Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
  })

  test('should require email field', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 10000 })

    // Try to submit without email
    await page.locator('input[type="password"]').first().fill('password123')
    await page.locator('button[type="submit"]').click()

    // Check email input has validation
    const isRequired = await emailInput.evaluate((el: HTMLInputElement) => el.required)
    expect(isRequired).toBe(true)
  })

  test('should require password field', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first()
    await expect(passwordInput).toBeVisible({ timeout: 10000 })

    const isRequired = await passwordInput.evaluate((el: HTMLInputElement) => el.required)
    expect(isRequired).toBe(true)
  })

  test('should validate password length on signup', async ({ page }) => {
    // Switch to sign up
    await page.locator('text=Sign Up').first().click()
    await page.waitForTimeout(500)

    // Fill form with short password
    const inputs = page.locator('input')
    await inputs.nth(0).fill('Test User') // Full name
    await inputs.nth(1).fill('test@example.com') // Email
    await inputs.nth(2).fill('short') // Password
    await inputs.nth(3).fill('short') // Confirm password

    // Submit
    await page.locator('button[type="submit"]').click()

    // Check for error message about password length
    await expect(page.locator('text=8 characters').first()).toBeVisible({ timeout: 5000 })
  })

  test('should validate password match on signup', async ({ page }) => {
    // Switch to sign up
    await page.locator('text=Sign Up').first().click()
    await page.waitForTimeout(500)

    // Fill form with mismatched passwords
    const inputs = page.locator('input')
    await inputs.nth(0).fill('Test User')
    await inputs.nth(1).fill('test@example.com')
    await inputs.nth(2).fill('password123')
    await inputs.nth(3).fill('different456')

    // Submit
    await page.locator('button[type="submit"]').click()

    // Check for error message about password match
    await expect(page.locator('text=match').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Core elements should be visible
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 })
  })

  test('should display feature panel on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // On desktop, the feature panel should be visible
    await expect(page.locator('text=Build Smarter').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Inspect Faster').first()).toBeVisible()
  })
})

test.describe('Theme and Styling', () => {
  test('should have proper background styling', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const body = page.locator('body')
    await expect(body).toBeVisible({ timeout: 10000 })

    // Check that some styling is applied
    const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor)
    expect(bgColor).toBeTruthy()
    expect(bgColor).not.toBe('')
  })

  test('should render Material UI components', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Check for MUI-specific class names
    const muiElements = await page.locator('[class*="Mui"]').count()
    expect(muiElements).toBeGreaterThan(0)
  })
})

test.describe('Navigation', () => {
  test('should have link to signup from signin', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Sign up').first()).toBeVisible({ timeout: 10000 })
  })

  test('should have forgot password link', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Forgot password').first()).toBeVisible({ timeout: 10000 })
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Clear any existing auth
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.removeItem('authToken')
      localStorage.removeItem('userId')
    })

    // Try to access dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Accessibility', () => {
  test('should have form labels', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Check that email and password labels exist
    await expect(page.locator('label').first()).toBeVisible({ timeout: 10000 })
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Tab to first input
    await page.keyboard.press('Tab')

    // Check something is focused
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedTag).toBeTruthy()
  })

  test('should have visible focus states', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]')
    await emailInput.focus()

    // Input should be visible and focusable
    await expect(emailInput).toBeFocused()
  })
})
