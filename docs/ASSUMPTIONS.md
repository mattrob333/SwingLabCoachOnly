# Assumptions

(Previous content preserved)

## 2026-06-21 — Phase 2 Coach Auth (MVP scaffold)
**Assumption:** For MVP, coach authentication uses a stateless HMAC-signed session cookie backed by an in-memory scrypt-hashed credential store seeded from `lib/coaches.ts`. The default password for all seeded coaches is `swinglab123` (demo only).
**Reason:** Supabase Auth is not yet provisioned; this unblocks the protected coach dashboard + login flow without external service dependencies.
**Swap path:** `verifyCoachCredentials` / `coachExists` in `lib/auth/credentials.ts` and `signSession` / `verifySession` in `lib/auth/session.ts` are the single swap points to Supabase Auth. The `SessionPayload.coachSlug` shape stays stable.
**Date:** 2026-06-21
