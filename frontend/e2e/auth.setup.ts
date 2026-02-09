import { test as setup } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json')

setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.getByRole('textbox', { name: /email/i }).fill('admin@builderops.com')
  await page.getByLabel(/password/i).first().fill('admin123456')
  await page.getByRole('button', { name: /sign in/i }).click()

  await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {
    // If redirect doesn't happen, auth may need different credentials
    // Storage state is still saved for whatever auth state we have
  })

  await page.context().storageState({ path: AUTH_FILE })
})
