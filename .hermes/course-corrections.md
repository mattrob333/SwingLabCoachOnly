# Course Corrections — Outer Loop → Inner Loop

This file is the **active supervisory channel**. The OUTER loop (hourly audit) writes prioritized corrective directives here when it detects drift, guardrail violations, quality regressions, or off-task work. The INNER loop reads this file FIRST every tick and resolves OPEN corrections as top priority before normal wave work.

**Protocol:**
- Outer loop APPENDS corrections with status `OPEN`. It never edits build-state.md (avoids write races).
- Inner loop addresses each OPEN correction, then marks it `RESOLVED (commit <sha>)` with a one-line note.
- Severity: `BLOCKER` (stop normal work, fix immediately) · `HIGH` (fix this tick) · `MEDIUM` (fix within 2 ticks) · `LOW` (fix when convenient).

---

## Open Corrections

### [HIGH] Mobile draw-tools overlap the video canvas — OPEN (user-reported 2026-06-22)
Problem: On the coach lesson/review canvas at mobile width (~390px), the white annotation draw-tools toolbar panel overlaps the bottom of the `<video>` element, covering the player's feet and the tee base. Evidence: `docs/assets/mobile-drawtools-overlap-2026-06-22.png`. This obstructs the swing being reviewed — unacceptable on the coach's core screen.
Required fix: Reflow the annotation toolbar so on mobile (360–430px) it sits BELOW the video as a stacked block rather than floating/absolutely-positioned over the frame. Inspect `components/review/annotation-canvas.tsx` toolbar positioning + the review studio layout. Keep large touch targets. No desktop regression.
Acceptance: at 360–430px the full video frame (incl. player's feet / bottom of swing area) is visible and unobstructed by the toolbar; render test asserts the mobile stacked layout; quality gate green. This is the FIRST item — do it before adding any new draw tools (dotted line, curved arrow) so new buttons don't worsen crowding.

## Resolved Corrections
_(history appended below)_
