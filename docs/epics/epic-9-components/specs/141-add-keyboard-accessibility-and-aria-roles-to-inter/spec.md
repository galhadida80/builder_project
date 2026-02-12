# Add keyboard accessibility and ARIA roles to interactive Card components

## Overview

The Card, KPICard, FeatureCard, and ProjectCard components accept onClick handlers but lack role='button', tabIndex, and keyboard event handlers (onKeyDown). Users navigating with keyboard or assistive technology cannot discover or activate these clickable cards.

## Rationale

Cards with onClick handlers look and behave like buttons for mouse users (cursor: pointer, hover effects) but are invisible to keyboard navigation. This violates WCAG 2.1 Level A (2.1.1 Keyboard, 4.1.2 Name/Role/Value). The DashboardPage, ProjectsPage, and Analytics pages heavily use KPICard and ProjectCard with click handlers, making major workflows keyboard-inaccessible.

---
*This spec was created from ideation and is pending detailed specification.*
