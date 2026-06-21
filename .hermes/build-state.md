# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 5 complete — Review Studio done; Phase 6 render pipeline next)

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
7. [x] Phase 5: Review Studio (Rounds 9–11 — video player, scrubber, mic recording, annotation canvas, event capture)
8. [~] Phase 6: Render pipeline (next)
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
- Phase 5 (complete): lib/review/timecode.ts, lib/review/recording.ts (RecordingSegment, createSegment, finalizeSegment, sortSegmentsByStartTime), lib/review/strokes.ts (Point, Stroke, createStroke, addPoint, strokeBounds), lib/review/events.ts (ReviewEvent, createEvent, serializeEvents), VideoPlayer (play/pause, frame step, scrubber, shortcuts, onTimeUpdate + overlay + onEvent), VoiceRecorder (MediaRecorder, record/stop/playback/delete, event capture), AnnotationCanvas (freehand pen, color picker, undo/clear, timecode-anchored strokes, event capture), ReviewStudioClient (orchestrator + event timeline), /coach/review/[id] page
- 150 tests across 16 test files — all green
- Quality gate: typecheck ✓ lint ✓ test ✓ build ✓

## Next Action (Inner Loop)
Phase 6 — Render pipeline (PRD §31 build order #11). The render pipeline composes the coach's review session (video + voiceover + annotations + events) into a final lesson video artifact. For MVP web-first:
- lib/render/pipeline.ts: pure function that takes a review session (video URL, recording segments, strokes, events) and produces a render manifest (ordered timeline of composition steps) — TDD first
- RenderManifest type: { videoUrl, layers: { audio: segments, annotations: strokes }, events }
- serializeManifest for persistence
- API route POST /api/submissions/[id]/render to kick off render (MVP: store manifest in-memory, mark submission as rendering)
- Submission status transitions: in_review → rendering → completed
- Note: actual video compositing (ffmpeg/server-side render) is out of MVP scope; the manifest is the deliverable that a future render worker consumes

## Open Issues
- All stores in-memory — MVP-acceptable.
- Video URL is a sample placeholder; real video storage comes with render pipeline (Phase 6).
- No blockers

**Last Updated:** 2026-06-21 (Round 12 — Phase 5 Review Studio complete, 150 tests)
