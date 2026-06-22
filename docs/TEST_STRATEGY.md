# Test Strategy

**Status:** 681 tests across 75 files, all green. Vitest + @testing-library + jsdom.
**Last synced:** 2026-06-22

## Tooling
- `npm test` → `vitest run` · `npm run test:watch`
- Quality gate (every commit): `npm run typecheck && npm run lint && npm test && npm run build`

## Approach
- **TDD-first**: failing test → implement → pass → edge cases. Each green slice committed before the next file.
- **Env-gated adapters** tested in both modes: mock impls have direct unit tests; live impls (Supabase/Stripe/Deepgram/OpenAI/Resend) tested by mocking `global.fetch` and asserting the exact outbound request + response mapping.
- **API routes** tested for: happy path, auth required (401), cross-coach ownership (403), not-found, idempotency/replay-safety.
- **Client components** tested with render/smoke tests, mocking browser-API children (media, canvas, mic).

## Coverage by area (current)
- Auth: credentials + session (18) · Sync engine: phases + frame mapping (19) · Submissions + invite codes + pay + redeem · Review: timecode, recording, strokes, events, draft-notes
- Storage / repositories: in-memory + Supabase PostgREST fetch-mocks
- Payments: mock + Stripe adapter + webhook (31) · Transcription: mock + Deepgram (18) · Packaging: mock + OpenAI (36) · Email: mock + Resend
- Lesson: playback, delivery-token access gating (9) · Render pipeline + submission status · Comparison · PWA manifest

## Pending test work
- Wave 4 3c coach AI-review UI (render/smoke).
- Wave 5 player-experience component tests.
- Wave 6: security tests (expired/revoked links, oversized uploads, invalid media types, replayed webhooks — partially covered), rate-limit tests.
- E2E / browser tests (parent upload→pay, coach review on mobile, transcript edit, approve, parent playback, follow-up) — not yet wired.
