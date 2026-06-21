# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 7 lesson delivery + approval + follow-up complete — Phase 8 Stripe next)

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
10. [x] Phase 7: Lesson delivery + coach approval + follow-up (Rounds 15–16)
11. [ ] Phase 8: Stripe Connect + earnings (next)
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
- 194 tests across 21 test files — all green (Round 14)
- Phase 7 lesson delivery (in progress): app/lesson/[id]/page.tsx (parent-facing, no auth — title, summary, key moments with timecodes, drills, coach notes), GET /api/submissions/[id]/lesson-draft (no auth fetch for parent access), 4 new tests — 198 total
- Phase 7 coach approval screen (complete): app/coach/submission/[id]/lesson/page.tsx (server component, auth-gated, coach-ownership verified), components/coach/lesson-approval-form.tsx (client — editable coachNotes textarea, Save notes / Approve / Reject buttons → PATCH API, status banner, draft preview with key moments + drills), submission detail page link to approval screen when completed, rendering status section + label added
- Phase 7 follow-up swing submission (complete): lib/submissions.ts (optional followUpFor field on Submission + SubmissionInput, getFollowUpsForSubmission helper with deterministic newest-first sort), POST /api/submissions accepts followUpFor, upload-form accepts followUpFor prop + forwards to API, upload page reads ?followUpFor= query param (verifies original exists, shows follow-up banner + heading), lesson page shows "Submit a follow-up swing" CTA when draft is approved
- 204 tests across 22 test files — all green (Round 16)
- Quality gate: typecheck ✓ lint ✓ test ✓ build ✓

## Next Action (Inner Loop)
Phase 8 — Stripe Connect + earnings (PRD §31 build order #18).
- Stripe Connect integration: coach onboarding to Stripe Connect (onboarding form extension), payout configuration.
- Earnings model: lib/earnings.ts — track coach earnings per completed submission, earnings dashboard.
- Mock Stripe for MVP (no real API keys): lib/stripe-mock.ts with createPaymentIntent / confirmPayment stubs that the existing /api/submissions/[id]/pay route can use.
- Coach earnings view: /coach/earnings page showing total + per-submission breakdown.

## Open Issues
- All stores in-memory — MVP-acceptable.
- Video URL is a sample placeholder; real video storage comes with render pipeline (Phase 6).
- No blockers

**Last Updated:** 2026-06-21 (Round 16 — Phase 7 coach approval screen + follow-up submission, 204 tests)
