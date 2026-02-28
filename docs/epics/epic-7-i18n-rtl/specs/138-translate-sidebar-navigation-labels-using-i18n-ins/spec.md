# Translate Sidebar navigation labels using i18n instead of hardcoded English

## Overview

Replace all hardcoded English strings in the Sidebar navigation component with i18n translation keys, making the navigation usable for Hebrew and Spanish users.

## Rationale

The Sidebar.tsx component hardcodes all navigation labels in English ('Dashboard', 'Projects', 'Team Workload', 'Equipment', 'Materials', 'Meetings', 'Approvals', 'Areas', 'Contacts', 'Inspections', 'RFIs', 'Audit Log', 'Settings') and the section header 'Current Project'. Meanwhile, every other page in the app uses `t()` translation functions. This means switching to Hebrew or Spanish changes all page content but the sidebar navigation remains in English, creating a broken bilingual interface.

---
*This spec was created from ideation and is pending detailed specification.*
