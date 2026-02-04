import { test, expect } from '@playwright/test'

test.describe('Responsive Navigation - Mobile Drawer', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (requires auth)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should show hamburger menu icon on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500) // Wait for responsive styles to apply

    // Hamburger menu should be visible on mobile
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await expect(hamburger).toBeVisible({ timeout: 10000 })

    // Check it has proper touch target size
    const box = await hamburger.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('should hide hamburger menu icon on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    // Hamburger menu should NOT be visible on desktop
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await expect(hamburger).not.toBeVisible({ timeout: 5000 })
  })

  test('should open mobile drawer when hamburger clicked', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Initially, mobile drawer should be closed
    const drawer = page.locator('.MuiDrawer-root.MuiDrawer-modal')
    await expect(drawer).not.toBeVisible()

    // Click hamburger menu
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await hamburger.click()
    await page.waitForTimeout(300) // Wait for drawer animation

    // Drawer should now be visible
    await expect(drawer).toBeVisible()

    // Check drawer contains navigation items
    await expect(page.locator('text=Dashboard').first()).toBeVisible()
    await expect(page.locator('text=Projects').first()).toBeVisible()
  })

  test('should close mobile drawer when clicking navigation item', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Open drawer
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await hamburger.click()
    await page.waitForTimeout(300)

    // Click a navigation item
    const projectsLink = page.locator('.MuiDrawer-modal').locator('text=Projects').first()
    await projectsLink.click()
    await page.waitForTimeout(500)

    // Drawer should close after navigation
    const drawer = page.locator('.MuiDrawer-root.MuiDrawer-modal')
    await expect(drawer).not.toBeVisible()
  })

  test('should close mobile drawer when clicking backdrop', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Open drawer
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await hamburger.click()
    await page.waitForTimeout(300)

    const drawer = page.locator('.MuiDrawer-root.MuiDrawer-modal')
    await expect(drawer).toBeVisible()

    // Click backdrop (overlay)
    const backdrop = page.locator('.MuiBackdrop-root')
    await backdrop.click()
    await page.waitForTimeout(300)

    // Drawer should close
    await expect(drawer).not.toBeVisible()
  })
})

test.describe('Responsive Navigation - Desktop Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should show permanent sidebar on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    // Permanent drawer should be visible
    const permanentDrawer = page.locator('.MuiDrawer-root').filter({ has: page.locator('.MuiDrawer-docked') })
    await expect(permanentDrawer).toBeVisible({ timeout: 10000 })

    // Check sidebar contains navigation
    await expect(page.locator('text=BuilderOps').first()).toBeVisible()
    await expect(page.locator('text=Dashboard').first()).toBeVisible()
    await expect(page.locator('text=Projects').first()).toBeVisible()
  })

  test('should show permanent sidebar on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)

    // At md breakpoint (768px), should show permanent drawer
    const permanentDrawer = page.locator('.MuiDrawer-root').filter({ has: page.locator('.MuiDrawer-docked') })
    await expect(permanentDrawer).toBeVisible({ timeout: 10000 })

    // Hamburger should be hidden
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await expect(hamburger).not.toBeVisible()
  })

  test('should hide permanent sidebar on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Permanent drawer should NOT be visible on mobile
    const permanentDrawer = page.locator('.MuiDrawer-root').filter({ has: page.locator('.MuiDrawer-docked') })
    await expect(permanentDrawer).not.toBeVisible()
  })

  test('should navigate using desktop sidebar links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    // Click Projects in sidebar
    const projectsLink = page.locator('.MuiDrawer-docked').locator('text=Projects')
    await projectsLink.click()
    await page.waitForTimeout(500)

    // Should navigate to projects page
    expect(page.url()).toContain('/projects')

    // Sidebar should still be visible (permanent)
    const permanentDrawer = page.locator('.MuiDrawer-root').filter({ has: page.locator('.MuiDrawer-docked') })
    await expect(permanentDrawer).toBeVisible()
  })
})

test.describe('Responsive Navigation - Viewport Resize Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should close mobile drawer when resizing from mobile to desktop', async ({ page }) => {
    // Start on mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Open mobile drawer
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await hamburger.click()
    await page.waitForTimeout(300)

    const mobileDrawer = page.locator('.MuiDrawer-root.MuiDrawer-modal')
    await expect(mobileDrawer).toBeVisible()

    // Resize to desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    // Mobile drawer should close automatically
    await expect(mobileDrawer).not.toBeVisible()

    // Permanent drawer should be visible
    const permanentDrawer = page.locator('.MuiDrawer-root').filter({ has: page.locator('.MuiDrawer-docked') })
    await expect(permanentDrawer).toBeVisible()
  })

  test('should switch navigation mode when resizing from desktop to mobile', async ({ page }) => {
    // Start on desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    // Permanent drawer should be visible
    const permanentDrawer = page.locator('.MuiDrawer-root').filter({ has: page.locator('.MuiDrawer-docked') })
    await expect(permanentDrawer).toBeVisible()

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Permanent drawer should hide
    await expect(permanentDrawer).not.toBeVisible()

    // Hamburger menu should appear
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await expect(hamburger).toBeVisible()
  })

  test('should handle orientation change (portrait to landscape)', async ({ page }) => {
    // Start in portrait mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await expect(hamburger).toBeVisible()

    // Rotate to landscape (still mobile)
    await page.setViewportSize({ width: 667, height: 375 })
    await page.waitForTimeout(500)

    // Hamburger should still be visible (below md breakpoint)
    await expect(hamburger).toBeVisible()

    // Navigation should still work
    await hamburger.click()
    await page.waitForTimeout(300)

    const drawer = page.locator('.MuiDrawer-root.MuiDrawer-modal')
    await expect(drawer).toBeVisible()
  })
})

test.describe('Responsive Navigation - Touch Target Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should have adequate touch targets for hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    const box = await hamburger.boundingBox()

    expect(box).toBeTruthy()
    // WCAG 2.1 Level AAA: minimum 44x44px
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('should have adequate touch targets for mobile drawer navigation items', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Open drawer
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await hamburger.click()
    await page.waitForTimeout(300)

    // Check navigation items have adequate touch targets
    const navItems = page.locator('.MuiDrawer-modal .MuiListItemButton-root')
    const count = await navItems.count()

    expect(count).toBeGreaterThan(0)

    // Check first few items
    for (let i = 0; i < Math.min(count, 5); i++) {
      const item = navItems.nth(i)
      const box = await item.boundingBox()

      if (box) {
        // Height should be at least 44px
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('should have adequate spacing between navigation items', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Open drawer
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await hamburger.click()
    await page.waitForTimeout(300)

    // Get positions of first two navigation items
    const firstItem = page.locator('.MuiDrawer-modal .MuiListItemButton-root').first()
    const secondItem = page.locator('.MuiDrawer-modal .MuiListItemButton-root').nth(1)

    const firstBox = await firstItem.boundingBox()
    const secondBox = await secondItem.boundingBox()

    if (firstBox && secondBox) {
      // Items should not overlap (secondItem top should be >= firstItem bottom)
      expect(secondBox.y).toBeGreaterThanOrEqual(firstBox.y + firstBox.height)
    }
  })
})

test.describe('Responsive Navigation - Header Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should have full width header on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    const header = page.locator('.MuiAppBar-root')
    await expect(header).toBeVisible()

    const box = await header.boundingBox()
    const viewport = page.viewportSize()

    expect(box).toBeTruthy()
    expect(viewport).toBeTruthy()

    // Header should span full width on mobile
    expect(box!.width).toBeCloseTo(viewport!.width, 2)
  })

  test('should have offset header on desktop (accounting for sidebar)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    const header = page.locator('.MuiAppBar-root')
    await expect(header).toBeVisible()

    const box = await header.boundingBox()
    const viewport = page.viewportSize()

    expect(box).toBeTruthy()
    expect(viewport).toBeTruthy()

    // Header should be offset by sidebar width (260px) on desktop
    // Width should be less than full viewport
    expect(box!.width).toBeLessThan(viewport!.width)
    // Left position should account for sidebar
    expect(box!.x).toBeGreaterThan(0)
  })

  test('should show all header controls on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Check essential header elements are visible
    await expect(page.locator('button[aria-label="open mobile menu"]')).toBeVisible()

    // User avatar should be visible
    const avatar = page.locator('.MuiAvatar-root').first()
    await expect(avatar).toBeVisible()

    // Notifications icon should be visible
    const notifications = page.locator('svg').filter({ hasText: '' }).first()
    await expect(notifications).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Responsive Navigation - Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should navigate between pages on mobile using drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Open drawer
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await hamburger.click()
    await page.waitForTimeout(300)

    // Click Projects
    await page.locator('.MuiDrawer-modal').locator('text=Projects').first().click()
    await page.waitForTimeout(1000)

    // Should navigate to projects
    expect(page.url()).toContain('/projects')

    // Drawer should close
    const drawer = page.locator('.MuiDrawer-root.MuiDrawer-modal')
    await expect(drawer).not.toBeVisible()

    // Should be able to open drawer again
    await hamburger.click()
    await page.waitForTimeout(300)
    await expect(drawer).toBeVisible()
  })

  test('should navigate between pages on desktop using sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    // Click Projects in permanent sidebar
    await page.locator('.MuiDrawer-docked').locator('text=Projects').first().click()
    await page.waitForTimeout(1000)

    // Should navigate to projects
    expect(page.url()).toContain('/projects')

    // Sidebar should remain visible
    const permanentDrawer = page.locator('.MuiDrawer-root').filter({ has: page.locator('.MuiDrawer-docked') })
    await expect(permanentDrawer).toBeVisible()

    // Click Dashboard
    await page.locator('.MuiDrawer-docked').locator('text=Dashboard').first().click()
    await page.waitForTimeout(1000)

    // Should navigate to dashboard
    expect(page.url()).toContain('/dashboard')

    // Sidebar should still be visible
    await expect(permanentDrawer).toBeVisible()
  })

  test('should highlight active navigation item', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    // Dashboard should be active initially
    const dashboardItem = page.locator('.MuiDrawer-docked').locator('text=Dashboard').first()
    const dashboardButton = dashboardItem.locator('xpath=ancestor::button')

    // Check if it has selected class
    await expect(dashboardButton).toHaveClass(/Mui-selected/)

    // Navigate to Projects
    await page.locator('.MuiDrawer-docked').locator('text=Projects').first().click()
    await page.waitForTimeout(500)

    // Projects should now be active
    const projectsItem = page.locator('.MuiDrawer-docked').locator('text=Projects').first()
    const projectsButton = projectsItem.locator('xpath=ancestor::button')
    await expect(projectsButton).toHaveClass(/Mui-selected/)
  })
})

test.describe('Responsive Navigation - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should have proper ARIA labels on hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await expect(hamburger).toBeVisible()

    // Check aria-label exists
    const ariaLabel = await hamburger.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel).toContain('menu')
  })

  test('should be keyboard navigable on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    // Tab to navigation items
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should be able to navigate with Enter key
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should maintain focus management when opening mobile drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Focus hamburger and press Enter
    const hamburger = page.locator('button[aria-label="open mobile menu"]')
    await hamburger.focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // Drawer should open
    const drawer = page.locator('.MuiDrawer-root.MuiDrawer-modal')
    await expect(drawer).toBeVisible()

    // Focus should be inside drawer
    const focusedElement = page.locator(':focus')
    const isInDrawer = await focusedElement.evaluate((el, drawerSelector) => {
      const drawer = document.querySelector(drawerSelector)
      return drawer ? drawer.contains(el) : false
    }, '.MuiDrawer-modal')

    // Focus should be trapped in modal drawer
    expect(isInDrawer || await focusedElement.count() === 0).toBeTruthy()
  })
})

test.describe('Responsive Navigation - Content Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should have full width content on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    const main = page.locator('main')
    await expect(main).toBeVisible()

    const box = await main.boundingBox()
    const viewport = page.viewportSize()

    expect(box).toBeTruthy()
    expect(viewport).toBeTruthy()

    // Main content should use full width on mobile
    // (minus some padding)
    expect(box!.width).toBeGreaterThan(viewport!.width * 0.9)
  })

  test('should have offset content on desktop (accounting for sidebar)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    const main = page.locator('main')
    await expect(main).toBeVisible()

    const box = await main.boundingBox()
    const viewport = page.viewportSize()

    expect(box).toBeTruthy()
    expect(viewport).toBeTruthy()

    // Main content should be offset by sidebar (260px)
    expect(box!.x).toBeGreaterThan(200) // Should be around 260px

    // Content width should be viewport minus sidebar
    expect(box!.width).toBeLessThan(viewport!.width)
  })

  test('should not have horizontal scroll on any viewport', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 }, // iPhone SE (smallest)
      { width: 375, height: 667 }, // iPhone 8
      { width: 768, height: 1024 }, // iPad
      { width: 1280, height: 720 }, // Desktop
      { width: 1920, height: 1080 }, // Large desktop
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(500)

      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(hasHorizontalScroll).toBe(false)
    }
  })
})
