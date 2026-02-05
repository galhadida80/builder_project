# Remove or implement non-functional Filter buttons across 7 list pages

## Overview

Seven pages display a prominent 'Filter' button with a FilterList icon that has no onClick handler and does nothing when clicked. Either implement filter dropdown functionality or remove the misleading buttons.

## Rationale

Users expect clickable UI elements to do something. A visible 'Filter' button that is completely non-functional (no onClick, no dropdown, no menu) creates confusion and erodes trust in the application. Users on construction sites may repeatedly click the button thinking it's broken or slow, wasting time. This is a clear violation of the 'don't mislead users' UX principle.

---
*This spec was created from ideation and is pending detailed specification.*
