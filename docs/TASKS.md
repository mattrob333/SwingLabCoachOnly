# Tasks / TODO Board

**Last synced:** 2026-06-22 · **Tests:** 681 passing · **Build:** ✅ green · **Commits:** 109

This is the living task board. It is updated alongside the code every build tick. Legend: ✅ done · 🚧 in progress · ⏭️ next · ⬜ not started.

> Full plan: [`NEXT_STEPS_PLAN.md`](./NEXT_STEPS_PLAN.md). State file: `.hermes/build-state.md`.

---

## At a Glance

| Wave | Name | Status |
|---|---|---|
| Scaffold | MVP — all 20 PRD build-order items | ✅ Complete |
| Wave 1 | Foundation (persistence + storage) | ✅ Complete |
| Wave 2 | Workflow (upload, payment, delivery) | ✅ Complete |
| Wave 3 | Review Studio polish | 🚧 ~Complete |
| Wave 4 | AI (Deepgram + OpenAI) | 🚧 In progress |
| Wave 5 | Player experience | ⬜ Not started |
| Wave 6 | Hardening + deploy | ⬜ Not started |
| UX | UX/UI polish (coach-first) | ⬜ Not started |

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

## 🚧 Wave 3 — Review Studio Polish (~Complete)
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
- [ ] ⬜ Remaining ergonomics review (mobile QA pass — overlaps Wave 5)

## 🚧 Wave 4 — AI (Deepgram + OpenAI) (In Progress)
- [x] Transcription adapter layer: types + Mock + Deepgram + env-gated factory (18 tests)
- [x] Transcription worker route `POST /api/submissions/[id]/transcribe` (auth + ownership; 9 tests)
- [x] OpenAI packaging adapter layer: types + Mock + OpenAI + factory (guardrail prompt; 36 tests)
- [x] Packaging worker route `POST /api/submissions/[id]/package` (persists aiSummary + aiNoteTitles; 8 tests)
- [x] Coach edit AI output `PATCH /api/submissions/[id]/package` (partial updates; validated note IDs; 11 tests)
- [x] Coach approval route `POST /api/submissions/[id]/approve` (status→approved, triggers delivery+email, idempotent; 9 tests)
- [ ] ⏭️ **NEXT: Sub-slice 3c — coach-facing UI for reviewing AI output + approve button**
  - [ ] 3c-i: review UI component (display AI summary + per-note titles; edit → `PATCH /package`)
  - [ ] 3c-ii: "Approve & Send Lesson" button → `POST /approve`, wiring + render/smoke test

## ⬜ Wave 5 — Player Experience (Not Started)
- [ ] Lesson note chapters
- [ ] Thumbnail navigation
- [ ] Transcript text display
- [ ] Speed controls
- [ ] Replay note / jump-to-next-note
- [ ] Follow-up submission CTA polish
- [ ] Mobile QA pass

## ⬜ Wave 6 — Hardening (Not Started)
- [ ] Auth/session security review
- [ ] Rate limits
- [ ] File-size / type validation, oversized upload rejection
- [ ] Privacy controls (data deletion, link revocation per PRD §25)
- [ ] Expanded test coverage + error monitoring
- [ ] Deploy checks (Vercel)

## ⬜ UX / UI Polish — Coach Interface First (Not Started)
- [ ] Design tokens + shared shadcn/ui primitives (Card, Badge, Button variants, Tabs, Dialog, Toast, Skeleton, EmptyState, Avatar)
- [ ] Coach dashboard / inbox (submission cards, status filter tabs, stat cards, empty states, skeletons, responsive list↔detail)
- [ ] Submission detail page hierarchy + status timeline
- [ ] Review Studio chrome (control bar, recording indicator, tool palette, saved-frames strip)
- [ ] Coach onboarding (multi-step, progress, inline validation)
- [ ] Earnings page (stat cards, payout status, table, zero states)
- [ ] Lesson approval screen (readable draft layout, drill cards, "Send Lesson" CTA)
- [ ] Global shell / nav (coach context, desktop sidebar, toasts, page headers/breadcrumbs)
- [ ] Micro-states everywhere (loading, empty, error, success toasts, disabled/processing)
- [ ] Accessibility pass (landmarks, focus states, aria, contrast, keyboard nav)

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
