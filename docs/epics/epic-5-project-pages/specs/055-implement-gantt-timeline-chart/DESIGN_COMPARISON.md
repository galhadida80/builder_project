# Gantt Chart Design Comparison Documentation

## Design Reference Status
**Design File:** `design-assets/project/18-gantt-timeline.png`
**Status:** ❌ NOT FOUND in worktree
**Location Searched:** `./design-assets/`

The design reference file specified in the spec is not present in this worktree. This document records the current styling implementation for future comparison when the design file becomes available.

---

## Current Implementation - Styling Summary

### 1. Task Bar Colors
**Implementation Location:** Lines 565-568 in `GanttChart.tsx`

```typescript
barProgressColor={theme.palette.primary.main}
barProgressSelectedColor={theme.palette.primary.dark}
barBackgroundColor={alpha(theme.palette.primary.main, 0.2)}
barBackgroundSelectedColor={alpha(theme.palette.primary.main, 0.3)}
```

- **Progress Fill:** MUI primary color (theme.palette.primary.main)
- **Progress Selected:** Darker shade (theme.palette.primary.dark)
- **Background:** 20% alpha transparency of primary color
- **Background Selected:** 30% alpha transparency of primary color
- **Pattern:** Follows Material-UI design system with theme awareness

### 2. Project Bar Colors
**Implementation Location:** Lines 569-572 in `GanttChart.tsx`

```typescript
projectProgressColor={theme.palette.secondary.main}
projectProgressSelectedColor={theme.palette.secondary.dark}
projectBackgroundColor={alpha(theme.palette.secondary.main, 0.15)}
projectBackgroundSelectedColor={alpha(theme.palette.secondary.main, 0.25)}
```

- **Progress Fill:** MUI secondary color
- **Progress Selected:** Darker shade of secondary
- **Background:** 15% alpha transparency of secondary color
- **Background Selected:** 25% alpha transparency of secondary color

### 3. Milestone Marker Colors
**Implementation Location:** Lines 573-574 in `GanttChart.tsx`

```typescript
milestoneBackgroundColor={theme.palette.success.main}
milestoneBackgroundSelectedColor={theme.palette.success.dark}
```

- **Color:** MUI success color (typically green)
- **Selected:** Darker shade of success color
- **Shape:** Diamond (default from gantt-task-react library)

### 4. Dependency Arrow Style
**Implementation Location:** Lines 575-576 in `GanttChart.tsx`

```typescript
arrowColor={alpha(theme.palette.text.secondary, 0.6)}
arrowIndent={20}
```

- **Color:** 60% alpha transparency of secondary text color
- **Indent:** 20px spacing from task bars
- **Style:** Single line arrows (library default)

### 5. Timeline Header Layout
**Implementation Location:** Lines 23-36 in `GanttChart.tsx`

```typescript
'& ._3Rx27': {
  // Gantt header styling
  backgroundColor: alpha(theme.palette.primary.main, 0.05),
  borderBottom: `1px solid ${theme.palette.divider}`,
},
'& ._1uWLi': {
  // Task list styling
  backgroundColor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,
},
'& ._36ChA': {
  // Grid styling
  backgroundColor: theme.palette.background.default,
},
```

- **Header Background:** 5% alpha transparency of primary color
- **Header Border:** 1px solid divider color
- **Task List Background:** Paper background (MUI theme)
- **Task List Border:** 1px solid divider color (right side)
- **Grid Background:** Default background (MUI theme)

### 6. Additional Styling Elements

#### Toolbar
**Implementation Location:** Lines 73-82 in `GanttChart.tsx`
- **Background:** 3% alpha transparency of primary color
- **Border Radius:** 8px
- **Padding:** theme.spacing(1)
- **Layout:** Flexbox with space-between alignment

#### Tooltip
**Implementation Location:** Lines 39-64 in `GanttChart.tsx`
- **Background:** Paper background
- **Border:** 80% alpha transparency of divider color
- **Border Radius:** 8px
- **Box Shadow:** theme.shadows[4]
- **Min Width:** 200px
- **Typography:** Uses theme font family and sizes

#### Today Indicator
**Implementation Location:** Line 577 in `GanttChart.tsx`
```typescript
todayColor={alpha(theme.palette.error.light, 0.2)}
```
- **Color:** 20% alpha transparency of error.light color

---

## Material-UI Theme Integration

All colors are derived from the MUI theme, ensuring:
- ✅ Consistent color palette across the application
- ✅ Dark mode support (colors adapt automatically)
- ✅ Accessibility (theme colors follow WCAG guidelines)
- ✅ Brand consistency (uses theme primary/secondary colors)

## Design Patterns Followed

1. **Alpha Transparency:** Used extensively for subtle backgrounds
2. **Color Hierarchy:** Primary for tasks, secondary for projects, success for milestones
3. **Consistent Spacing:** Uses theme.spacing() units
4. **Border Radius:** Consistent 8-12px values
5. **Typography:** Follows MUI typography scale

---

## Recommendations for Design Comparison

When the design file becomes available, verify the following:

### Task Bars
- [ ] Color scheme matches (currently primary blue shades)
- [ ] Progress fill vs background contrast is sufficient
- [ ] Selected state styling is visually distinct
- [ ] Bar height and spacing are appropriate

### Dependencies
- [ ] Arrow color has sufficient contrast against background
- [ ] Arrow style matches design (single line vs curved)
- [ ] Arrow thickness is appropriate
- [ ] Arrow positioning and indentation looks correct

### Milestones
- [ ] Diamond shape matches design
- [ ] Color choice is appropriate (currently green/success color)
- [ ] Size relative to task bars is correct

### Timeline Header
- [ ] Header background color is subtle but visible
- [ ] Date/time labels are readable
- [ ] Column widths are appropriate (currently 65px)
- [ ] Font sizes match design (currently body2.fontSize)

### Overall Layout
- [ ] Task list width is appropriate (currently 155px)
- [ ] Grid lines are visible but not distracting
- [ ] Overall color temperature matches design
- [ ] Visual hierarchy is clear

---

## Technical Implementation Notes

**Library:** gantt-task-react v0.3.9
**Styling Approach:** Emotion + Material-UI v5.15.6
**Theme System:** Material-UI theming with custom styled components
**CSS Import:** ✅ 'gantt-task-react/dist/index.css' (line 7)

**Files:**
- Component: `frontend/src/components/GanttChart.tsx`
- Types: `frontend/src/types/gantt.ts`
- Demo: `frontend/src/pages/GanttDemoPage.tsx`

---

## Status

**Last Updated:** 2026-02-02
**Subtask:** subtask-6-3
**Status:** Implementation documented, awaiting design file for comparison
**Next Steps:** Once design file is available, perform visual comparison and adjust styling as needed
