# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 6 AI lesson pack complete — Lesson delivery next)

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
9. [x] Phase 6: AI lesson pack (Round 14 — lesson draft generator, drill library, lesson-draft API)
10. [~] Phase 7: Lesson delivery + follow-up (next)
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
- Phase 6 AI lesson pack (complete): lib/drills.ts (drill catalog: baseball/softball/golf/generic + getDrillsForSwingType), lib/ai/lesson-draft.ts (generateLessonDraft pure fn — title, summary, key points from annotations, drills from swing type, LessonDraft/KeyPoint types), lib/ai/lesson-draft-store.ts (LESSON_DRAFTS in-memory store + getDraftForSubmission/saveDraft), app/api/submissions/[id]/lesson-draft/route.ts (POST generate + PATCH edit/approve/reject), 20 new tests
- 194 tests across 21 test files — all green
- Quality gate: typecheck ✓ lint ✓ test ✓ build ✓

## Next Action (Inner Loop)
Phase 7 — Lesson delivery + follow-up (PRD §31 build order #15-17). After the coach approves the lesson draft, the lesson is delivered to the parent. The parent can then submit a follow-up swing.
- Lesson delivery page: /lesson/[id] — parent-facing page showing the approved lesson draft (title, summary, key points with timecodes, drills, coach notes). No auth required (parent accesses via link with submission id).
- Coach approval screen: /coach/submission/[id]/lesson — coach reviews the generated draft, edits notes, approves/rejects. Links from submission detail page when status is "completed".
- Follow-up swing submission (build order #17): parent can submit a new swing referencing the original lesson. lib/submissions.ts: add "followUpFor" field linking submissions. Upload form variant for follow-ups.
- API route GET /api/submissions/[id]/lesson-draft to fetch the approved draft for the delivery page

## Open Issues
- All stores in-memory — MVP-acceptable.
- Video URL is a sample placeholder; real video storage comes with render pipeline (Phase 6).
- No blockers

**Last Updated:** 2026-06-21 (Round 14 — Phase 6 AI lesson pack complete, 194 tests)
