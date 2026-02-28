# Fix hardcoded 'en-US' locale in all date/time formatting

## Overview

Replace 25+ instances of hardcoded 'en-US' locale in toLocaleDateString() and toLocaleTimeString() calls with the current i18n language so dates render in the user's selected locale (Hebrew, Spanish, or English).

## Rationale

The app supports 3 languages (en, he, es) via i18next, but every date/time displayed in the UI is hardcoded to 'en-US' format. A Hebrew user sees 'Jan 15, 2026' instead of '15 בינו 2026'. This creates a jarring, inconsistent multilingual experience and undermines the i18n investment already made.

---
*This spec was created from ideation and is pending detailed specification.*
