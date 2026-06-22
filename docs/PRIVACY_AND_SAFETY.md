# Privacy and Safety

**Status:** Core access controls built (token gating, coach ownership). Deletion + rate limits = Wave 6.
**Last synced:** 2026-06-22

## Parent ownership (youth players)
- The parent/guardian owns the submission and receives the lesson.
- No private coach-to-minor messaging (guardrail).

## Access control (built)
- **Coach routes**: every coach-facing API enforces `submission.coachSlug === session.coachSlug` → else **403**. Dashboard + submission detail filter by the session coach's slug.
- **Auth**: scrypt password hashing (`lib/auth/credentials.ts`) + HMAC-signed httpOnly session cookies (`lib/auth/session.ts`); login does not leak which slugs exist; `middleware.ts` protects `/coach/*`.
- **Parent lesson access**: tokenized magic link (no parent account). `lib/lesson/access.ts` → `verifyLessonAccess()` composes delivery-token lookup + verify + submission-id match + idempotent `markViewed`. Outcomes:
  - valid → grant + mark viewed
  - expired / revoked / mismatch → access-denied UI
  - not_found → `notFound()` (404, so probes can't confirm a lesson exists)
- Delivery tokens are opaque, generated client-side at creation so the emailed link is exactly what's stored; support `revoke` + `expiresAt`.

## Consent
- Upload flow captures consent (video upload, coach review, storage, AI transcription/packaging, delivery, retention). Tracked on submission.

## Data deletion / retention (PENDING — Wave 6)
- [ ] Delete raw video / rendered review / lesson pack / player profile
- [ ] Revoke lesson link (revoke path exists on token; needs UI)
- [ ] Retention policy + archive coach account
- Legal review required before public launch.

## Pending hardening (Wave 6)
- Rate limits, file-size/type validation, oversized-upload rejection, error monitoring.
