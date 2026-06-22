# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** MVP scaffold COMPLETE (267 tests). WAVE 2 — Production Push in progress. Wave 1 Foundation: Tasks 1-6 done (schema + docs), async conversion + Supabase impls remaining.

## Architecture: Two-Tier Build Loop
- **Inner Loop** (cron `21c981f54bf6`) — every 5 min: Check → Test → Advance → Repeat. Fast, GLM 5.2, pushes to GitHub.
- **Outer Loop** (cron `30bbeeaeeaf8`) — every 30 min: Alignment audit against PRD + NEXT_STEPS_PLAN, guardrails, drift detection. Read-only.

## CURRENT WAVE: Wave 1 — Foundation (persistence + storage)

See `docs/NEXT_STEPS_PLAN.md` for the full 6-wave plan. North star: ONE coach receives a real swing, reviews on mobile, generates an interactive lesson, delivers via secure magic link.

**Guiding principle:** Env-gated adapters — real service when key present, graceful mock fallback when absent. Never block on missing keys.

### Wave Order
1. [~] Foundation: Supabase schema ✅, storage adapter ✅, env validation ✅, migrate file-stores ✅, extend types ✅, docs ✅. **REMAINING:** async interface conversion → Supabase impls.
2. [ ] Workflow: real upload→storage, Stripe Checkout+webhooks, inbox ownership, lesson delivery token + email
3. [ ] Review Studio polish: autosave, edit/re-record, transcript edit UI, thumbnails, mobile, recovery
4. [ ] AI: Deepgram transcription worker, OpenAI packaging (coach voice preserved), approval flow
5. [ ] Player experience: chapters, thumbnails, transcript, speed, jump-to-note, follow-up CTA, mobile QA
6. [ ] Hardening: auth/session security, rate limits, file validation, privacy, tests, deploy

### Next Action (Inner Loop)
**Wave 1, Task 7 — Async Repository Interface Conversion:** Convert all 4 repository interfaces from synchronous to async (`Promise<T>` return types). This is the critical prerequisite for filling in Supabase impls with real PostgREST queries (fetch is async; sync interfaces can't call it). Steps:
1. Update `lib/repositories/types.ts` — change all interface method return types to `Promise<T>`.
2. Add `async` keyword to all in-memory impl methods (mechanical — no logic change, just wraps return in Promise).
3. Add `async` + `await` to the 4 facade modules (`lib/submissions.ts`, `lib/coaches.ts`, `lib/earnings.ts`, `lib/lesson/playback-store.ts`).
4. Update all ~29 caller files (API routes, server components, test files) to add `await` before facade calls + `async` on enclosing functions.
5. TypeScript will catch any missed `await` (Promise<T> where T expected = typecheck error).
6. Quality gate: typecheck + lint + test + build. Single atomic commit.
7. After this lands, proceed to **Slice D:** fill in Supabase repository impls with real PostgREST queries using fetch() directly.

See `docs/DECISIONS.md` → "Async Repository Interfaces (PENDING)" for full rationale.

**Wave 1, Task 6 Slice C ✅ DONE:** Updated repo docs — DATA_MODEL.md (9-table schema: columns, types, RLS, indexes, repository layer), TECH_SPEC.md (stack, env-gated adapters, repository layer, storage adapter, auth, async-interface plan), API_SPEC.md (all 13 routes with request/response shapes + upcoming Wave 2+ routes), DECISIONS.md (async interface decision). Commit 2a77e13.

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
- **CRITICAL:** Repository interfaces are synchronous — must convert to async before Supabase impls can use fetch(). See DECISIONS.md. ~29 caller files to update.
- Supabase repository impls are stubs (throw "not implemented") → Slice D fills them after async conversion
- All stores in-memory/file → Slice D flips them live when env keys present
- Stripe is mock → Wave 2 real Checkout + webhooks
- No transcription yet → Wave 4 Deepgram
- No real AI packaging → Wave 4 OpenAI
- API keys not yet provisioned → adapters run in mock mode until user adds .env

**Last Updated:** 2026-06-21 — Wave 1 Task 6 Slice C complete (repo docs + async-interface decision, commit 2a77e13). Next: Task 7 — async repository interface conversion, then Slice D — Supabase impls with real PostgREST queries.
