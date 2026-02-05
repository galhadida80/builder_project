# Issues Catalog - Spec Critique

## MEDIUM SEVERITY ISSUES

### 1. Missing Filter Functionality
- **Severity:** MEDIUM
- **Category:** Completeness
- **Location:** Throughout spec - functional requirements, implementation checklist
- **Description:** Research.json identifies "filter_button" as a required design element from 18-gantt-timeline.png (line 325-328), but the spec does not include any filter functionality in requirements, implementation notes, or success criteria
- **Impact:** Implementation will be incomplete compared to reference design

### 2. Import Statement Not Explicit
- **Severity:** MEDIUM
- **Category:** Accuracy
- **Location:** Implementation Notes section (around line 150)
- **Description:** Spec mentions importing the library but doesn't show the actual import statement. Research shows it should be: `import { Gantt, Task, ViewMode } from 'gantt-task-react';`
- **Impact:** Developer may not import all necessary types, leading to TypeScript errors

### 3. File Path Inconsistency
- **Severity:** MEDIUM
- **Category:** Consistency
- **Location:** Lines 66-68 vs lines 261, 267
- **Description:** "Files to Modify" section uses `frontend/src/...` while Implementation Checklist uses `src/...`. This creates ambiguity about working directory context
- **Impact:** Could cause confusion during implementation

## LOW SEVERITY ISSUES

### 4. Dependencies Structure Not Explicit
- **Severity:** LOW
- **Category:** Accuracy
- **Location:** Type Definitions section (line 262)
- **Description:** Research gotcha states "Dependencies are defined as string array of task IDs" but spec doesn't explicitly state this when describing the GanttTask interface
- **Impact:** Developer might use wrong data type for dependencies

### 5. ViewMode Usage Not Clear
- **Severity:** LOW
- **Category:** Accuracy
- **Location:** Implementation Notes (line 157)
- **Description:** Spec mentions "Use ViewMode enum" but doesn't show how to use it (e.g., `ViewMode.Day`, `ViewMode.Week`)
- **Impact:** Developer may need to look up documentation for correct usage

## SUMMARY
- Total Issues: 5
- Medium Severity: 3
- Low Severity: 2
