# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** In Progress (Phase 8 Stripe Connect + earnings complete — Phase 9 PWA next)

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
11. [x] Phase 8: Stripe Connect (mock) + earnings (Round 17)
12. [ ] Phase 9: PWA enhancements
13. [ ] Phase 10: Comparison mode

## Completed Tasks
- All 16 /docs/ artifacts seeded
- Next.js 16 + React 19 + Tailwind 4 + shadcn scaffold
- lib/coaches.ts, lib/turnaround.ts, lib/sync/phases.ts, lib/sync/frameMapping.ts, lib/utils.ts
- Phase 2: auth (scrypt + HMAC sessions), login/logout API, middleware, login + dashboard pages, onboarding form + API
- Phase 3: lib/submissions.ts, lib/invite-codes.ts, submissions/pay/redeem-code APIs, upload form, payment page
- Phase 4: Coach inbox (dashboard with stat cards + submission cards), submission detail page (/coach/submission/[id]), markSubmissionInReview, POST /api/submissions/[id]/review, StartReviewButton
- Phase 5 (complete): lib/review/timecode.ts, lib/review/recording.ts, lib/review/strokes.ts, lib/review/events.ts, VideoPlayer, VoiceRecorder, AnnotationCanvas, ReviewStudioClient, /coach/review/[id] page
- Phase 6 render pipeline (complete): lib/render/pipeline.ts, lib/render/store.ts, lib/submissions.ts (rendering + completed statuses), app/api/submissions/[id]/render/route.ts, 24 new tests
- Phase 6 AI lesson pack (complete): lib/drills.ts, lib/ai/lesson-draft.ts, lib/ai/lesson-draft-store.ts, app/api/submissions/[id]/lesson-draft/route.ts, 20 new tests
- Phase 7 lesson delivery + coach approval + follow-up (complete): app/lesson/[id]/page.tsx, GET lesson-draft API, app/coach/submission/[id]/lesson/page.tsx + lesson-approval-form, followUpFor field + upload flow + lesson CTA
- 204 tests across 22 test files — all green (Round 16)
- Phase 8 Stripe Connect (mock) + earnings (complete): lib/stripe-mock.ts (PaymentIntent stub — create/confirm/get, Stripe-shaped interface for mechanical swap), lib/earnings.ts (recordEarning idempotent per submission, getEarningsForCoach newest-first w/ insertion-order tiebreak, getTotalEarningsForCoach), app/api/submissions/[id]/pay/route.ts wired to stripe-mock (create+confirm intent, returns paymentIntentId), app/api/submissions/[id]/render/route.ts records earning on completion (idempotent), app/api/coach/earnings/route.ts (GET, auth-gated, total + breakdown), app/coach/earnings/page.tsx (earnings dashboard — total, per-review price, breakdown table), dashboard Earnings link, 28 new tests — 232 total
- Quality gate: typecheck ✓ lint ✓ test ✓ (232) build ✓

## Next Action (Inner Loop)
Phase 9 — PWA enhancements (PRD §31 build order #19).
- manifest.json / web app manifest for installable PWA
- Service worker for offline shell / caching
- Add-to-home-screen meta + iOS standalone tweaks
- App icons (placeholder SVG/PNG)

## Open Issues
- All stores in-memory — MVP-acceptable.
- Video URL is a sample placeholder; real video storage comes with render pipeline (Phase 6).
- Stripe is a mock; real Connect onboarding deferred until keys provisioned.
- No blockers

**Last Updated:** 2026-06-21 (Round 17 — Phase 8 Stripe Connect mock + earnings, 232 tests)
