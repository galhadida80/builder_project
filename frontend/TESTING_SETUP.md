# Testing Setup for Unit Tests

This document outlines the steps needed to run the unit tests for the offline mode interface feature.

## Required Dependencies

The following dependencies need to be installed to run the unit tests:

```bash
cd frontend

# Testing framework and utilities
npm install -D vitest@^1.2.0
npm install -D @testing-library/react@^14.1.2
npm install -D @testing-library/jest-dom@^6.1.5
npm install -D @testing-library/user-event@^14.5.1
npm install -D jsdom@^23.2.0

# For coverage reporting
npm install -D @vitest/coverage-v8@^1.2.0
```

## Configuration Files Created

- `vitest.config.ts` - Vitest configuration with jsdom environment
- `src/test/setup.ts` - Test setup file with mocks and cleanup
- Test files:
  - `src/hooks/useNetworkStatus.test.tsx`
  - `src/contexts/NetworkContext.test.tsx`
  - `src/components/common/OfflineBanner.test.tsx`
  - `src/components/common/SyncStatus.test.tsx`

## Running Tests

Once dependencies are installed:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test src/hooks/useNetworkStatus.test.tsx
```

## Adding Test Script to package.json

Add the following script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Expected Test Coverage

The tests should achieve >80% coverage for:
- `useNetworkStatus` hook
- `NetworkContext` provider
- `OfflineBanner` component
- `SyncStatus` component

## Test Features

### useNetworkStatus Tests
- ✅ Returns initial online status from navigator.onLine
- ✅ Updates status when going offline
- ✅ Updates status when going online
- ✅ Debounces rapid network state changes
- ✅ Cleans up event listeners on unmount
- ✅ Clears timeout on unmount

### NetworkContext Tests
- ✅ Provides default values
- ✅ Throws error when used outside provider
- ✅ Updates sync status correctly
- ✅ isOnline value updates with network status
- ✅ Provides stable reference for updateSyncStatus

### OfflineBanner Tests
- ✅ Does not render when online
- ✅ Renders when offline
- ✅ Uses MUI Alert with warning severity
- ✅ Has fixed positioning
- ✅ Slide animation on state changes
- ✅ Displays user-friendly message

### SyncStatus Tests
- ✅ Displays correct label for each status
- ✅ Shows correct icon for each status
- ✅ Uses correct color for each status
- ✅ Respects size prop (small/medium)
- ✅ Scales icon size based on chip size

## Notes

- Tests use React Testing Library for component testing
- Vitest is used instead of Jest for better Vite integration
- All tests follow best practices for React hooks and component testing
- Mocks are properly set up for window.matchMedia and navigator.onLine
