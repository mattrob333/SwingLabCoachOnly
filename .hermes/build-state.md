# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 5 in progress — video player + recording model + mic recording UI done; annotation canvas next)

## Architecture: Two-Tier Build Loop
- **Inner Loop** (cron `21c981f54bf6`) — every 5 min: Check → Test → Advance → Repeat. Fast, GLM 5.2, pushes to GitHub.
- **Outer Loop** (cron `30bbeeaeeaf8`) — every 30 min: Alignment audit against PRD, guardrails checks, drift detection. Read-only.

## Phases
1. [x] Bootstrap repo + seed all 16 /docs/ artifacts (Rounds 1–2)
2. [x] Phase 1a: Web Foundation (Round 3)
3. [x] Phase 1b: Sync engine core (Round 4)
4. [x] Phase 2: Coach auth + onboarding (Rounds 5–6)
5. [x] Phase 3: Parent upload + payment (Round 7)
6. [x] Phase 4: Coach inbox + submission detail (Round 8)
7. [~] Phase 5: Review Studio (Round 10 — video player + scrubber + recording model + mic recording UI done; annotation canvas next)
8. [ ] Phase 6: Render pipeline
9. [ ] Phase 6: AI lesson pack
10. [ ] Phase 7: Lesson delivery + follow-up
11. [ ] Phase 8: Stripe Connect + earnings
12. [ ] Phase 9: PWA enhancements
13. [ ] Phase 10: Comparison mode

## Completed Tasks
- All 16 /docs/ artifacts seeded
- Next.js 16 + React 19 + Tailwind 4 + shadcn scaffold
- lib/coaches.ts, lib/turnaround.ts, lib/sync/phases.ts, lib/sync/frameMapping.ts, lib/utils.ts
- Phase 2: auth (scrypt + HMAC sessions), login/logout API, middleware, login + dashboard pages, onboarding form + API
- Phase 3: lib/submissions.ts, lib/invite-codes.ts, submissions/pay/redeem-code APIs, upload form, payment page
- Phase 4: Coach inbox (dashboard with stat cards + submission cards), submission detail page (/coach/submission/[id]), markSubmissionInReview, POST /api/submissions/[id]/review, StartReviewButton
- Phase 5 (partial): lib/review/timecode.ts (formatTimecode, parseTimecode, stepFrames, clampTime), lib/review/recording.ts (RecordingSegment, createSegment, finalizeSegment, sortSegmentsByStartTime), VideoPlayer component (play/pause, frame step, click-to-seek scrubber, keyboard shortcuts, onTimeUpdate callback), VoiceRecorder component (MediaRecorder API, record/stop/playback/delete, segments anchored to video timecode), ReviewStudioClient orchestrator, /coach/review/[id] Review Studio page (auth + ownership guarded)
- 134 tests across 14 test files — all green
- Quality gate: typecheck ✓ lint ✓ test ✓ build ✓

## Next Action (Inner Loop)
Phase 5 continued — Annotation canvas (PRD §31 build order #9). Build the drawing canvas overlay:
- AnnotationCanvas client component overlaid on the video (transparent canvas sized to video frame)
- Draw tools: pen (freehand), color picker, undo/clear
- Strokes tied to video timecode (each stroke records the time it was drawn)
- Uses lib/review/ for stroke model (create a lib/review/strokes.ts with pure helpers: createStroke, addPoint, strokeBounds — TDD first)
- Integrated into ReviewStudioClient alongside VideoPlayer + VoiceRecorder
- Note: Canvas drawing is browser-only; test the stroke model pure helpers, verify UI via build

After annotation canvas: review event capture (#10), then Phase 5 complete → Phase 6 render pipeline.

## Open Issues
- All stores in-memory — MVP-acceptable.
- Video URL is a sample placeholder; real video storage comes with render pipeline (Phase 6).
- No blockers

**Last Updated:** 2026-06-21 (Round 10 — Phase 5 microphone recording UI complete)
