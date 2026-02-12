# Add aria-label to all IconButton components across the application

## Overview

Add descriptive aria-label attributes to 60+ IconButton instances that currently have no accessible name. Icon-only buttons (close, delete, edit, navigate, toggle) rely solely on visual icons with no screen reader text. Some use title attributes instead of aria-label, which are not reliably announced by screen readers.

## Rationale

Screen reader users cannot determine the purpose of icon-only buttons without accessible labels. This is a WCAG 2.1 Level A violation (Success Criterion 4.1.2: Name, Role, Value) affecting the entire application. It blocks accessibility compliance and excludes users with visual disabilities.

---
*This spec was created from ideation and is pending detailed specification.*
