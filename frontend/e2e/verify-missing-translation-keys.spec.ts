import { test, expect, Page } from '@playwright/test';

test.describe('Translation Key Verification - Missing Keys Check', () => {
  let page: Page;
  const BASE_URL = 'http://localhost:4177';
  const missingKeyWarnings: string[] = [];
  const missingKeys = new Set<string>();

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Intercept console messages to catch i18next warnings
    page.on('console', (msg) => {
      const text = msg.text();

      // i18next logs missing keys with these patterns:
      // "i18next::translator: key "xxx.yyy" for languages "he" not found"
      // "[WARN] ...missing keys..."
      if (
        text.includes('not found') ||
        text.includes('missing keys') ||
        text.includes('defaultValue') ||
        text.toLowerCase().includes('key') && text.toLowerCase().includes('not found')
      ) {
        console.log('Translation warning caught:', text);
        missingKeyWarnings.push(text);

        // Extract key name if possible
        const keyMatch = text.match(/key "([^"]+)"/);
        if (keyMatch) {
          missingKeys.add(keyMatch[1]);
        }
      }
    });

    await page.goto(`${BASE_URL}/login`);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Switch to Hebrew and check for missing translation keys', async () => {
    // Login to access the full app
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button:has-text("Sign In")');

    // Wait for navigation to dashboard
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {
      console.log('No navigation after login, continuing...');
    });

    // Give page time to load
    await page.waitForTimeout(2000);

    // Find and click the language toggle (look for globe icon or language button)
    const languageToggle = await page.locator('button[aria-label*="language"], button[title*="language"], [class*="language"]').first();

    if (await languageToggle.isVisible().catch(() => false)) {
      await languageToggle.click();
      await page.waitForTimeout(500);

      // Look for Hebrew option
      const hebrewOption = await page.locator('text=עברית, text=Hebrew, text=he').first();
      if (await hebrewOption.isVisible().catch(() => false)) {
        await hebrewOption.click();
        await page.waitForTimeout(1000);
      }
    } else {
      // Alternative: use localStorage to switch language
      await page.evaluate(() => {
        localStorage.setItem('i18nextLng', 'he');
        window.location.reload();
      });
      await page.waitForNavigation({ timeout: 10000 }).catch(() => {
        console.log('Page reload during language switch');
      });
      await page.waitForTimeout(2000);
    }

    // Verify we're in Hebrew mode
    const htmlDir = await page.getAttribute('html', 'dir');
    const htmlLang = await page.getAttribute('html', 'lang');
    console.log(`HTML direction: ${htmlDir}, lang: ${htmlLang}`);
    expect(htmlDir).toBe('rtl');
    expect(htmlLang).toBe('he');
  });

  test('Navigate through all pages and check for missing keys in Dashboard', async () => {
    // Switch to Hebrew first
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    // Check for missing key warnings
    console.log(`Missing key warnings on Dashboard: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Navigate to Projects page and check for missing keys', async () => {
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/projects`);
    await page.waitForTimeout(2000);

    console.log(`Missing key warnings on Projects: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Navigate to Equipment page and check for missing keys', async () => {
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/projects/1/equipment`);
    await page.waitForTimeout(2000);

    console.log(`Missing key warnings on Equipment: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Navigate to Materials page and check for missing keys', async () => {
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/projects/1/materials`);
    await page.waitForTimeout(2000);

    console.log(`Missing key warnings on Materials: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Navigate to Meetings page and check for missing keys', async () => {
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/projects/1/meetings`);
    await page.waitForTimeout(2000);

    console.log(`Missing key warnings on Meetings: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Navigate to Approvals page and check for missing keys', async () => {
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/projects/1/approvals`);
    await page.waitForTimeout(2000);

    console.log(`Missing key warnings on Approvals: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Navigate to Areas page and check for missing keys', async () => {
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/projects/1/areas`);
    await page.waitForTimeout(2000);

    console.log(`Missing key warnings on Areas: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Navigate to Contacts page and check for missing keys', async () => {
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/projects/1/contacts`);
    await page.waitForTimeout(2000);

    console.log(`Missing key warnings on Contacts: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Navigate to Inspections page and check for missing keys', async () => {
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/projects/1/inspections`);
    await page.waitForTimeout(2000);

    console.log(`Missing key warnings on Inspections: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Navigate to RFI page and check for missing keys', async () => {
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/projects/1/rfi`);
    await page.waitForTimeout(2000);

    console.log(`Missing key warnings on RFI: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Navigate to Audit Log page and check for missing keys', async () => {
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.goto(`${BASE_URL}/audit-log`);
    await page.waitForTimeout(2000);

    console.log(`Missing key warnings on Audit Log: ${missingKeyWarnings.length}`);
    expect(missingKeyWarnings.length).toBe(0);
  });

  test('Summary: Report all missing translation keys found', async () => {
    if (missingKeys.size > 0) {
      console.log('\n=== MISSING TRANSLATION KEYS FOUND ===');
      Array.from(missingKeys).forEach(key => {
        console.log(`  - ${key}`);
      });
      console.log('=======================================\n');
    }

    console.log(`Total missing key warnings: ${missingKeyWarnings.length}`);
    console.log(`Total unique missing keys: ${missingKeys.size}`);

    // This test passes even if keys are missing - the previous tests verify each page
    expect(true).toBe(true);
  });
});
