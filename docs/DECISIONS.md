# Decisions

## 2026-06-21 — Initial Stack Decision
**Decision:** Use Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui as the primary frontend stack.
**Context:** PRD explicitly recommends this stack for responsive web + PWA support.
**Options considered:** Next.js vs Remix vs plain Vite + React.
**Chosen direction:** Next.js 15 App Router.
**Reason:** Best ecosystem for auth, API routes, server components, and PWA.
**Tradeoffs:** Slightly heavier than Vite, but better long-term DX and deployment.
**Date:** 2026-06-21

## 2026-06-21 — Backend & Auth
**Decision:** Start with Supabase (Postgres + Auth + Storage) as default backend.
**Context:** PRD recommends Supabase or similar.
**Chosen direction:** Supabase for MVP speed.
**Date:** 2026-06-21

## 2026-06-21 — All 16 Required Artifacts Seeded
**Decision:** Seed all required docs immediately even if initially thin, then iterate with traceability.
**Reason:** Satisfies the "If these files do not exist, create them" rule in the SwingLab loop.
**Date:** 2026-06-21

## 2026-06-21 — Phase 2 Coach Auth: Stateless HMAC Sessions (MVP)
**Decision:** Implement coach auth with a stateless HMAC-SHA256 signed session cookie + scrypt-hashed in-memory credential store, rather than adding NextAuth/Auth.js or waiting for Supabase Auth.
**Context:** Supabase is not yet provisioned; the build order (PRD §31) requires coach auth scaffold before onboarding and the parent upload flow.
**Options considered:** (a) NextAuth/Auth.js with credentials provider, (b) Supabase Auth (blocked — no project provisioned), (c) stateless HMAC sessions with `node:crypto`.
**Chosen direction:** (c) — stateless HMAC sessions.
**Reason:** Zero new dependencies; pure `node:crypto` (scrypt + HMAC) is testable, constant-time, and has a clean swap path to Supabase Auth. Avoids Auth.js's edge-runtime + provider complexity for an MVP that will be replaced by Supabase anyway.
**Tradeoffs:** No refresh tokens, no magic links yet — acceptable for MVP. Sessions are 7-day, httpOnly, sameSite=lax. Credential store is in-memory (resets on deploy) — fine for MVP demo; real accounts land with Supabase.
**Swap points:** `lib/auth/credentials.ts` (`verifyCoachCredentials`, `coachExists`) and `lib/auth/session.ts` (`signSession`, `verifySession`).
**Date:** 2026-06-21
