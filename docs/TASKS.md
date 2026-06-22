# Tasks / TODO Board

**Last synced:** 2026-06-22 · **Tests:** 972 passing · **Build:** ✅ green · **Commits:** 181

This is the living task board. It is updated alongside the code every build tick. Legend: ✅ done · 🚧 in progress · ⏭️ next · ⬜ not started.

> Full plan: [`NEXT_STEPS_PLAN.md`](./NEXT_STEPS_PLAN.md). State file: `.hermes/build-state.md`.

---

## At a Glance

| Wave | Name | Status |
|---|---|---|
| Scaffold | MVP — all 20 PRD build-order items | ✅ Complete |
| Wave 1 | Foundation (persistence + storage) | ✅ Complete |
| Wave 2 | Workflow (upload, payment, delivery) | ✅ Complete |
| Wave 3 | Review Studio polish | ✅ Complete |
| Wave 4 | AI (Deepgram + OpenAI) | ✅ Complete |
| Wave 5 | Player experience | ✅ Complete |
| Wave 6 | Hardening + deploy | 🚧 Next |
| UX | UX/UI polish (coach-first) | 🚧 In progress |

---

## ✅ MVP Scaffold (Complete)
All 20 PRD §31 build-order items: coach auth, onboarding, parent upload, payment/invite-code, coach inbox, submission detail, Review Studio (player + scrubber + mic + annotation + event capture + saved frames), render pipeline, AI lesson draft, drill library, coach approval, lesson delivery, follow-up submission, Stripe earnings, PWA, comparison mode. Plus sync engine (phase model + frame mapping) and freeze-frame lesson playback.

## ✅ Wave 1 — Foundation (Complete)
- [x] `lib/env.ts` env validation / integration mode detection (12 tests)
- [x] Storage adapter interface + mock + Supabase impls + factory (13 tests)
- [x] Extended `FreezeFrameNote` + `LessonPlaybackManifest` types (7 tests)
- [x] Durable record types: `VideoAsset`, `AudioAsset`, `LessonDeliveryToken`, `AiPackagingJob` (14 tests)
- [x] Repository interface layer — env-gated factories, all 4 domain stores (23 tests)
- [x] Supabase Postgres schema migration `0001_initial_schema.sql` (9 tables, RLS, indexes, triggers; 27 tests)
- [x] Async repository interface conversion (all `Promise<T>`)
- [x] Real Supabase PostgREST implementations (26 fetch-mock tests)

## ✅ Wave 2 — Workflow (Complete)
- [x] Real parent upload → durable storage + `VideoAsset` record on upload
- [x] Stripe Checkout + webhooks (env-gated; HMAC verify; replay-safe; 31 tests)
- [x] Coach inbox ownership enforcement (cross-coach → 403; test coverage closed)
- [x] Lesson delivery token + email (approve→deliver→view end-to-end)
- [x] Lesson page token verification (`lib/lesson/access.ts`; valid/expired/revoked/mismatch/not-found gating; 9 tests)

## ✅ Wave 3 — Review Studio Polish (Complete)
- [x] Draft-note autosave hook + wiring + localStorage recovery
- [x] Re-record a coach note in place (`VoiceRecorder` forwardRef/imperative handle)
- [x] Transcript edit UI polish (char count + "Edited" badge via transcriptRaw/transcriptEdited)
- [x] Video player error recovery state (overlay + Retry + src-change reset)
- [x] Annotation canvas context-unavailable fallback
- [x] Retake thumbnail button on note cards (seek + re-capture)
- [x] Thumbnail zoom/expand lightbox (X / Escape / backdrop close)
- [x] Mobile touch targets (note cards, lightbox close, annotation toolbar)
- [x] Annotation toolbar mobile layout fix (no overlap with player controls)
- [x] `beforeunload` unsaved-changes warning
- [x] **Mobile draw-tools overlap fix (course correction)** — split annotation toolbar into shared `AnnotationToolbar` (desktop overlay `hidden sm:flex`, mobile stacked block below video `sm:hidden`); `forwardRef`+`useImperativeHandle` for undo/clear; 4 render tests. Resolved commit d6327b7 (697 tests).
- [ ] ⬜ Remaining ergonomics review (mobile QA pass — overlaps Wave 5)

## ✏️ Draw Tools Backlog (Annotation Canvas)
Current tools: pen (freehand), line, arrow, circle. Add the following IN ORDER (each TDD-first: extend the `Tool` union in `components/review/annotation-canvas.tsx`, add the toolbar button + icon, implement the canvas draw path, add a draw/render test). Do these AFTER the mobile-overlap fix above so new buttons don't worsen the crowding before the layout is fixed.
- [ ] **Dotted line** — a dashed/dotted straight line (use `ctx.setLineDash`). New tool id `"dotted-line"`; toolbar button + icon; draw path mirrors `"line"` but dashed; reset dash after stroke. Render/draw test.
- [ ] **Curved arrow** — an arrow drawn along a curved (arc/quadratic) path with the arrowhead at the end. Very useful for showing rotation / lack of rotation. New tool id `"curved-arrow"`; capture start + control/drag to define curvature; render a quadratic curve + arrowhead at the terminal point; draw test covering the arrowhead orientation along the curve tangent.

## ✅ Wave 4 — AI (Deepgram + OpenAI) (Complete)
- [x] Transcription adapter layer: types + Mock + Deepgram + env-gated factory (18 tests)
- [x] Transcription worker route `POST /api/submissions/[id]/transcribe` (auth + ownership; 9 tests)
- [x] OpenAI packaging adapter layer: types + Mock + OpenAI + factory (guardrail prompt; 36 tests)
- [x] Packaging worker route `POST /api/submissions/[id]/package` (persists aiSummary + aiNoteTitles; 8 tests)
- [x] Coach edit AI output `PATCH /api/submissions/[id]/package` (partial updates; validated note IDs; 11 tests)
- [x] Coach approval route `POST /api/submissions/[id]/approve` (status→approved, triggers delivery+email, idempotent; 9 tests)
- [x] **Sub-slice 3c — coach-facing UI for reviewing AI output + approve button**
  - [x] 3c-i: review UI component — `AiReviewPanel` displays AI summary + per-note titles; edit → `PATCH /package` (7 tests, 688 total)
  - [x] 3c-ii: "Approve & Send Lesson" button → `POST /approve` + page wiring (5 tests, 693 total)

Full coach-facing AI loop wired: transcribe → package → coach reviews/edits → coach approves → delivery token + email sent to parent. **WAVE 4 COMPLETE.**

## 🚧 Wave 5 — Player Experience (Complete)
- [x] Lesson note chapters (`lib/lesson/chapters.ts` — `buildChapterList` + `formatChapterTime`)
- [x] Thumbnail navigation (`LessonChapterList` component with thumbnails)
- [x] Transcript text display (transcriptEdited → transcriptRaw → transcript fallback)
- [x] Speed controls (pre-existing: 0.25x, 0.5x, 1x)
- [x] Jump-to-note (click chapter → seek video + activate note)
- [x] Replay note + skip-to-next-note buttons in active note overlay
- [x] Follow-up submission CTA polish (coach name personalization + AI summary section)
- [x] Mobile QA pass (touch-adequate overlay buttons, scrollable chapter list, responsive layout)

## 🚧 Wave 6 — Hardening (In Progress)
- [x] Auth/session security review — **DONE (commit ad74b65)**: verifySession hardened (reject empty coachSlug + non-finite expiresAt); cookie attrs already correct; 2 tests. 748 tests.
- [x] Rate limits — **DONE (commit b0e1d07)**: in-memory sliding-window rate limiter (`lib/auth/rate-limit.ts`). Per-IP, per-route namespaced keys. Upload: 10/10min. AI routes: 20/10min. Env-gated (`RATE_LIMIT_DISABLED=1`). 429 + Retry-After + X-RateLimit headers. 15 tests. 763 tests.
- [x] File-size / type validation, oversized upload rejection — **DONE (commit 2b98f17)**: video MIME allowlist (mp4/quicktime/webm/x-m4v) on /api/submissions POST; 3 hardening tests. 746 tests.
- [x] Privacy controls (data deletion, link revocation per PRD §25) — **DONE**: delivery link revocation API `POST /revoke-link` (commit ce2c097, 6 tests, 769 total); data deletion cascade `DELETE /api/submissions/[id]` — coach permanently deletes submission + all associated data (playback manifest, delivery tokens, VideoAssets, storage file best-effort); delete()/deleteForSubmission() added to 4 repository interfaces with InMemory + Supabase impls (commit b619cfc, 10 tests).
5. [~] Expanded test coverage + error monitoring — error boundaries (`app/error.tsx`, `app/global-error.tsx`) + custom 404 page (`app/not-found.tsx`) DONE (commit 2186aa7, 9 tests); **auth login+logout API route tests DONE (commit eb155ee, 17 tests, 951 total)** — covers malformed JSON, missing fields, unknown slug (no-leak), wrong password, valid login + cookie attrs (HttpOnly/SameSite/Path/Max-Age/Secure), token verification, slug trimming; logout redirect + cookie clearing; **redeem-code API route tests DONE (commit 3e56790, 10 tests, 961 total)** — covers 404/409/400/422/happy-path/whitespace-trimming for the last untested API route.
- [ ] Deploy checks (Vercel)

## 🚧 UX / UI Polish — Coach Interface First (In Progress)
- [x] Design tokens + shared shadcn/ui primitives (Card, Badge, Skeleton, EmptyState, Avatar) — 14 render/smoke tests, commit 80b4186, 793 tests
- [x] Coach dashboard / inbox (CoachInbox client component with filter tabs, Card+Badge+EmptyState primitives, Avatar in header; 23 tests, commit 02298d0, 816 tests)
- [x] Submission detail page hierarchy + status timeline (Card+Badge primitives, consistent spacing; commit abb5111)
- [x] Review Studio chrome (control bar, recording indicator, tool palette, saved-frames strip) — Card+EmptyState+Badge primitives, dark-mode success banner; 6 render/smoke tests, commit 2258471, 822 tests
- [x] Coach onboarding (Card wrapper, inline validation, step-gated Continue button, required-fields hint; 5 render tests, commit 735a070, 827 tests)
- [x] Earnings page (Card+EmptyState+Badge primitives, EarningsBreakdown component, "Paid" status badges; 5 render tests, commit 073a0b4, 832 tests)
- [x] Lesson approval screen (Card+Badge primitives for AiReviewPanel + LessonApprovalForm; Badge for status/saved/drills; 11 render tests, commit f83ffe3, 843 tests)
- [x] Global shell / nav (CoachTopNav + ConditionalChrome — path-aware chrome switching, mobile hamburger, active-state highlighting; 18 tests, commit 2607c4a, 861 tests)
- [ ] Micro-states everywhere (loading, empty, error, success toasts, disabled/processing) — toast system foundation DONE (9086908): lib/toast.ts + Toaster + 25 tests; **toast wiring slices 1–7 DONE:** AiReviewPanel (6 tests, 892), SubmissionDangerActions (13 tests, 905), OnboardingForm (4 tests, 909), LoginForm (4 tests, 913), StartReviewButton (4 tests, 917), LessonApprovalForm (5 tests, 922), ReviewStudioClient process-lesson (3 tests, 925).
- [~] Accessibility pass (landmarks, focus states, aria, contrast, keyboard nav) — **skip-to-content link + main landmark id DONE (commit 5d43d89, 3 tests, 964 total)**; **focus-visible ring styles on raw buttons DONE (commit dded234, 8 tests, 972 total)** — error boundaries, top nav, inbox tabs, payment toggle, toaster dismiss; aria-label audit complete (all icon-only buttons already labeled).

---

## Pitfalls / Notes for Future Ticks
- **Commit each green slice before starting the next file.** A tick cut off by the iteration cap leaves an uncommitted, half-written facade that fails typecheck. Keep slices small enough to finish + commit within one tick.
- All integrations run in **mock mode** until keys are added to `.env` (see README "Going Live").
- Keep `.hermes/build-state.md` and this board in sync with every commit.

---

## Historical (early bootstrap — done)
- [x] Bootstrap repo + all 16 `/docs/` artifacts seeded
- [x] Next.js 16 + React 19 + Tailwind 4 + shadcn scaffold
- [x] Sync engine core: `lib/sync/phases.ts` + `lib/sync/frameMapping.ts` (19 tests)
- [x] Coach auth scaffold (PRD §31 #1)
