# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** MVP scaffold COMPLETE (267 tests). WAVE 2 — Production Push in progress. Wave 1 Foundation nearly done.

## Architecture: Two-Tier Build Loop
- **Inner Loop** (cron `21c981f54bf6`) — every 5 min: Check → Test → Advance → Repeat. Fast, GLM 5.2, pushes to GitHub.
- **Outer Loop** (cron `30bbeeaeeaf8`) — every 30 min: Alignment audit against PRD + NEXT_STEPS_PLAN, guardrails, drift detection. Read-only.

## CURRENT WAVE: Wave 1 — Foundation (persistence + storage)

See `docs/NEXT_STEPS_PLAN.md` for the full 6-wave plan. North star: ONE coach receives a real swing, reviews on mobile, generates an interactive lesson, delivers via secure magic link.

**Guiding principle:** Env-gated adapters — real service when key present, graceful mock fallback when absent. Never block on missing keys.

### Wave Order
1. [~] Foundation: Supabase schema, storage adapter, env validation, migrate file-stores, extend FreezeFrameNote + LessonPlaybackManifest, add VideoAsset/AudioAsset/LessonDeliveryToken/AiPackagingJob
2. [ ] Workflow: real upload→storage, Stripe Checkout+webhooks, inbox ownership, lesson delivery token + email
3. [ ] Review Studio polish: autosave, edit/re-record, transcript edit UI, thumbnails, mobile, recovery
4. [ ] AI: Deepgram transcription worker, OpenAI packaging (coach voice preserved), approval flow
5. [ ] Player experience: chapters, thumbnails, transcript, speed, jump-to-note, follow-up CTA, mobile QA
6. [ ] Hardening: auth/session security, rate limits, file validation, privacy, tests, deploy

### Next Action (Inner Loop)
**Wave 1, Task 6:** Supabase Postgres schema migrations (matching docs/DATA_MODEL.md + new record types from Task 4). Create `supabase/migrations/` SQL files for: coaches, submissions, earnings, playback_manifests, video_assets, audio_assets, lesson_delivery_tokens, ai_packaging_jobs, freeze_frame_notes. Include RLS policies (coach owns their data), indexes, timestamps. Then update repo docs (DATA_MODEL, TECH_SPEC, API_SPEC) to reflect the repository interface layer + schema. Then fill in the Supabase repository impls (supabase-submissions.ts etc.) with real queries — replacing the "not implemented" stubs.

**Wave 1, Task 5 ✅ DONE:** repository interface layer — env-gated factories for all 4 domain stores (submissions, coaches, earnings, playback manifests). In-memory impls wrap existing logic; Supabase impls are stubs that throw "not implemented". Original modules (lib/submissions.ts, lib/coaches.ts, lib/earnings.ts, lib/lesson/playback-store.ts) are thin facades delegating through the factory. All 44 existing import sites + 267 existing tests work unchanged. 23 new factory tests. 333 tests total, commit 8cb93ca.

**Wave 1, Task 4 ✅ DONE:** durable record types (VideoAsset, AudioAsset, LessonDeliveryToken, AiPackagingJob) in `lib/records/index.ts`, 14 tests, commit 636e25f.
**Wave 1, Task 3 ✅ DONE:** extended FreezeFrameNote (transcriptRaw, transcriptEdited, transcriptStatus, transcriptProvider, transcriptError) + LessonPlaybackManifest (submissionId, coachSlug, parentEmail, deliveryTokenId, processedAt, version, aiSummary); lesson-playback API propagates submission metadata; review studio marks notes transcriptStatus='pending'. 7 tests, commit eafeae2.
**Wave 1, Task 2 ✅ DONE:** storage adapter interface + mock/supabase impls + factory (lib/storage/), 13 tests, commit 244af41.
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
- Types moved to lib/repositories/types.ts to avoid circular imports

## Completed (MVP Scaffold — Rounds 1–19, plus external AI's freeze-frame playback)
- All 20 PRD build-order items: auth, onboarding, upload, payment(mock), inbox, submission detail, Review Studio (player/scrubber/mic/annotation/events), render pipeline, AI lesson draft, drill library, coach approval, lesson delivery, follow-up, Stripe(mock)+earnings, PWA, comparison mode
- Freeze-frame lesson playback (external AI): lib/lesson/playback.ts, playback-store.ts, lesson-playback-player.tsx, audio upload API, lesson-playback API
- 333 tests across 39 files, all green; typecheck ✓ lint ✓ build ✓ (24 routes)

## Open Issues
- Supabase repository impls are stubs (throw "not implemented") → Task 6 fills them with real queries
- All stores in-memory/file → Wave 1 Task 6 adds Supabase schema + real impls
- Stripe is mock → Wave 2 real Checkout + webhooks
- No transcription yet → Wave 4 Deepgram
- No real AI packaging → Wave 4 OpenAI
- API keys not yet provisioned → adapters run in mock mode until user adds .env

**Last Updated:** 2026-06-21 — Wave 1 Task 5 complete (repository interface layer, 23 new tests, commit 8cb93ca). Next: Supabase Postgres schema migrations + fill in Supabase impls.
