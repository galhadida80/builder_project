# Epic 1: Design System Foundation

**Status:** COMPLETED
**Priority:** P0 - Critical
**Estimate:** 5 points (4 stories)

## Description

Core design system including colors, typography, component tokens, and dark mode theming infrastructure. Establishes Construction Navy palette, bilingual font system (Plus Jakarta Sans + Noto Sans Hebrew), spacing/shadow/border tokens, and theme toggle with system preference support.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-1.1 through US-1.4.

## Audit Trail

### Frontend Theme
- `frontend/src/theme/` — Dark/light theme variants, palette definitions, typography scale
- CSS custom properties for all colors (primary, secondary, accent, semantic)
- Construction Navy palette (#0F172A, #334155, #0369A1), Safety Orange (#F97316)
- Spacing scale (xs–3xl), shadow depths (sm–xl), border radius tokens

### Frontend Components
- Theme context provider with localStorage persistence
- Theme toggle component respecting `prefers-color-scheme`
- RTL font-family switching (Noto Sans Hebrew)

## Specs

- `specs/079-implement-design-system-color-palette/spec.md`
