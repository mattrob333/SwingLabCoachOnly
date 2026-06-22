# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** Wave 4 (AI) IN PROGRESS — transcription adapter layer + transcription worker route + OpenAI packaging adapter layer + packaging worker route + coach edit AI output (PATCH /package) COMPLETE. 672 tests. Next: coach approval flow Sub-slice 3b (approve → delivery route) + 3c (coach-facing UI).

## Architecture: Two-Tier Build Loop
- **Inner Loop** (cron `21c981f54bf6`) — every 10 min: Check → Test → Advance → Repeat. Fast, GLM 5.2, pushes to GitHub. Has a STOP CONDITION CHECK that pauses BOTH crons when all work is done / hard blocker / repeated failure.
- **Outer Loop** (cron `30bbeeaeeaf8`) — every 60 min (hourly): Alignment audit against PRD + NEXT_STEPS_PLAN, guardrails, drift detection. Read-only.
- **Overnight mode (2026-06-21):** intervals doubled (10m / 60m). Inner loop self-pauses both jobs at a genuine terminal point and sends "🛑 SwingLab Loop Stopped" to Telegram. To restart: user says "resume".

## CURRENT WAVE: Wave 1 — Foundation (persistence + storage)

See `docs/NEXT_STEPS_PLAN.md` for the full 6-wave plan. North star: ONE coach receives a real swing, reviews on mobile, generates an interactive lesson, delivers via secure magic link.

**Guiding principle:** Env-gated adapters — real service when key present, graceful mock fallback when absent. Never block on missing keys.

### Wave Order
1. [x] Foundation: Supabase schema ✅, storage adapter ✅, env validation ✅, migrate file-stores ✅, extend types ✅, docs ✅, async interfaces ✅, **Supabase PostgREST impls ✅**. **WAVE 1 COMPLETE.**
2. [x] Workflow: real upload→storage ✅, Stripe Checkout+webhooks ✅, inbox ownership ✅, lesson delivery token + email ✅ (Sub-slice A: email adapter ✅, Sub-slice B: delivery token repository ✅, Sub-slice C: approve→deliver wiring ✅, Sub-slice D: Supabase PostgREST delivery token impl ✅ + lesson page token verification ✅). **WAVE 2 COMPLETE — approve→deliver→view end-to-end loop wired.**
3. [~] Review Studio polish: autosave (slice 1 ✅ draft-notes storage, slice 2a ✅ useDraftNotesAutosave hook, slice 2b ✅ wire into review-studio-client, slice 2c ✅ render/smoke test), re-record coach note ✅, transcript edit UI polish ✅ (char count + Edited badge using transcriptRaw/transcriptEdited fields), video error recovery ✅ (error overlay + Retry button + src-change reset), annotation canvas fallback ✅ (context-unavailable detection + fallback message), retake thumbnail ✅ (Camera button on note cards, seeks to timecode + re-captures), thumbnail zoom ✅ (click thumbnail → full-size lightbox modal, closable via X/Escape/backdrop), mobile touch targets ✅ (note cards, lightbox close, annotation toolbar), annotation toolbar mobile layout ✅ (removed below-video positioning that overlapped player controls; icon-only Undo/Clear + hidden marks count on mobile), **beforeunload unsaved-changes warning ✅** (useBeforeUnloadWarning hook + wired into ReviewStudioClient — browser "Are you sure?" dialog when notes exist && lesson not processed; autosave localStorage is the recovery mechanism)
4. [~] AI: Deepgram transcription worker, OpenAI packaging (coach voice preserved), approval flow — **IN PROGRESS**: transcription adapter layer ✅ (types + MockTranscriptionAdapter + DeepgramTranscriptionAdapter + env-gated factory, 18 tests), **transcription worker route ✅** (POST /api/submissions/[id]/transcribe — auth + ownership + transcribe + update manifest note if exists, 9 tests, 617 total), **OpenAI packaging adapter layer ✅** (types + MockPackagingAdapter + OpenAIPackagingAdapter + env-gated factory — 6th application of the env-gated adapter pattern; guardrail-enforcing system prompt; deterministic mock titles/summary; 36 tests, 653 total), **packaging worker route ✅** (POST /api/submissions/[id]/package — auth + ownership + load manifest + call packaging adapter + persist aiSummary + aiNoteTitles onto manifest; adds aiNoteTitles field to LessonPlaybackManifest; 8 tests, 661 total), **coach edit AI output ✅** (PATCH /api/submissions/[id]/package — coach reviews/edits aiSummary + aiNoteTitles on manifest; partial updates preserve other field; aiNoteTitles validated against manifest note IDs; 11 tests, 672 total). Next: coach approval flow Sub-slice 3b (approve → delivery route) + 3c (coach-facing UI).
5. [ ] Player experience: chapters, thumbnails, transcript, speed, jump-to-note, follow-up CTA, mobile QA
6. [ ] Hardening: auth/session security, rate limits, file validation, privacy, tests, deploy

### Next Action (Inner Loop)
**Wave 4 — AI (Deepgram + OpenAI).** Transcription adapter layer + transcription worker route + OpenAI packaging adapter layer + packaging worker route + coach edit AI output ALL COMPLETE. The packaging route (`/api/submissions/[id]/package`) now has POST (package) and PATCH (edit AI output). PATCH lets the coach review and edit `aiSummary` + `aiNoteTitles` on the manifest — partial updates preserve the other field, aiNoteTitles entries validated against manifest note IDs. 11 new tests (672 total). Commit f7d2bea.

**Next:** Coach approval flow Sub-slice 3b — a POST/PUT route to approve the AI-packaged lesson (transition submission status to "approved" + trigger delivery: create delivery token + send email, reusing the Wave 2 approve→deliver wiring pattern from the lesson-draft PATCH route). This is a new route on the playback manifest (separate from the old lesson-draft PATCH which works on the LessonDraft concept). Decompose: 3b = approve→deliver API route, 3c = coach-facing UI for reviewing AI output + approve button.

- **Sub-slice D part 2 ✅ DONE (this tick):** Lesson page token verification — `lib/lesson/access.ts` exports `verifyLessonAccess()` (composes `getDeliveryTokenRepository().getByToken` + `verifyDeliveryToken` + submission-id match + idempotent `markViewed`) and `LessonAccessDeniedReason` type. `app/lesson/[id]/page.tsx` now accepts `searchParams.token`, runs the access gate before loading lesson data. Valid → grant + markViewed; missing/expired/revoked/mismatch → access-denied UI; not_found → `notFound()` (404, so probes don't confirm lesson existence). 9 new tests. Commits e0dd214 + 7249fc6. 502 tests.
- **Sub-slice D part 1 ✅ DONE:** Supabase PostgREST delivery token impl — filled `lib/repositories/supabase-delivery-tokens.ts` stub with real fetch() queries against `lesson_delivery_tokens`. Maps snake_case↔camelCase and ISO TIMESTAMPTZ strings↔epoch-ms numbers (matching the VideoAsset epoch-ms pattern, NOT Date objects). `create()` generates id + opaque token + timestamps client-side via `createLessonDeliveryToken()` (mirrors in-memory impl) so the emailed magic-link token is exactly what's stored. `markViewed`/`revoke` PATCH only `viewed_at`/`revoked_at` (never the PK). 406→undefined on `getByToken` not-found. 6 new fetch-mock tests added to `tests/repositories/supabase-impls.test.ts`. Commit 5d58ad3. 493 tests.

**Wave 2, Task 3 ✅ DONE:** Coach inbox ownership enforcement — test coverage complete. Audit found all coach-facing API routes (review, render, lesson-draft, audio, lesson-playback POST) already enforce `submission.coachSlug !== session.coachSlug → 403` in code, and the dashboard + submission detail server components already filter by the session coach's slug. The gap was test coverage: the audio and lesson-playback routes lacked the cross-coach 403 test that review/render/lesson-draft already had. Added the "returns 403 when the submission belongs to a different coach" test to both test files. 439 tests (was 437), commit 9c81ed8.

**Wave 2, Task 2 ✅ DONE:** Stripe Checkout + webhooks (real payment, env-gated). Payment adapter layer (lib/payments/): PaymentAdapter interface + MockPaymentAdapter + StripePaymentAdapter (fetch-based, no SDK; HMAC-SHA256 webhook signature verification with 5-min tolerance) + env-gated factory. Pay route wired: live mode creates Stripe Checkout Session and returns { url } for client redirect; mock mode preserves existing synchronous confirm + markPaid contract. Webhook route (POST /api/stripe/webhook): verifies signature, processes checkout.session.completed → markSubmissionPaid, replay-safe (idempotent on already-paid). PaymentForm updated for live-mode redirect. 31 new tests (25 adapter + 6 webhook). Commits 635404d + bf2b6ef. 437 tests green.

**Wave 2, Task 1 ✅ DONE (repaired by interactive fix):** Real parent upload → durable storage via env-gated storage adapter + VideoAsset record on upload. The autonomous tick was cut off by the iteration cap mid-write, leaving lib/video-assets.ts broken (missing getVideoAssetRepository import + type-only re-exports not in local scope). Repaired interactively, commit 8ffd2a9. 406 tests green.

**PITFALL for future ticks:** When splitting work across files, COMMIT each green slice before starting the next file. A tick cut off by the iteration cap leaves an uncommitted, half-written facade that fails typecheck. Keep slices small enough to finish + commit within one tick's iteration budget.

**Build on mock mode** — no API keys provisioned yet. All env-gated adapters run in mock mode; the architecture is built real and flips live when the user adds `.env` keys.

**UX/UI Polish runs ALONGSIDE functional waves** (see docs/NEXT_STEPS_PLAN.md "UX / UI Polish Workstream"). Coach interface first. Pick up 1 polish task per tick when the functional slice is small/blocked — keep functional waves moving but steadily raise visual quality. Start with: design tokens + shared UI primitives (Card, Badge, Tabs, Toast, Skeleton, EmptyState), then coach dashboard/inbox polish.

**Wave 1, Task 7 ✅ DONE:** Async repository interface conversion — all 4 interfaces to `Promise<T>`, all impls/facades/callers updated. 360 tests, commit c2856ff.

**Wave 1, Task 8 (Slice D) ✅ DONE:** Supabase PostgREST impls — filled all 4 repository stubs with real fetch() queries against `/rest/v1/<table>`. Shared `supabase-client.ts` handles URL building, service-role auth headers, response parsing, 406/416 not-found handling. Row mapping: snake_case↔camelCase, cents↔dollars, ISO↔Date. 26 new tests mocking global.fetch verify correct PostgREST calls + mapping. 385 tests, commit 1018a7a. **Wave 1 Foundation COMPLETE.**

**Wave 1, Task 6 Slice B ✅ DONE:** Supabase Postgres schema migration — `supabase/migrations/0001_initial_schema.sql` (760 lines). 9 tables with all columns matching TS domain types. Money stored as INTEGER cents. Enums for submission_status, transcript_status, ai_packaging_job_status, storage_provider. JSONB for nested arrays. RLS enabled on all tables. 20 indexes. updated_at triggers. 27 new tests. 360 tests total, commit edc4a74.

**Wave 1, Task 5 ✅ DONE:** repository interface layer — env-gated factories for all 4 domain stores. In-memory impls wrap existing logic; Supabase impls are stubs. Facades delegate through factory. 23 new factory tests. 333 tests total, commit 8cb93ca.

**Wave 1, Task 4 ✅ DONE:** durable record types (VideoAsset, AudioAsset, LessonDeliveryToken, AiPackagingJob), 14 tests, commit 636e25f.
**Wave 1, Task 3 ✅ DONE:** extended FreezeFrameNote + LessonPlaybackManifest, 7 tests, commit eafeae2.
**Wave 1, Task 2 ✅ DONE:** storage adapter interface + mock/supabase impls + factory, 13 tests, commit 244af41.
**Wave 1, Task 1 ✅ DONE:** env validation module (`lib/env.ts`), 12 tests, commit 4824d67.

## Repository Layer Architecture (Wave 1 Task 5)
```
lib/repositories/
  types.ts                      # All domain types + 4 repository interfaces
  in-memory-submissions.ts      # InMemorySubmissionRepository + SUBMISSIONS array
  supabase-submissions.ts       # SupabaseSubmissionRepository (stub — throws)
  in-memory-coaches.ts          # InMemoryCoachRepository + COACHES array (seeded)
  supabase-coaches.ts           # SupabaseCoachRepository (stub)
  in-memory-earnings.ts         # InMemoryEarningRepository + EARNINGS array
  supabase-earnings.ts          # SupabaseEarningRepository (stub)
  in-memory-playback.ts         # InMemoryPlaybackManifestRepository + PLAYBACK_MANIFESTS
  supabase-playback.ts          # SupabasePlaybackManifestRepository (stub)
  index.ts                      # Factory: get{Submission,Coach,Earning,PlaybackManifest}Repository()
```
- Factory uses `isLive("database")` to select impl (mirrors storage adapter pattern)
- Cached singletons per tick; `_resetAllRepositoriesForTests()` for test mode switching
- Facades in lib/submissions.ts, lib/coaches.ts, lib/earnings.ts, lib/lesson/playback-store.ts delegate all free functions through the factory

## Completed (MVP Scaffold — Rounds 1–19, plus external AI's freeze-frame playback)
- All 20 PRD build-order items: auth, onboarding, upload, payment(mock), inbox, submission detail, Review Studio (player/scrubber/mic/annotation/events), render pipeline, AI lesson draft, drill library, coach approval, lesson delivery, follow-up, Stripe(mock)+earnings, PWA, comparison mode
- Freeze-frame lesson playback (external AI): lib/lesson/playback.ts, playback-store.ts, lesson-playback-player.tsx, audio upload API, lesson-playback API
- 360 tests across 40 files, all green; typecheck ✓ lint ✓ build ✓ (24 routes)

## Open Issues
- **Stripe is mock** → Wave 2 real Checkout + webhooks ✅ DONE (adapter layer + webhook route built, flips live when STRIPE_* keys added)
- **No transcription yet** → Wave 4 Deepgram
- **No real AI packaging** → Wave 4 OpenAI
- **No real upload storage yet** → Wave 2 Task 1 (next action)
- **No lesson delivery token + email** → Wave 2 Task 4
- API keys not yet provisioned → adapters run in mock mode until user adds .env

**Last Updated:** 2026-06-22 — Wave 4 (AI) IN PROGRESS. Coach edit AI output COMPLETE: `PATCH /api/submissions/[id]/package` — coach reviews/edits `aiSummary` + `aiNoteTitles` on the manifest. Partial updates preserve the other field. aiNoteTitles validated against manifest note IDs (400 on unknown). 11 new tests (672 total). Commit f7d2bea. Next: coach approval flow Sub-slice 3b (approve → delivery route).
