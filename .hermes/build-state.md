# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** MVP scaffold COMPLETE (267 tests). WAVE 2 — Production Push in progress. Wave 1 Foundation: Tasks 1-5 done, Task 6 schema migration done, Supabase impls remaining.

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
**Wave 1, Task 6, Slice C:** Update repo docs (DATA_MODEL.md, TECH_SPEC.md, API_SPEC.md) to reflect the repository interface layer + Supabase schema. Then proceed to **Slice D:** fill in the Supabase repository impls (supabase-submissions.ts, supabase-coaches.ts, supabase-earnings.ts, supabase-playback.ts) with real PostgREST queries using fetch() directly (same pattern as lib/storage/supabase-storage.ts). Each impl needs: constructor reading NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, a private `tableApi(name)` helper returning the PostgREST endpoint, row↔domain mapping functions (e.g. price_usd_cents↔priceUsd, timestamptz↔Date), and all interface methods implemented. Tests mock global fetch to validate query construction + response mapping.

**Wave 1, Task 6, Slice B ✅ DONE:** Supabase Postgres schema migration — `supabase/migrations/0001_initial_schema.sql` (760 lines). 9 tables (coaches, submissions, earnings, playback_manifests, freeze_frame_notes, video_assets, audio_assets, lesson_delivery_tokens, ai_packaging_jobs) with all columns matching TS domain types. Money stored as INTEGER cents. Enums for submission_status, transcript_status, ai_packaging_job_status, storage_provider. JSONB for nested arrays (annotations, highlights, testimonials, manifest). RLS enabled on all coach-owned tables with policies for public read (coaches), anon insert (submissions), coach-owned CRUD (via current_coach_slug() JWT helper), and parent magic-link read (via current_parent_token() helper). 20 indexes on FK + lookup columns. updated_at auto-trigger on all 9 tables. 27 new tests. 360 tests total, commit edc4a74.

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
- Supabase repository impls are stubs (throw "not implemented") → Slice D fills them with real PostgREST queries
- Repo docs (DATA_MODEL, TECH_SPEC, API_SPEC) are stubs → Slice C updates them
- All stores in-memory/file → Slice D flips them live when env keys present
- Stripe is mock → Wave 2 real Checkout + webhooks
- No transcription yet → Wave 4 Deepgram
- No real AI packaging → Wave 4 OpenAI
- API keys not yet provisioned → adapters run in mock mode until user adds .env

**Last Updated:** 2026-06-21 — Wave 1 Task 6 Slice B complete (Supabase schema migration, 27 new tests, commit edc4a74). Next: update repo docs + fill in Supabase repository impls with real PostgREST queries.
