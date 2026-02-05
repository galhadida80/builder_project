# QA Fix Request

**Status**: ❌ REJECTED
**Date**: 2026-02-05T01:23:00Z
**QA Session**: 1
**Blocking Issues**: 2 Critical, 1 Major

---

## Critical Issues to Fix (BLOCKING)

### 1. Add Missing Test Infrastructure
**Problem**: Tests were written but cannot be executed because test dependencies are missing
**Location**: `frontend/package.json`
**Priority**: CRITICAL - Must fix before QA can approve

**Required Actions**:

#### Step 1: Add dependencies to package.json
Edit `frontend/package.json` and add to `devDependencies`:
```json
{
  "devDependencies": {
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "jsdom": "^23.2.0",
    // ... keep existing devDependencies
  }
}
```

#### Step 2: Add test script to package.json
Edit `frontend/package.json` scripts section:
```json
{
  "scripts": {
    "dev": "vite build && vite preview",
    "dev:hmr": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "start": "vite build && vite preview"
  }
}
```

#### Step 3: Create vitest configuration
Create file `frontend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

#### Step 4: Create test setup file
Create file `frontend/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'

// Add any global test setup here
```

#### Step 5: Install dependencies
```bash
cd frontend
npm install
```

#### Step 6: Run tests to verify
```bash
npm test InspectionHistoryTimeline
```

**Verification Criteria**:
- All 578 lines of tests in `InspectionHistoryTimeline.test.tsx` run successfully
- No import errors for `vitest` or `@testing-library/react`
- Test command `npm test` works
- All test cases pass (loading state, empty state, rendering, filtering, edge cases, etc.)

---

### 2. Resolve Missing Design Reference
**Problem**: Spec references `design-assets/inspection/25-history-timeline.png` but file doesn't exist
**Location**: Design assets directory
**Priority**: CRITICAL - Cannot verify visual design compliance

**Required Actions - Choose ONE**:

#### Option A: Provide the Design File (Preferred)
1. Add the missing file to `design-assets/inspection/25-history-timeline.png`
2. Ensure the design file shows:
   - Vertical timeline layout
   - Dates on left (desktop) or above cards (mobile)
   - Card structure with avatar, consultant type name, status badge
   - Timeline connector line (vertical grey line)
   - Spacing and color specifications

#### Option B: Update Spec to Remove Design Reference
1. Edit `.auto-claude/specs/048-build-inspection-history-timeline/spec.md`
2. Remove all references to `25-history-timeline.png`
3. Update QA acceptance criteria to remove visual design verification section
4. Add note that visual design was approved through alternative means

#### Option C: Document Alternative Verification
1. Create file `VISUAL_DESIGN_APPROVAL.md` documenting:
   - Who approved the visual design
   - What criteria were verified
   - Screenshots of implemented design
   - Sign-off date

**Verification Criteria**:
- Either design file exists at specified path, OR
- Spec is updated to remove design reference, OR
- Alternative approval is documented

---

## Major Issues to Fix (RECOMMENDED)

### 3. Remove Debug Console Statement
**Problem**: Debug console.log in production code instead of navigation handler
**Location**: `frontend/src/pages/InspectionsPage.tsx:473`
**Priority**: MAJOR - Code quality issue

**Current Code** (line 473):
```typescript
onRowClick={(row) => console.log('View inspection:', row.id)}
```

**Required Fix**:
```typescript
onRowClick={(row) => navigate(`/projects/${projectId}/inspections/${row.id}`)}
```

**Full Context**:
The DataTable component already has proper navigation in the Timeline view. The table view should work the same way.

**Verification Criteria**:
- Clicking an inspection row in table view navigates to inspection detail page
- No console.log statements remain in InspectionsPage.tsx (console.error is OK)

---

## After Completing Fixes

### 1. Verify All Tests Pass
```bash
cd frontend
npm test InspectionHistoryTimeline
```
Expected output: All tests passing, no errors

### 2. Verify Type Checking
```bash
cd frontend
npm run build
```
Expected output: No TypeScript errors

### 3. Commit Changes
```bash
git add -A
git commit -m "fix: add test infrastructure, resolve design reference, remove debug console.log (qa-requested)"
```

### 4. Request QA Re-Review
Once all fixes are committed, QA will automatically re-run validation.

---

## Success Criteria for QA Approval

QA will approve when:
- ✅ All unit tests run and pass (`npm test InspectionHistoryTimeline`)
- ✅ Design reference issue is resolved (file provided OR spec updated OR approval documented)
- ✅ Debug console.log replaced with navigation handler
- ✅ No console errors when viewing the timeline
- ✅ All components render correctly in browser
- ✅ Date filtering works
- ✅ Click navigation works for all inspection cards
- ✅ Loading and empty states display correctly
- ✅ Responsive design works on mobile/tablet/desktop

---

## Questions or Issues?

If you encounter any issues while implementing these fixes:
1. Check that you're in the correct directory (frontend/)
2. Ensure you have npm/node installed
3. Try removing `node_modules` and `package-lock.json`, then run `npm install` again
4. Check that vitest.config.ts is in the frontend root directory
5. Verify the test setup file is at `frontend/src/test/setup.ts`

---

**QA Agent will automatically re-run after your fixes are committed.**

**Current QA Iteration**: 1 of 50
**Next Iteration**: After fixes are committed
