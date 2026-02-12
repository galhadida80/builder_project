# Fix Header user menu to navigate to existing Settings page instead of showing placeholder toast

## Overview

The Header user menu 'Settings' item shows a 'Settings page coming soon!' toast notification, but a fully implemented SettingsPage component exists at pages/SettingsPage.tsx and is properly routed at /settings in App.tsx. The menu item should navigate to the actual page.

## Rationale

Users who click Settings in their profile dropdown are told the feature doesn't exist, when it actually does. This makes an existing feature undiscoverable from the primary user menu. The Settings page is only reachable via the Sidebar bottom section, which many users may not notice. The 'Profile' item also shows 'coming soon' but genuinely has no page—both items look identical, giving no indication which is real vs placeholder.

---
*This spec was created from ideation and is pending detailed specification.*
