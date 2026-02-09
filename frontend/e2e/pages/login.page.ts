import { type Page, type Locator, expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly signUpTab: Locator
  readonly brandingText: Locator
  readonly forgotPasswordLink: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByRole('textbox', { name: /email/i })
    this.passwordInput = page.getByLabel(/password/i).first()
    this.submitButton = page.getByRole('button', { name: /sign in/i })
    this.signUpTab = page.getByRole('tab', { name: /sign up/i }).or(page.getByText('Sign Up').first())
    this.brandingText = page.getByText('BuilderOps').first()
    this.forgotPasswordLink = page.getByText(/forgot password/i).first()
  }

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('networkidle')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async expectLoaded() {
    await expect(this.brandingText).toBeVisible({ timeout: 10000 })
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.submitButton).toBeVisible()
  }

  async switchToSignUp() {
    await this.signUpTab.click()
    await expect(this.page.getByText('Create account').first()).toBeVisible()
  }

  async expectRedirectedToLogin() {
    await expect(this.page).toHaveURL(/\/login/, { timeout: 10000 })
  }
}
