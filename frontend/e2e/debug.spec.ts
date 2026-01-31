import { test, expect } from '@playwright/test'

test('debug - check page load and console errors', async ({ page }) => {
  const consoleMessages: string[] = []
  const errors: string[] = []

  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`)
  })

  page.on('pageerror', err => {
    errors.push(err.message)
  })

  await page.goto('/login', { waitUntil: 'networkidle' })

  // Wait a bit for any async errors
  await page.waitForTimeout(3000)

  // Get the page HTML content
  const html = await page.content()

  console.log('=== PAGE HTML (first 2000 chars) ===')
  console.log(html.substring(0, 2000))

  console.log('\n=== CONSOLE MESSAGES ===')
  consoleMessages.forEach(msg => console.log(msg))

  console.log('\n=== PAGE ERRORS ===')
  errors.forEach(err => console.log(err))

  // Check if root has content
  const rootContent = await page.locator('#root').innerHTML()
  console.log('\n=== ROOT CONTENT LENGTH ===')
  console.log(rootContent.length)

  // If there are errors, fail the test
  if (errors.length > 0) {
    throw new Error(`Page errors found: ${errors.join(', ')}`)
  }

  // Root should have content
  expect(rootContent.length).toBeGreaterThan(0)
})
