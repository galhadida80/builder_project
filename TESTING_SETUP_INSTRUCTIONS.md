# Testing Infrastructure Setup Instructions

## Overview

This document provides instructions to complete the testing infrastructure setup for the Hero component unit tests.

## QA Issues Addressed

### Issue 1: Testing Infrastructure Not Configured ✅
- **Status**: Code changes complete, npm install required
- **Changes Made**:
  - ✅ Created `vitest.config.ts` with jsdom environment
  - ✅ Created `src/test/setup.ts` with testing-library matchers
  - ✅ Updated `Hero.test.tsx` to use `vi.fn()` instead of `jest.fn()`
  - ✅ Added test scripts to `package.json`
  - ✅ Added testing dependencies to `package.json` devDependencies

### Issue 2: Trust Logo Assets Won't Load in Production ✅
- **Status**: Fixed
- **Changes Made**:
  - ✅ Updated `LandingPage.tsx` to import SVG files using ES6 imports
  - ✅ Changed from hardcoded paths (`'/src/assets/logos/turner.svg'`) to imported references (`turnerLogo`)
  - ✅ This ensures Vite properly bundles the assets in production builds

## Required Action: Install Dependencies

Since npm is not available in the current environment, the following command needs to be run when the environment is properly configured:

```bash
cd frontend
npm install
```

This will install the following new dependencies that were added to `package.json`:

### New Dev Dependencies
- `vitest@^1.1.0` - Test runner (Vite-native alternative to Jest)
- `@testing-library/react@^14.1.2` - React component testing utilities
- `@testing-library/jest-dom@^6.1.5` - Custom jest-dom matchers for DOM assertions
- `@testing-library/user-event@^14.5.1` - User interaction simulation
- `jsdom@^23.0.1` - DOM implementation for Node.js (required by vitest)

## Verification Steps

After running `npm install`, verify the setup:

### 1. Run Unit Tests
```bash
cd frontend
npm test
```

Expected output: All Hero component tests should pass (10 tests total)

### 2. Run Tests in CI Mode
```bash
npm run test:run
```

Expected output: Tests run once and exit (useful for CI/CD pipelines)

### 3. Verify Production Build
```bash
npm run build
```

Expected output:
- Build succeeds with no TypeScript errors
- Logo assets are included in `dist/assets/` directory
- Logo imports resolve correctly

### 4. Check Logo Assets in Build
```bash
ls -la dist/assets/
```

Expected output: Should see hashed SVG files like `turner-[hash].svg`

## Test Coverage

The Hero component tests cover:

1. ✅ Renders with default props
2. ✅ Renders custom title and subtitle
3. ✅ Renders custom CTA button text
4. ✅ Calls CTA handlers on click
5. ✅ Renders trust logos when provided and showTrustLogos is true
6. ✅ Hides trust logos when showTrustLogos is false
7. ✅ Hides trust logos section when trustLogos array is empty
8. ✅ Renders background image when provided
9. ✅ Renders multiple trust logos correctly (5 logos)
10. ✅ Does not crash when CTA handlers are not provided

## Files Modified

### Code Changes (Complete)
- ✅ `frontend/src/pages/LandingPage.tsx` - Fixed logo imports
- ✅ `frontend/src/components/Hero.test.tsx` - Updated to use vitest
- ✅ `frontend/package.json` - Added test scripts and dependencies
- ✅ `frontend/vitest.config.ts` - Created vitest configuration
- ✅ `frontend/src/test/setup.ts` - Created test setup file

### Assets (Already Present)
- ✅ `frontend/src/assets/logos/turner.svg`
- ✅ `frontend/src/assets/logos/bechtel.svg`
- ✅ `frontend/src/assets/logos/fluor.svg`
- ✅ `frontend/src/assets/logos/kiewit.svg`
- ✅ `frontend/src/assets/logos/skanska.svg`

## Technical Details

### Why Vitest Instead of Jest?

- **Vite-native**: Shares the same config as Vite build tool
- **Faster**: Uses Vite's transformation pipeline (ESM-first)
- **Better DX**: Hot module reloading for tests
- **Jest-compatible**: Most Jest APIs work with minimal changes

### Logo Import Fix Explanation

**Before (Won't Work in Production)**:
```typescript
imageUrl: '/src/assets/logos/turner.svg'  // ❌ Hardcoded path
```

**After (Production-Ready)**:
```typescript
import turnerLogo from '../assets/logos/turner.svg'  // ✅ ES6 import
imageUrl: turnerLogo  // Vite processes this correctly
```

When Vite builds for production:
- Imports are resolved and bundled
- Assets are hashed for cache-busting
- Final paths like `/assets/turner-a1b2c3d4.svg` are generated

## Next Steps for QA

Once `npm install` is run:

1. Run `npm test` to verify all tests pass
2. Run `npm run build` to verify production build works
3. Check that logo assets are bundled in `dist/assets/`
4. Start the dev server and verify logos display correctly
5. Sign off on the implementation if all checks pass

## Rollback Instructions

If issues arise, revert to the previous commit:
```bash
git reset --hard HEAD~1
```

## Support

If you encounter issues:
1. Ensure Node.js v18+ is installed
2. Ensure npm is available in PATH
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check for conflicting global packages

---

**Status**: Ready for npm install and final verification
**Last Updated**: 2026-02-04
**Fix Session**: 2
