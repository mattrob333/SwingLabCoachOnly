# Build State: SwingLabCoachOnly

**PRD Source:** SwingLab Web-First MVP (full document in conversation)
**Repo:** https://github.com/mattrob333/SwingLabCoachOnly
**Local workspace:** `C:\Users\mrobe\swinglab`
**Started:** 2026-06-21
**Status:** Wave 2 in progress — Task 4 (lesson delivery token + email) Sub-slice C (approve→deliver wiring) COMPLETE. 487 tests. Next: Wave 2 Task 4 Sub-slice D (lesson page token verification — verify token on `/lesson/[id]` page, mark viewed) + fill Supabase delivery token stub with real PostgREST queries.

## Architecture: Two-Tier Build Loop
- **Inner Loop** (cron `21c981f54bf6`) — every 10 min: Check → Test → Advance → Repeat. Fast, GLM 5.2, pushes to GitHub. Has a STOP CONDITION CHECK that pauses BOTH crons when all work is done / hard blocker / repeated failure.
- **Outer Loop** (cron `30bbeeaeeaf8`) — every 60 min (hourly): Alignment audit against PRD + NEXT_STEPS_PLAN, guardrails, drift detection. Read-only.
- **Overnight mode (2026-06-21):** intervals doubled (10m / 60m). Inner loop self-pauses both jobs at a genuine terminal point and sends "🛑 SwingLab Loop Stopped" to Telegram. To restart: user says "resume".

## CURRENT WAVE: Wave 1 — Foundation (persistence + storage)

See `docs/NEXT_STEPS_PLAN.md` for the full 6-wave plan. North star: ONE coach receives a real swing, reviews on mobile, generates an interactive lesson, delivers via secure magic link.

**Guiding principle:** Env-gated adapters — real service when key present, graceful mock fallback when absent. Never block on missing keys.

### Wave Order
1. [x] Foundation: Supabase schema ✅, storage adapter ✅, env validation ✅, migrate file-stores ✅, extend types ✅, docs ✅, async interfaces ✅, **Supabase PostgREST impls ✅**. **WAVE 1 COMPLETE.**
2. [~] Workflow: real upload→storage ✅, Stripe Checkout+webhooks ✅, inbox ownership ✅, lesson delivery token + email (Sub-slice A: email adapter ✅, Sub-slice B: delivery token repository ✅, Sub-slice C: approve→deliver wiring ✅ ← **CURRENT**)
3. [ ] Review Studio polish: autosave, edit/re-record, transcript edit UI, thumbnails, mobile, recovery
4. [ ] AI: Deepgram transcription worker, OpenAI packaging (coach voice preserved), approval flow
5. [ ] Player experience: chapters, thumbnails, transcript, speed, jump-to-note, follow-up CTA, mobile QA
6. [ ] Hardening: auth/session security, rate limits, file validation, privacy, tests, deploy

### Next Action (Inner Loop)
**Wave 2, Task 4 — Lesson delivery token + email send.** DECOMPOSED into sub-slices:
- **Sub-slice A ✅ DONE:** Email adapter layer — `lib/email/` (types.ts: EmailAdapter interface + SendLessonDeliveryInput + SendEmailResult; mock-email.ts: MockEmailAdapter logs to console + MOCK_SENT_EMAILS for test inspection; resend-email.ts: ResendEmailAdapter uses fetch() to POST to Resend /emails endpoint with subject + HTML body containing the magic-link lesson URL; index.ts: env-gated factory on isLive('email') → RESEND_API_KEY, EMAIL_FROM config var defaults to Resend sandbox sender). 23 new tests (8 mock + 9 resend + 6 factory). Commit 27e1aa4. 462 tests.
- **Sub-slice B ✅ DONE:** Delivery token repository — `LessonDeliveryTokenRepository` interface (create, getByToken, getBySubmissionId, markViewed, revoke) added to `lib/repositories/types.ts`. `InMemoryDeliveryTokenRepository` + `DELIVERY_TOKENS` array in `lib/repositories/in-memory-delivery-tokens.ts`. `SupabaseDeliveryTokenRepository` stub (throws "not implemented" — real PostgREST impl in follow-up, table exists in schema). Factory wired: `getDeliveryTokenRepository()` env-gated on `isLive('database')`. Pure `verifyDeliveryToken()` function: returns `{ valid: true }` for valid tokens, `{ valid: false, reason: 'expired' | 'revoked' }` for invalid, `undefined` for not-found (null/undefined input — distinct from invalid). 21 new tests. Commit 1b36758. 483 tests.
- **Sub-slice C ✅ DONE (this tick):** Approve→deliver wiring — `app/api/submissions/[id]/lesson-draft/route.ts` PATCH handler now creates a delivery token + sends lesson delivery email when the coach transitions the lesson draft status to "approved". Idempotent (only fires on transition TO approved, not re-approval). Non-fatal (email/token errors logged but don't block approval). Magic-link URL: `/lesson/{id}?token={token}`. 4 new tests (token creation, email send, idempotency, no-token-on-reject). Commit 63a86e7. 487 tests.
- **Sub-slice D (NEXT):** Lesson page token verification — add a verification route/middleware that validates the token on the lesson page using `verifyDeliveryToken()`. When a parent visits `/lesson/[id]?token=...`, verify the token is valid (not expired/revoked), mark it viewed via `getDeliveryTokenRepository().markViewed()`, and grant access. Return 403 for invalid/expired/revoked tokens, 404 for not-found. Also fill in the Supabase delivery token stub with real PostgREST queries (mirror supabase-video-assets.ts pattern, table `lesson_delivery_tokens` already in schema).

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

**Last Updated:** 2026-06-22 — Wave 2 Task 4 Sub-slice C (approve→deliver wiring) COMPLETE. PATCH lesson-draft route now creates delivery token + sends email on approval transition. Idempotent + non-fatal. 4 new tests. 487 tests green. Next: Sub-slice D — lesson page token verification + Supabase PostgREST delivery token impl.
