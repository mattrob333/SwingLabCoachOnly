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
**Wave 1, Task 2:** Create storage adapter interface (`lib/storage/types.ts` + `lib/storage/index.ts`) — `StorageAdapter` interface with `upload(bucket, key, blob, contentType)` → URL, `getUrl(bucket, key)`, `delete(bucket, key)`, `exists(bucket, key)`. Then mock implementation (`lib/storage/mock-storage.ts`) writing to `public/uploads` (existing behavior). Then Supabase implementation stub (`lib/storage/supabase-storage.ts`) gated on `isLive('storage')`. Factory `getStorageAdapter()` returns the live one when env present, else mock. TDD-first.
Then: migrate file-stores to repository interfaces; extend FreezeFrameNote + LessonPlaybackManifest fields; add VideoAsset/AudioAsset/LessonDeliveryToken/AiPackagingJob records.

**Wave 1, Task 1 ✅ DONE:** env validation module (`lib/env.ts`) — 12 tests, committed 4824d67.

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

**Last Updated:** 2026-06-21 — Wave 1 Task 1 done (env validation module, 12 tests, commit 4824d67). Next: storage adapter interface.
