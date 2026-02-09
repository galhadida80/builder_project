import { type Page, type Locator, expect } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly heading: Locator
  readonly muiCards: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading').first()
    this.muiCards = page.locator('[class*="MuiCard"]')
  }

  async goto() {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('networkidle')
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 })
  }

  async expectRedirectedToLogin() {
    await expect(this.page).toHaveURL(/\/login/, { timeout: 10000 })
  }

  async expectCardsVisible(minCount = 1) {
    const count = await this.muiCards.count()
    expect(count).toBeGreaterThanOrEqual(minCount)
  }

  async expectMuiRendered() {
    const muiCount = await this.page.locator('[class*="Mui"]').count()
    expect(muiCount).toBeGreaterThan(0)
  }
}
