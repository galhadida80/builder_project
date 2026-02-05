const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Go to login page
  await page.goto('http://localhost:4175/login', { waitUntil: 'networkidle' });

  // Check initial direction
  let dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
  console.log('Initial direction:', dir);

  // Set Hebrew language
  await page.evaluate(() => {
    localStorage.setItem('i18nextLng', 'he');
  });

  // Reload
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check direction after Hebrew
  dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
  console.log('After Hebrew switch - direction:', dir);

  // Check for Hebrew text
  const hasHebrew = await page.evaluate(() => /[\u0590-\u05FF]/.test(document.body.textContent || ''));
  console.log('Has Hebrew text:', hasHebrew);

  // Get sample text from the page
  const sampleText = await page.evaluate(() => {
    const texts = [];
    document.querySelectorAll('body *').forEach(el => {
      if (el.textContent && el.textContent.trim().length > 0 && el.children.length === 0) {
        texts.push(el.textContent.trim().substring(0, 50));
      }
    });
    return texts.slice(0, 10);
  });
  console.log('\nSample text from page:');
  sampleText.forEach((text, i) => console.log(`  ${i+1}. ${text}`));

  // Get page HTML length
  const htmlLength = await page.evaluate(() => document.documentElement.outerHTML.length);
  console.log('\nPage HTML length:', htmlLength);

  await browser.close();
})();
