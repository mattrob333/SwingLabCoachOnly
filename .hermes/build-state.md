# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** MVP scaffold COMPLETE (267 tests). Starting WAVE 2 — Production Push (pilot-usable product).

## Architecture: Two-Tier Build Loop
- **Inner Loop** (cron `21c981f54bf6`) — every 5 min: Check → Test → Advance → Repeat. Fast, GLM 5.2, pushes to GitHub.
- **Outer Loop** (cron `30bbeeaeeaf8`) — every 30 min: Alignment audit against PRD + NEXT_STEPS_PLAN, guardrails, drift detection. Read-only.

## CURRENT WAVE: Wave 2 Production Push
See `docs/NEXT_STEPS_PLAN.md` for the full 6-wave plan. North star: ONE coach receives a real swing, reviews on mobile, generates an interactive lesson, delivers via secure magic link.

**Guiding principle:** Env-gated adapters — real service when key present, graceful mock fallback when absent. Never block on missing keys.

### Wave Order
1. [ ] Foundation: Supabase schema, storage adapter, env validation, migrate file-stores, extend FreezeFrameNote + LessonPlaybackManifest, add VideoAsset/AudioAsset/LessonDeliveryToken/AiPackagingJob
2. [ ] Workflow: real upload→storage, Stripe Checkout+webhooks, inbox ownership, lesson delivery token + email
3. [ ] Review Studio polish: autosave, edit/re-record, transcript edit UI, thumbnails, mobile, recovery
4. [ ] AI: Deepgram transcription worker, OpenAI packaging (coach voice preserved), approval flow
5. [ ] Player experience: chapters, thumbnails, transcript, speed, jump-to-note, follow-up CTA, mobile QA
6. [ ] Hardening: auth/session security, rate limits, file validation, privacy, tests, deploy

### Next Action (Inner Loop)
**Wave 1, Task 5:** Migrate current file-stores (.swinglab-data, public/uploads) into repository interfaces backed by DB+storage with mock fallback retained. Targets: `lib/submissions.ts`, `lib/coaches.ts`, `lib/earnings.ts`, `lib/lesson/playback-store.ts`. Define repository interfaces (e.g. `SubmissionRepository`, `CoachRepository`) with in-memory mock implementations (current behavior) + a Supabase impl stub. Factory selects impl by env. TDD-first — existing store tests should keep passing through the interface.
Then: Supabase Postgres schema migrations (matching docs/DATA_MODEL.md + new record types); update repo docs (DATA_MODEL, TECH_SPEC, API_SPEC).

**Wave 1, Task 4 ✅ DONE:** durable record types (VideoAsset, AudioAsset, LessonDeliveryToken, AiPackagingJob) in `lib/records/index.ts`, 14 tests, commit 636e25f.
**Wave 1, Task 3 ✅ DONE:** extended FreezeFrameNote (transcriptRaw, transcriptEdited, transcriptStatus, transcriptProvider, transcriptError) + LessonPlaybackManifest (submissionId, coachSlug, parentEmail, deliveryTokenId, processedAt, version, aiSummary); lesson-playback API propagates submission metadata; review studio marks notes transcriptStatus='pending'. 7 tests, commit eafeae2.
**Wave 1, Task 2 ✅ DONE:** storage adapter interface + mock/supabase impls + factory (lib/storage/), 13 tests, commit 244af41.
**Wave 1, Task 1 ✅ DONE:** env validation module (`lib/env.ts`), 12 tests, commit 4824d67.

## Completed (MVP Scaffold — Rounds 1–19, plus external AI's freeze-frame playback)
- All 20 PRD build-order items: auth, onboarding, upload, payment(mock), inbox, submission detail, Review Studio (player/scrubber/mic/annotation/events), render pipeline, AI lesson draft, drill library, coach approval, lesson delivery, follow-up, Stripe(mock)+earnings, PWA, comparison mode
- Freeze-frame lesson playback (external AI): lib/lesson/playback.ts, playback-store.ts, lesson-playback-player.tsx, audio upload API, lesson-playback API
- 267 tests across 33 files, all green; typecheck ✓ lint ✓ build ✓ (24 routes)

## Open Issues
- All stores in-memory/file → Wave 1 replaces with Supabase + storage adapter
- Stripe is mock → Wave 2 real Checkout + webhooks
- No transcription yet → Wave 4 Deepgram
- No real AI packaging → Wave 4 OpenAI
- API keys not yet provisioned → adapters run in mock mode until user adds .env

**Last Updated:** 2026-06-21 — Wave 1 Tasks 1-2 done (env validation + storage adapter, 25 tests, commits 4824d67 + 244af41). Next: extend FreezeFrameNote + LessonPlaybackManifest types.
