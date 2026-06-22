# SwingLab Next Steps — Production Push Plan (Wave 2)

**Status:** ACTIVE — MVP scaffold complete (all 20 PRD build-order items, 267 tests green). This plan drives the next build wave toward a **pilot-usable product**.

## North Star
One professional coach can receive a REAL swing, review it quickly on mobile, generate a clean interactive lesson, and deliver it to the parent through a secure magic link.

Out of scope for this wave (deferred): rendered MP4 export, marketplace breadth, parent accounts, AI biomechanics.

## Guiding Principle: Env-Gated Adapters
Every external integration (Supabase, storage, Deepgram, OpenAI, Stripe, email) must use an adapter that:
- Uses the REAL service when the API key/config is present in env.
- Falls back gracefully to the existing in-memory/mock implementation when absent.
This lets the build proceed now; the user flips each integration live by adding keys to `.env`. Add env validation that warns (not crashes) when a key is missing and logs which mode each adapter is in.

## Execution Order (6 Waves)

### Wave 1 — Foundation (persistence + storage)
- Supabase Postgres schema (migrations) matching docs/DATA_MODEL.md
- Storage adapter (Supabase Storage / S3-compatible) for videos, audio, thumbnails, manifests
- Env validation module (DATABASE_URL/Supabase, storage creds, DEEPGRAM_API_KEY, OPENAI_API_KEY, Stripe keys, email provider) — warn + mode-log, do not crash
- Migrate current file-store shapes (.swinglab-data, public/uploads) into repository interfaces backed by DB+storage (mock fallback retained)
- Extend `FreezeFrameNote`: thumbnailUrl, transcriptRaw, transcriptEdited, transcriptStatus, transcriptProvider, transcriptError
- Extend `LessonPlaybackManifest`: submissionId, coachSlug, parentEmail, deliveryTokenId, processedAt, version, aiSummary
- Add durable records: VideoAsset, AudioAsset, LessonDeliveryToken, AiPackagingJob
- Update repo docs (DATA_MODEL, TECH_SPEC, API_SPEC)

### Wave 2 — Workflow (real upload, payment, delivery)
- Parent upload → durable storage with real IDs + audit timestamps + coach ownership
- Stripe Checkout + webhook-confirmed payment status (replace demo pay); replay-safe webhook handling
- Coach inbox ownership enforcement
- Lesson delivery token (tokenized parent-safe URL, expiry) + email send (provider-gated)
- API: note autosave, lesson processing, magic-link delivery, parent lesson fetch by token

### Wave 3 — Review Studio Polish
- Autosave for in-progress notes
- Note edit / re-record flows
- Transcript editing UI (coach edits before processing)
- Note thumbnails with annotations (correctness)
- Clearer mobile layout + ergonomics
- Processing state + safe recovery if coach leaves mid-review

### Wave 4 — AI (Deepgram + OpenAI)
- Deepgram transcription worker: queue after each voice note upload; store raw transcript, status, errors per note; retry endpoint
- OpenAI packaging worker: run ONLY after transcripts exist. Generate concise moment titles + parent-friendly summary. PRESERVE coach wording — only clean obvious filler and organize. Never invent technical feedback.
- Coach approval flow (coach is final authority)
- Prompt + guardrail tests

### Wave 5 — Player Experience
- Interactive playback polish: note chapters, thumbnail navigation, transcript text, speed controls, replay note, jump to next note
- Follow-up submission CTA
- Mobile QA

### Wave 6 — Hardening
- Auth/session security review, rate limits
- File-size/type validation, oversized upload rejection
- Privacy controls (data deletion, link revocation per PRD §25)
- Expanded test coverage, error monitoring, deploy checks (Vercel)

## Test Plan
- Unit: schema validation, storage adapters, note ordering, transcript state transitions, AI packaging guardrails, lesson token expiry
- API: upload, payment webhook, audio upload, transcription retry, process lesson, email delivery, tokenized lesson access
- Browser/E2E: parent upload→payment, coach review on mobile, multiple freeze-frame notes, transcript edit, process lesson, parent playback, follow-up upload
- Security: wrong-coach access, expired lesson links, unauthenticated API calls, oversized uploads, invalid media types, replayed payment events
- Smoke: env validation, storage write/read, email send, Deepgram, OpenAI, deployed playback

## Decisions Locked
- Supabase Postgres + Supabase Storage (default; S3-compatible adapter interface)
- Magic-link parent delivery, NO parent accounts
- Deepgram for transcription, OpenAI for packaging (post-transcript only)
- Interactive playback is v1 lesson format; MP4 export deferred
- Coach remains authority; AI organizes + lightly cleans, never invents feedback
- Env-gated adapters with graceful mock fallback (no key = mock mode, logged)

## Assumptions
- Next target is a usable pilot, not marketplace scale.
- API keys (Deepgram/OpenAI/Stripe/Supabase/email) will be added to .env by the user; until then adapters run in mock mode.
