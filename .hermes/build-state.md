# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 5 in progress — video + recording + annotation done; review event capture next)

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
7. [~] Phase 5: Review Studio (Round 11 — video + scrubber + recording + mic UI + annotation canvas done; review event capture next)
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
- Phase 5 (partial): lib/review/timecode.ts, lib/review/recording.ts (RecordingSegment, createSegment, finalizeSegment, sortSegmentsByStartTime), lib/review/strokes.ts (Point, Stroke, createStroke, addPoint, strokeBounds), VideoPlayer (play/pause, frame step, scrubber, shortcuts, onTimeUpdate + overlay slot), VoiceRecorder (MediaRecorder, record/stop/playback/delete), AnnotationCanvas (freehand pen, color picker, undo/clear, timecode-anchored strokes), ReviewStudioClient orchestrator, /coach/review/[id] page
- 143 tests across 15 test files — all green
- Quality gate: typecheck ✓ lint ✓ test ✓ build ✓

## Next Action (Inner Loop)
Phase 5 continued — Review event capture (PRD §31 build order #10). Build the event log:
- lib/review/events.ts with pure helpers (createEvent, serializeEvents) — TDD first
- ReviewEvent type: { id, type, timecode, payload, wallClock }
- Event types: play, pause, seek, record_start, record_stop, stroke
- onEvent callback on VideoPlayer (play/pause/seek) → ReviewStudioClient maintains event log
- Render event timeline summary in Review Studio
- After this: Phase 5 complete → Phase 6 render pipeline.

## Open Issues
- All stores in-memory — MVP-acceptable.
- Video URL is a sample placeholder; real video storage comes with render pipeline (Phase 6).
- No blockers

**Last Updated:** 2026-06-21 (Round 11 — Phase 5 annotation canvas complete)
