# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 6 render pipeline complete — AI lesson pack next)

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
8. [x] Phase 6: Render pipeline (Round 13 — manifest composition, render API, status transitions)
9. [~] Phase 6: AI lesson pack (next)
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
- Phase 6 render pipeline (complete): lib/render/pipeline.ts (buildRenderManifest, serializeManifest, RenderManifest/AudioLayer/AnnotationLayer types), lib/render/store.ts (RENDER_MANIFESTS in-memory store, getManifestForSubmission), lib/submissions.ts (rendering + completed statuses, markSubmissionRendering, markSubmissionCompleted), app/api/submissions/[id]/render/route.ts (auth+ownership gated, in_review → rendering → completed), 24 new tests
- 174 tests across 19 test files — all green
- Quality gate: typecheck ✓ lint ✓ test ✓ build ✓

## Next Action (Inner Loop)
Phase 6 — AI lesson draft (PRD §31 build order #13). The AI lesson pack takes the coach's review session (render manifest + events + strokes) and generates a structured lesson draft that the coach reviews, edits, and approves before delivery to the parent. Guardrail: AI assists coach only — the coach must approve before the lesson is delivered.
- lib/ai/lesson-draft.ts: pure function that takes a render manifest + review context and produces a structured LessonDraft (title, summary, key points, drills, notes) — TDD first
- LessonDraft type: { id, submissionId, title, summary, keyPoints[], drills[], coachNotes, generatedAt, status: "draft" | "approved" | "rejected" }
- API route POST /api/submissions/[id]/lesson-draft to generate the draft (MVP: rule-based/template generation, no external AI API call — the structure is the deliverable)
- API route PATCH /api/submissions/[id]/lesson-draft to allow coach to edit/approve/reject
- Drill library (build order #14) may be stubbed here with a simple in-memory drill list

## Open Issues
- All stores in-memory — MVP-acceptable.
- Video URL is a sample placeholder; real video storage comes with render pipeline (Phase 6).
- No blockers

**Last Updated:** 2026-06-21 (Round 13 — Phase 6 render pipeline complete, 174 tests)
