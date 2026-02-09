import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login.page'

test('debug - check page load and console errors @smoke', async ({ page }) => {
  const consoleMessages: string[] = []
  const errors: string[] = []

  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`)
  })

  page.on('pageerror', err => {
    errors.push(err.message)
  })

  const loginPage = new LoginPage(page)
  await loginPage.goto()

  await page.waitForTimeout(3000)

  console.log('\n=== CONSOLE MESSAGES ===')
  consoleMessages.forEach(msg => console.log(msg))

  console.log('\n=== PAGE ERRORS ===')
  errors.forEach(err => console.log(err))

  const rootContent = await page.locator('#root').innerHTML()
  console.log('\n=== ROOT CONTENT LENGTH ===')
  console.log(rootContent.length)

  if (errors.length > 0) {
    throw new Error(`Page errors found: ${errors.join(', ')}`)
  }

  expect(rootContent.length).toBeGreaterThan(0)
})
