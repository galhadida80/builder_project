# Quick Spec: Create Bottom Navigation Component

## Overview
Create a mobile-friendly bottom navigation component to complete the navigation component set (5 of 6 already exist). This component will use Material-UI's BottomNavigation components and integrate with React Router to provide mobile-optimized navigation.

## Workflow Type
simple

## Task Scope
**Files to Create:**
- `frontend/src/components/ui/BottomNav.tsx` - Mobile bottom navigation component

**Files to Modify:**
- `frontend/src/components/ui/index.ts` - Add export for new component

**Services Involved:**
- frontend

## Success Criteria
- Component renders correctly on mobile viewports (<= 600px)
- Navigation items are clickable and route correctly
- Active state reflects current route
- Badges display when provided
- Component hidden on desktop (> 600px)
- Exported from `ui/index.ts`
- TypeScript compiles without errors

## Task
Create a mobile-friendly bottom navigation component to complete the navigation component set (5 of 6 already exist).

## Files to Create
- `frontend/src/components/ui/BottomNav.tsx` - Mobile bottom navigation component

## Files to Reference
- `frontend/src/components/ui/Tabs.tsx` - Pattern for MUI component styling
- `frontend/src/components/layout/Sidebar.tsx` - Navigation items pattern
- `frontend/src/components/ui/index.ts` - Export pattern

## Component Requirements

### Basic Features
- Fixed position bottom bar for mobile devices
- 3-5 navigation items with icons and labels
- Active state highlighting
- Badge support for notifications
- Responsive (hide on desktop, show on mobile)

### Technical Approach
- Use Material-UI `BottomNavigation` and `BottomNavigationAction`
- Follow existing styling patterns from other UI components
- Integrate with React Router for navigation
- Match theme and design system
- TypeScript with proper interfaces

### Typical Usage
```typescript
<BottomNav
  items={[
    { label: 'Home', icon: <HomeIcon />, path: '/dashboard', badge: 3 },
    { label: 'Projects', icon: <FolderIcon />, path: '/projects' },
    { label: 'Approvals', icon: <CheckIcon />, path: '/approvals', badge: 5 },
    { label: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ]}
/>
```

## Verification
- [ ] Component renders correctly on mobile viewports (<= 600px)
- [ ] Navigation items are clickable and route correctly
- [ ] Active state reflects current route
- [ ] Badges display when provided
- [ ] Component hidden on desktop (> 600px)
- [ ] Exported from `ui/index.ts`
- [ ] TypeScript compiles without errors

## Notes
- Should match the existing design system (Material-UI theme)
- Keep consistent with other navigation components' styling
- Consider RTL support (project has Hebrew translations)
