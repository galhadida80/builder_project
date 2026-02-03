# E2E Hebrew Localization Testing Guide

## Overview

This guide provides comprehensive instructions for testing end-to-end flows in both English and Hebrew. The application should support:
- Language switching without page reload
- RTL (Right-to-Left) layout for Hebrew
- Persistence of language preference across reloads
- All UI content in both languages

## Prerequisites

Before running tests, ensure:

1. **Backend is running**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   # Backend should be running on http://localhost:8000
   ```

2. **Frontend is running**
   ```bash
   cd frontend
   npm install  # If dependencies not installed
   npm run dev
   # Frontend should be running on http://localhost:3000
   ```

3. **Database is initialized**
   - Migrations should be applied
   - Test data should be available (or use valid credentials)

## Running Playwright Tests

### Option 1: Run All Tests

```bash
cd frontend
npm install @playwright/test  # If not already installed
npx playwright test
```

### Option 2: Run Specific Test File

```bash
cd frontend
npx playwright test e2e/hebrew-localization.spec.ts
```

### Option 3: Run Tests in Headed Mode (See Browser)

```bash
cd frontend
npx playwright test --headed
```

### Option 4: Debug Tests

```bash
cd frontend
npx playwright test --debug
```

### View Test Results

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Manual Testing Checklist

If you prefer manual testing or need to verify specific scenarios, follow this checklist:

### 1. Load App in English ✓

**Steps:**
1. Navigate to http://localhost:3000 in your browser
2. Open DevTools Console (F12)
3. Note the current language

**Expected Results:**
- [ ] Page loads without errors
- [ ] Console shows no critical errors
- [ ] `document.dir` = "ltr"
- [ ] `document.documentElement.lang` = "en"
- [ ] All text is in English
- [ ] No horizontal scrollbars
- [ ] Layout is left-to-right

**Evidence:**
```javascript
// Run in browser console
console.log('Direction:', document.dir)
console.log('Language:', document.documentElement.lang)
```

### 2. Verify English Content Display ✓

**Steps:**
1. On login page, examine all visible text
2. Check form labels and placeholders
3. Check button text

**Expected Results:**
- [ ] Email field shows English label/placeholder
- [ ] Password field shows English label/placeholder
- [ ] Login button text is in English
- [ ] Any error messages are in English

**Specific Checks:**
- [ ] Login page title is in English
- [ ] Email field placeholder contains "email"
- [ ] Password field placeholder contains "password"
- [ ] Login button text is "Login" or "Sign In"

### 3. Switch to Hebrew ✓

**Steps:**
1. Locate language selector in header (looks like globe icon or language text)
2. Click on language selector
3. Select Hebrew (עברית) from dropdown menu
4. Wait for page to update (should be instant)

**Expected Results:**
- [ ] Language dropdown menu appears
- [ ] Hebrew option is visible
- [ ] Page updates immediately (no reload)
- [ ] `document.dir` changes to "rtl"
- [ ] `document.documentElement.lang` changes to "he"

**Evidence:**
```javascript
// Run in browser console after switching
console.log('Direction:', document.dir)  // Should be "rtl"
console.log('Language:', document.documentElement.lang)  // Should be "he"
```

### 4. Verify RTL Layout ✓

**Steps:**
1. After switching to Hebrew, examine the page layout
2. Check sidebar position
3. Check button positions
4. Resize browser to check responsiveness

**Expected Results:**
- [ ] Sidebar is on the RIGHT side (not left)
- [ ] Buttons are positioned for RTL
- [ ] Text flows right-to-left
- [ ] Margins and padding are reversed appropriately
- [ ] No horizontal scrollbars appear
- [ ] Navigation items are in correct position
- [ ] Icons remain properly positioned (not mirrored unless intended)

**Specific Checks:**
- [ ] Header elements are mirrored correctly
- [ ] Form fields are properly aligned
- [ ] Buttons are on the correct side
- [ ] Sidebar navigation text is readable

### 5. Verify Hebrew Content Display ✓

**Steps:**
1. After RTL is confirmed, examine all text
2. Check form labels
3. Check button text
4. Check any visible messages

**Expected Results:**
- [ ] All visible text is in Hebrew
- [ ] Email field shows Hebrew text/placeholder
- [ ] Password field shows Hebrew text/placeholder
- [ ] Login button shows Hebrew text
- [ ] No English text visible on the page

**Content Checks:**
- [ ] Form labels are in Hebrew (עברית)
- [ ] Button labels are in Hebrew
- [ ] Placeholders are in Hebrew
- [ ] Any error messages would be in Hebrew
- [ ] Page title reflects current language

### 6. Test Language Persistence ✓

**Steps:**
1. With Hebrew selected, reload the page (F5 or Ctrl+R)
2. Check that Hebrew persists after reload
3. Clear localStorage and reload (optional test)

**Expected Results:**
- [ ] Page reloads
- [ ] Language remains Hebrew
- [ ] `document.dir` is still "rtl"
- [ ] `document.documentElement.lang` is still "he"
- [ ] All content remains in Hebrew

**Evidence:**
```javascript
// Check localStorage
console.log('Stored language:', localStorage.getItem('i18nextLng'))  // Should be "he"
```

### 7. Test Language Switching Back to English ✓

**Steps:**
1. While in Hebrew mode, click language selector again
2. Select English from dropdown
3. Observe page update

**Expected Results:**
- [ ] Page updates immediately (no reload)
- [ ] `document.dir` changes back to "ltr"
- [ ] `document.documentElement.lang` changes to "en"
- [ ] All content switches back to English
- [ ] No console errors

### 8. Test Multiple Language Switches ✓

**Steps:**
1. Switch to Hebrew
2. Wait for page to update
3. Switch to English
4. Wait for page to update
5. Switch to Hebrew again
6. Repeat 2-3 times

**Expected Results:**
- [ ] Each switch is instant
- [ ] No errors appear
- [ ] Page renders correctly after each switch
- [ ] Layout properly adjusts each time
- [ ] No performance degradation

### 9. Test Form Submission in Hebrew ✓

**Steps:**
1. Switch to Hebrew
2. Fill in login form with test credentials:
   - Email: user@example.com (or valid test email)
   - Password: (valid test password)
3. Click Login button
4. Observe submission behavior

**Expected Results:**
- [ ] Form submits successfully
- [ ] If credentials are invalid, error message is in Hebrew
- [ ] If credentials are valid, redirects to dashboard
- [ ] No form elements break in RTL layout

### 10. Test Navigation in Hebrew ✓

**Steps:**
1. Log in with valid credentials
2. In Hebrew mode, navigate to different pages:
   - Click on Projects
   - Click on Dashboard
   - Click on Equipment
   - Click on Materials
   - etc.

**Expected Results:**
- [ ] All navigation links work in RTL
- [ ] Each page displays in Hebrew
- [ ] `document.dir` remains "rtl" throughout
- [ ] All page content is in Hebrew
- [ ] No layout breaks on any page

### 11. Test Material-UI Components in RTL ✓

**Steps:**
1. In Hebrew mode, interact with various components:
   - Click buttons (verify they're clickable)
   - Open dropdowns/selects
   - Open modals/dialogs
   - Use form inputs

**Expected Results:**
- [ ] All Material-UI components are responsive
- [ ] Buttons and controls are accessible
- [ ] Dropdowns appear in correct position
- [ ] Modals are properly centered
- [ ] Form controls work correctly

### 12. Test with Different Screen Sizes ✓

**Steps:**
1. In Hebrew mode, test responsive design:
   - Resize browser to tablet size (768px)
   - Resize to mobile size (375px)
   - Test on actual devices if available

**Expected Results:**
- [ ] Layout remains proper in RTL at all sizes
- [ ] No horizontal scrollbars
- [ ] Navigation remains accessible
- [ ] Text remains readable
- [ ] Forms remain usable

### 13. Test Copy/Paste of Hebrew Text ✓

**Steps:**
1. In Hebrew mode, copy text from page
2. Paste it into a text editor or another field
3. Verify text is correct

**Expected Results:**
- [ ] Hebrew text copies correctly
- [ ] Text can be pasted into forms
- [ ] Text maintains directionality
- [ ] No corruption of characters

### 14. Check Browser Console ✓

**Steps:**
1. Open DevTools Console (F12)
2. Switch languages multiple times
3. Navigate to different pages
4. Check for any errors or warnings

**Expected Results:**
- [ ] No red error messages
- [ ] No "missing translation" warnings
- [ ] No network errors (except expected 404s)
- [ ] i18n initialization logs (if verbose)

**Acceptable Warnings:**
- Firebase initialization messages
- Deprecated API warnings
- Non-critical 404 errors (favicon, etc.)

**Not Acceptable:**
- Missing translation key warnings
- i18n initialization errors
- React warnings (strict mode)
- CORS errors

### 15. Backend API Localization ✓

**Steps:**
1. Open DevTools Network tab
2. Observe API requests
3. Check Accept-Language header

**Expected Results:**
- [ ] API requests include Accept-Language header
- [ ] Header value matches current language
- [ ] When in Hebrew: `Accept-Language: he` (or he-IL, he-HE, etc.)
- [ ] When in English: `Accept-Language: en` (or en-US, en-GB, etc.)

**Network Check:**
1. Look at any API request (e.g., POST to /api/v1/auth/login)
2. Check Request Headers tab
3. Verify `Accept-Language` header is present and correct

### 16. Test Error Messages in Hebrew ✓

**Steps:**
1. Switch to Hebrew mode
2. Trigger an error condition:
   - Try to login with invalid credentials
   - Try to create invalid data
   - Try to access a non-existent resource

**Expected Results:**
- [ ] Error message displays in Hebrew
- [ ] Error text is readable in RTL layout
- [ ] Error doesn't break the UI
- [ ] User can recover from error

### 17. Test Date and Time Formatting ✓

**Steps:**
1. In Hebrew mode, check if dates appear anywhere:
   - Look for audit logs
   - Check timestamps in project lists
   - Look for created/updated dates

**Expected Results:**
- [ ] Dates are formatted for Hebrew locale
- [ ] Date format is consistent with Hebrew conventions
- [ ] Numbers are formatted with correct separators
- [ ] Time is in 24-hour format (standard for Hebrew)

## Automated Test Command

Run all E2E tests with a single command:

```bash
cd frontend
npm install @playwright/test
npx playwright test e2e/hebrew-localization.spec.ts --headed --workers=1
```

## Troubleshooting

### Tests fail to connect to localhost:3000
- **Solution**: Ensure frontend is running with `npm run dev`
- **Check**: http://localhost:3000 in browser

### Tests fail to connect to localhost:8000
- **Solution**: Ensure backend is running with uvicorn
- **Check**: http://localhost:8000/docs in browser

### Language switch doesn't work
- **Solution**: Check that LanguageSelector component is in Header
- **Check**: Browser DevTools Elements panel for language button

### RTL not working
- **Solution**: Verify App.tsx sets `document.dir`
- **Check**: `document.dir` in browser console

### Tests pass locally but fail in CI
- **Solution**: Tests may be running too fast, add waits
- **Fix**: Increase timeouts in playwright.config.ts

### Playwright not installed
- **Solution**: Run `npm install @playwright/test`
- **Browsers**: May need `npx playwright install`

## Test Results Documentation

After running tests, document:
1. Number of tests passed
2. Number of tests failed
3. Browser versions tested
4. Screenshot evidence (failures capture automatically)
5. Console output (saved in test report)

## Performance Considerations

When testing language switching, ensure:
- Language change is instant (no reload)
- No lag when scrolling after switch
- All animations complete smoothly
- Memory usage doesn't spike

## Accessibility Considerations

Verify accessibility:
- [ ] Tab navigation works in both languages
- [ ] ARIA labels are updated with language
- [ ] Language selector is keyboard accessible
- [ ] Form labels are properly associated

## Future Testing Enhancements

Consider adding tests for:
1. Dark mode + RTL (if feature is added)
2. Mobile responsiveness in RTL
3. Performance metrics for language switching
4. Automated screenshot comparison
5. A11y audit integration (axe-core)

## Summary

This E2E testing approach verifies:
✓ Language switching functionality
✓ RTL layout support
✓ Content localization
✓ Persistence of preferences
✓ No console errors
✓ Backend API localization
✓ All pages and flows work in both languages

All verification criteria from the spec are covered.
