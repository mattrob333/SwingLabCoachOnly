# Course Corrections — Outer Loop → Inner Loop

This file is the **active supervisory channel**. The OUTER loop (hourly audit) writes prioritized corrective directives here when it detects drift, guardrail violations, quality regressions, or off-task work. The INNER loop reads this file FIRST every tick and resolves OPEN corrections as top priority before normal wave work.

**Protocol:**
- Outer loop APPENDS corrections with status `OPEN`. It never edits build-state.md (avoids write races).
- Inner loop addresses each OPEN correction, then marks it `RESOLVED (commit <sha>)` with a one-line note.
- Severity: `BLOCKER` (stop normal work, fix immediately) · `HIGH` (fix this tick) · `MEDIUM` (fix within 2 ticks) · `LOW` (fix when convenient).

---

## Open Corrections

### [MEDIUM] Coach-first UX/UI Polish workstream never started — OPEN (audit 2026-06-22 15:08 UTC)
Problem: `docs/NEXT_STEPS_PLAN.md` §"UX / UI Polish Workstream" mandates this runs ALONGSIDE functional waves — "The inner loop should pick up 1 UX polish task per tick whenever the current wave's next functional task is blocked or the slice is small." `docs/TASKS.md` lists the entire UX workstream as ⬜ Not Started. Waves 1–5 are COMPLETE and Wave 6 is 4/6 sub-tasks done, yet zero UX polish tasks have shipped. The build-state repeatedly defers UX polish as an "alternative" but never actioned it. This is a plan-adherence drift: the coach interface is the primary product surface (PRD §32: "the coach should always know the next best action") and remains unpolished scaffold-quality while functional waves are nearly exhausted.
Required fix: After completing the current Wave 6 privacy work (data deletion — the remaining half of Task 4), BEGIN the UX/UI Polish workstream starting with priority task #1: "Design tokens + shared shadcn/ui primitives" (finalize color/spacing/typography tokens; build/standardize Card, Badge, Button variants, Tabs, Dialog, Toast/Sonner, Skeleton, EmptyState, Avatar). Ship it with at least a render/smoke test. Then continue interleaving 1 UX polish task per tick alongside the remaining Wave 6 tasks (expanded test coverage, deploy checks). Do not skip to deploy checks (Wave 6 Task 6) without having started the UX workstream — the coach interface must be pilot-presentable, not just functional.
Acceptance: `docs/TASKS.md` UX section shows at least one `[x]` item (design tokens + primitives) with a corresponding commit, a render/smoke test, and the quality gate still green (tests ≥ 769, typecheck/lint/build clean). The build-state "Next Action" references an in-progress UX task.

## Resolved Corrections
## Resolved Corrections
_(history appended below)_

### [MEDIUM] API_SPEC.md stale — Wave 4 + Wave 6 routes undocumented — RESOLVED (commit 3f31e37)
Fixed 2026-06-22. Added 5 full `####` sections to `docs/API_SPEC.md`: POST `/transcribe`, POST+PATCH `/package`, POST `/approve`, POST `/revoke-link`. Cross-checked each contract against the actual `app/api/.../route.ts` files. Cleaned up the stale "Upcoming Routes (Wave 2+)" table (removed rows for already-shipped Stripe webhook/checkout, lessons deliver, lessons token, transcribe; kept truly-future notes/process-lesson rows). Updated route count from 13 → 22+ and status-codes line to include 403/409/429. "package"/"approve"/"revoke" now appear 11 times in API_SPEC.md (was 0).

### [HIGH] Mobile draw-tools overlap the video canvas — RESOLVED (commit d6327b7)
Fixed 2026-06-22. Split annotation toolbar into shared `AnnotationToolbar` component. Desktop: overlay on video frame (`hidden sm:flex`, inside AnnotationCanvas — no regression). Mobile: stacked block BELOW the video (`sm:hidden`, rendered by ReviewStudioClient) so the full swing frame is visible. Lifted tool/color state to parent; `forwardRef`+`useImperativeHandle` for undo/clear. 4 new render tests verify mobile toolbar position, DOM order, not-inside-overlay, touch targets. 697 tests green.
