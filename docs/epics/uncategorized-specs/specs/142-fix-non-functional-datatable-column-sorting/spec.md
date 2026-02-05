# Fix non-functional DataTable column sorting

## Overview

The DataTable component has sort indicator UI (TableSortLabel with active/direction props) that visually responds to user clicks, but the actual row data is never sorted. Clicking a sortable column header changes the sort arrow direction without reordering any rows.

## Rationale

This is a broken interactive affordance that misleads users. Users click sort headers expecting data to reorder, see the arrow indicator change direction, but rows stay in their original order. This creates confusion and erodes trust in the data table interface. The sort functionality is half-implemented: state management (orderBy, order) works correctly but the sort logic was never connected to the data display pipeline.

---
*This spec was created from ideation and is pending detailed specification.*
