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

## 2026-06-21 — Async Repository Interfaces (PENDING)
**Decision:** Convert the four repository interfaces from synchronous to async before filling in Supabase impls with real PostgREST queries.
**Context:** Wave 1 Task 5 introduced the repository interface layer with synchronous method signatures (e.g. `create(input: SubmissionInput): Submission`). This was correct for the in-memory impls (which are synchronous array operations) and preserved all 44 existing import sites + 267 tests unchanged. However, real Supabase queries via `fetch()` / PostgREST are inherently async. A synchronous interface cannot call `fetch()` and return the result — `async` functions return `Promise<T>`, not `T`.
**Options considered:** (a) Keep interfaces sync, use a sync HTTP client (impossible in Node.js — `fetch` is async-only). (b) Make interfaces async and cascade `async`/`await` through facades + callers. (c) Create a separate async interface alongside the sync one (messy, two code paths). (d) Use a sync wrapper like `deasync` (unreliable, blocks the event loop, not production-safe).
**Chosen direction:** (b) — convert interfaces to async.
**Reason:** All facade callers are server-side (API route handlers — already async; server components — already async-capable; test files — trivially updated). Client components do NOT call facades directly — they call API routes. This means the cascade is purely additive: add `async` to interfaces/impls/facades, add `await` to ~29 caller files. The in-memory impl change is mechanical (just add the `async` keyword — a sync function made async wraps its return in a Promise). No logic changes needed.
**Tradeoffs:** Touches ~29 files with ~255 call sites. Test files need `await` added to facade calls. Risk of missing a call site — mitigated by TypeScript (a `Promise<T>` where `T` is expected will fail typecheck). The conversion is a single atomic commit to avoid half-async state.
**Blocked by:** Nothing — ready to execute as a dedicated tick.
**Blocks:** Supabase repository impls (Slice D), Wave 2 real upload/storage, all production persistence.
**Date:** 2026-06-21
