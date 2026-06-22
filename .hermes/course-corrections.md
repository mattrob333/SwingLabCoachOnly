# Course Corrections — Outer Loop → Inner Loop

This file is the **active supervisory channel**. The OUTER loop (hourly audit) writes prioritized corrective directives here when it detects drift, guardrail violations, quality regressions, or off-task work. The INNER loop reads this file FIRST every tick and resolves OPEN corrections as top priority before normal wave work.

**Protocol:**
- Outer loop APPENDS corrections with status `OPEN`. It never edits build-state.md (avoids write races).
- Inner loop addresses each OPEN correction, then marks it `RESOLVED (commit <sha>)` with a one-line note.
- Severity: `BLOCKER` (stop normal work, fix immediately) · `HIGH` (fix this tick) · `MEDIUM` (fix within 2 ticks) · `LOW` (fix when convenient).

---

## Open Corrections

_(none — all resolved)_

---

## Resolved Corrections

### [LOW] build-state.md Wave 6 sub-tasks list + Open Issues stale — RESOLVED (commit pending this tick)
Fixed 2026-06-22. Updated build-state.md line 21 to `[x]` citing commits ce2c097 + b619cfc for privacy controls. Moved all 5 stale "Open Issues" bullets (transcription, AI packaging, upload storage, Stripe, delivery token) to mark each as ✅ DONE with its wave/commit reference. Header status line updated to reflect Tasks 1–4 DONE explicitly. All internal inconsistencies with Wave 4 COMPLETE resolved.

_(history appended below)_

### [MEDIUM] Coach-first UX/UI Polish workstream never started — RESOLVED (commit 80b4186)
Fixed 2026-06-22. Shipped UX Polish task #1: design tokens + shared shadcn/ui primitives (Card, Badge, Skeleton, EmptyState, Avatar) with 14 render/smoke tests. 793 tests, all gates green. Build-state "Next Action" now references UX task #2 (dashboard/inbox polish).

### [MEDIUM] API_SPEC.md stale — Wave 4 + Wave 6 routes undocumented — RESOLVED (commit 3f31e37)
Fixed 2026-06-22. Added 5 full `####` sections to `docs/API_SPEC.md`: POST `/transcribe`, POST+PATCH `/package`, POST `/approve`, POST `/revoke-link`. Cross-checked each contract against the actual `app/api/.../route.ts` files. Cleaned up the stale "Upcoming Routes (Wave 2+)" table (removed rows for already-shipped Stripe webhook/checkout, lessons deliver, lessons token, transcribe; kept truly-future notes/process-lesson rows). Updated route count from 13 → 22+ and status-codes line to include 403/409/429. "package"/"approve"/"revoke" now appear 11 times in API_SPEC.md (was 0).

### [HIGH] Mobile draw-tools overlap the video canvas — RESOLVED (commit d6327b7)
Fixed 2026-06-22. Split annotation toolbar into shared `AnnotationToolbar` component. Desktop: overlay on video frame (`hidden sm:flex`, inside AnnotationCanvas — no regression). Mobile: stacked block BELOW the video (`sm:hidden`, rendered by ReviewStudioClient) so the full swing frame is visible. Lifted tool/color state to parent; `forwardRef`+`useImperativeHandle` for undo/clear. 4 new render tests verify mobile toolbar position, DOM order, not-inside-overlay, touch targets. 697 tests green.
