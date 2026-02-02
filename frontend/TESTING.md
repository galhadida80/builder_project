# Testing Setup and Instructions

## Overview

This project now has comprehensive unit testing infrastructure using:
- **Vitest** - Fast unit test framework (Vite-native)
- **React Testing Library** - Testing utilities for React components
- **@testing-library/jest-dom** - Custom matchers for DOM assertions

## Installation

To install testing dependencies, run:

```bash
cd frontend
npm install
```

This will install all the testing dependencies listed in `package.json`:
- `vitest` - Test runner
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - DOM assertion matchers
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - DOM environment for tests
- `@vitest/ui` - Visual test UI (optional)

## Running Tests

### Run all tests once
```bash
npm test
```

### Run tests in watch mode (auto-rerun on changes)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run tests with visual UI
```bash
npm run test:ui
```

## Test Files

### Unit Tests
- `src/components/ApprovalQueueList.test.tsx` - Comprehensive tests for ApprovalQueueList component

### Test Coverage Requirements
- **Minimum coverage**: 80% (lines, functions, branches, statements)
- Configured in `vitest.config.ts`

## Test Structure

### ApprovalQueueList Tests

The test suite covers:

1. **Rendering Tests** (5 tests)
   - Empty data state
   - Loading skeleton
   - Populated data display
   - All 7 table columns

2. **Filter Functionality** (7 tests)
   - Tab filtering (Pending, Approved, Rejected, All)
   - Badge counts accuracy
   - Search by entity name
   - Search by requester name
   - Combined tab + search filtering

3. **Action Handlers** (10 tests)
   - Approve/Reject dialog opening
   - API call parameters
   - Comment handling (required for reject, optional for approve)
   - Button enable/disable states
   - Success/Error toast notifications
   - Data reload after actions

4. **State Management** (6 tests)
   - Error state display
   - Retry functionality
   - Empty states (various scenarios)
   - Loading states
   - Dialog behavior during submission

5. **API Integration** (3 tests)
   - Initial data fetch
   - Data transformation
   - Missing field handling

6. **View Details Callback** (3 tests)
   - Callback invocation
   - Button visibility based on prop

**Total: 34 comprehensive test cases**

## Configuration Files

### vitest.config.ts
- Test environment: jsdom (browser-like environment)
- Setup file: `src/test/setup.ts`
- Coverage thresholds: 80%
- Globals enabled for Vitest API

### src/test/setup.ts
- Imports jest-dom matchers
- Automatic cleanup after each test
- Mocks for browser APIs:
  - window.matchMedia
  - IntersectionObserver
  - ResizeObserver

## Continuous Integration

To run tests in CI/CD pipelines:

```bash
# Run tests with coverage in CI mode
npm test -- --coverage --run

# Expected exit code: 0 if all tests pass
```

## Troubleshooting

### Tests failing due to missing dependencies
```bash
# Reinstall all dependencies
npm install
```

### Coverage below threshold
```bash
# Run with coverage to see which files need more tests
npm run test:coverage

# Open coverage report in browser
open coverage/index.html
```

### Tests timing out
- Check for unresolved promises in mocks
- Ensure all async operations have proper `await waitFor()`
- Increase timeout in vitest.config.ts if needed

## Writing New Tests

When adding new components or features:

1. Create test file alongside component: `ComponentName.test.tsx`
2. Follow existing test structure:
   - Group related tests in `describe` blocks
   - Use `beforeEach` for common setup
   - Mock external dependencies
   - Test user interactions, not implementation details
3. Run tests to verify they pass
4. Check coverage to ensure adequate testing

## Best Practices

- **Test behavior, not implementation** - Focus on what the user sees and does
- **Mock external dependencies** - Mock API calls, routers, context providers
- **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
- **Wait for async operations** - Always use `waitFor` for asynchronous state changes
- **Clear mocks between tests** - Use `beforeEach(() => vi.clearAllMocks())`

## QA Verification

For QA sign-off, the following must pass:

```bash
# 1. All unit tests pass
npm test

# 2. Coverage meets threshold (>80%)
npm run test:coverage

# 3. TypeScript compilation succeeds
npx tsc --noEmit

# 4. Build succeeds
npm run build

# 5. E2E tests pass (if applicable)
npx playwright test
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)
