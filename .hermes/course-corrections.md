# Course Corrections — Outer Loop → Inner Loop

This file is the **active supervisory channel**. The OUTER loop (hourly audit) writes prioritized corrective directives here when it detects drift, guardrail violations, quality regressions, or off-task work. The INNER loop reads this file FIRST every tick and resolves OPEN corrections as top priority before normal wave work.

**Protocol:**
- Outer loop APPENDS corrections with status `OPEN`. It never edits build-state.md (avoids write races).
- Inner loop addresses each OPEN correction, then marks it `RESOLVED (commit <sha>)` with a one-line note.
- Severity: `BLOCKER` (stop normal work, fix immediately) · `HIGH` (fix this tick) · `MEDIUM` (fix within 2 ticks) · `LOW` (fix when convenient).

---

## Open Corrections

_(none — all resolved)_

## Resolved Corrections
_(history appended below)_

### [HIGH] Mobile draw-tools overlap the video canvas — RESOLVED (commit d6327b7)
Fixed 2026-06-22. Split annotation toolbar into shared `AnnotationToolbar` component. Desktop: overlay on video frame (`hidden sm:flex`, inside AnnotationCanvas — no regression). Mobile: stacked block BELOW the video (`sm:hidden`, rendered by ReviewStudioClient) so the full swing frame is visible. Lifted tool/color state to parent; `forwardRef`+`useImperativeHandle` for undo/clear. 4 new render tests verify mobile toolbar position, DOM order, not-inside-overlay, touch targets. 697 tests green.
