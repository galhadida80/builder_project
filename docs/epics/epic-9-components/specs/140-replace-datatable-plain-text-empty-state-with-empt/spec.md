# Replace DataTable plain-text empty state with EmptyState component

## Overview

The DataTable component renders a minimal plain-text empty message when there are no rows, but the codebase has a well-designed EmptyState component with icons, descriptions, and action buttons that should be used instead for visual consistency across all table views.

## Rationale

The DataTable is used across many pages (Equipment, Materials, Contacts, Meetings, etc.). Its empty state currently renders a bare <Typography> in a <Box>, which looks sparse and unhelpful compared to the polished EmptyState component used elsewhere. This creates visual inconsistency and misses the opportunity to guide users with contextual CTAs like 'Add Equipment' or 'Create Contact'.

---
*This spec was created from ideation and is pending detailed specification.*
