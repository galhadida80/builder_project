# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-31 23:26]
Task requests building card components that already exist in production. The spec.md warning was correct: "This task was incorrectly classified as SIMPLE" - it should have been investigated first before planning.

_Context: The implementation plan should be revised to either: 1) Enhance existing cards, 2) Add new variants, or 3) Mark task as already complete. Building duplicate components would create conflicts._
