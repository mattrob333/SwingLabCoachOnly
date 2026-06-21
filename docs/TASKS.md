# Tasks

## Task: Bootstrap Repository & Initial Docs
**User story:** As the project, I need a clean GitHub repo with all required artifacts so engineers can start building the same system.
**Scope:** Create README, all 16 /docs/ files, .hermes/build-state.md, initial decisions/assumptions.
**Out of scope:** Actual Next.js code or features.
**Dependencies:** None
**Technical notes:** Use the exact required artifacts list from PRD.
**Acceptance criteria:**
1. All 16 docs exist in /docs/
2. README exists with links
3. Build state file exists
**Test requirements:** N/A (docs)
**Failure states:** Missing files
**Completion definition:** Repo has visible structure on GitHub

## Task: Initialize Next.js Project (Phase 1)
**User story:** As a developer, I can run `npm run dev` and see a responsive shell.
**Scope:** Next.js 15 + TS + Tailwind + shadcn/ui scaffold
**Dependencies:** Bootstrap task
**Acceptance criteria:** App runs locally with basic layout matching PRD breakpoints
**Status:** Pending

## Task: Sync Engine Core — Phase Model + Frame Mapping (PRD §8–9)
**User story:** As the Review Studio compare screen, given a normalized scrubber value (0.0–1.0), I can compute the correct frame index for each swing so pro and player line up by movement stage.
**Scope:** lib/sync/phases.ts (7-phase model, normalized positions, validatePhaseMarkers) + lib/sync/frameMapping.ts (frameForProgress, framesForProgress)
**Dependencies:** Phase 1 web foundation
**Acceptance criteria:**
1. frameForProgress maps 0→stance frame, 1→finish frame; exact phase positions return exact marked frames; in-between progress interpolates linearly (PRD §9.2)
2. validatePhaseMarkers flags missing required phases, non-monotonic order, negative frames (PRD §6.2.4)
3. Works with the V1 minimum 5-phase set (stance/load/launch/contact/finish)
4. Never returns a frame outside [0, maxFrame]
**Test requirements:** tests/sync-phases.test.ts (8) + tests/sync-frameMapping.test.ts (11) — 19 tests
**Traceability:** PRD §8 (phase model), §9 (sync engine + §9.2 pseudocode), §21 (non-negotiable: frame-cache renderer, not MP4 seeking)
**Failure states:** Non-monotonic markers → validation problems list; empty markers → frame 0
**Status:** ✅ Complete (Round 4)

## Task: Phase 2 — Synced Scrubber Spike (M1, PRD §21.1)
**User story:** As a coach, I drag one master scrubber and both pro/player frame viewers update smoothly with no video seeking.
**Scope:** Two prebuilt frame sets + phase marker JSON + stacked 1:1 viewer + normalized scrubber consuming frameForProgress (PRD §10, §21.1)
**Dependencies:** Sync engine core
**Acceptance criteria:** Dragging scrubber renders cached frames for both swings via framesForProgress; no buffering/loading spinner under normal conditions
**Status:** Pending (next round)

## Task: Phase 2 — Coach Auth Scaffold (PRD §31 build order #1)
**User story:** As a coach, I can sign in with my handle + password and reach a protected dashboard; unauthenticated visitors are redirected to login.
**Scope:** `lib/auth/credentials.ts` (scrypt hashing + coach credential store), `lib/auth/session.ts` (HMAC-signed session tokens), `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `middleware.ts` (protects /coach/dashboard), `app/coach/login/page.tsx` (form), `components/auth/login-form.tsx`, `app/coach/dashboard/page.tsx` (protected server component).
**Dependencies:** Phase 1 web foundation.
**Acceptance criteria:**
1. `POST /api/auth/login` with valid slug+password sets httpOnly session cookie and returns 200; invalid credentials return 401 without leaking which slugs exist.
2. `POST /api/auth/logout` clears the cookie and redirects to /coach/login.
3. Middleware redirects unauthenticated `/coach/dashboard/*` requests to `/coach/login?redirect=...`.
4. Dashboard server component reads the session cookie and renders the signed-in coach's name; no session → 404.
5. Sessions are signed (HMAC-SHA256), tamper-proof, and expire after 7 days.
**Test requirements:** `tests/auth-credentials.test.ts` (11) + `tests/auth-session.test.ts` (7) — 18 new tests.
**Traceability:** PRD §31 build order #1 (Coach auth scaffold); docs/DECISIONS.md "Phase 2 Coach Auth".
**Failure states:** Tampered token → null session → redirect to login; expired token → null; wrong password → 401.
**Status:** ✅ Complete (Round 5)

(Additional tasks will be added in future rounds following the exact good task format.)
