# SwingLabCoachOnly

**SwingLab** — a web-first responsive app (PWA-capable) for professional baseball hitting coaches.

> The product promise: a hitting coach can turn a submitted swing video into a clear, useful, **paid** lesson pack in 5–10 minutes — entirely from the browser, on mobile or desktop, with **no native app**.

Core loop: **Parent submits swing → Coach gets notified → Coach reviews (scrub, freeze, annotate, voice-over) → AI drafts a lesson from the coach's words → Coach approves → Parent receives a secure magic-link lesson → Player practices and submits a follow-up.**

---

## 🧭 Developer Notes & Current State

**Last synced:** 2026-06-22 · **Commits:** 109 · **Tests:** 681 passing (75 files) · **Build:** ✅ green (22 routes)

This project is built autonomously by a **two-tier cron loop** (see "Build Loop" below). The docs in `/docs/` and `.hermes/build-state.md` are the living source of truth and are updated alongside every code change.

### Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 4** + **shadcn/ui** (base-nova)
- **Vitest 4** + @testing-library + jsdom (681 tests)
- **Supabase** (Postgres + Storage) — schema written, runs in mock mode until keys are added
- **Stripe** (Checkout + webhooks) — adapter built, mock until keys added
- **Deepgram** (transcription) + **OpenAI** (lesson packaging) — adapters built, mock until keys added
- **Resend** (magic-link email) — adapter built, mock until keys added

### Architectural keystone: env-gated adapters
Every external integration uses an adapter that runs the **real service when its API key is present**, and falls back to a **mock implementation when absent**. Nothing crashes or blocks on missing keys. `lib/env.ts` detects mode per integration and logs which mode each is in. **The full real architecture is already built** — you flip each integration live just by adding keys to `.env` (see "Going Live" below).

### ✅ What's Done

**MVP scaffold (all 20 PRD build-order items):**
- Coach auth (scrypt credentials + HMAC sessions + middleware) · coach onboarding form · protected dashboard
- Parent upload flow · payment + invite-code flow · coach inbox · submission detail page
- **Review Studio**: video player + frame-accurate scrubber, microphone voice recording, annotation canvas, review event capture, saved freeze-frames
- Render pipeline (manifest composition + status transitions) · AI lesson draft generator · drill library
- Coach lesson approval screen · secure lesson delivery page · follow-up swing submission
- Stripe earnings dashboard · PWA (manifest + service worker + icons) · comparison mode

**Wave 1 — Foundation (COMPLETE):**
- `lib/env.ts` integration mode detection · storage adapter (mock + Supabase) · Supabase Postgres schema (`supabase/migrations/0001_initial_schema.sql`, 9 tables, RLS, indexes, triggers)
- Repository interface layer — async, env-gated factories for all domain stores; in-memory + real Supabase PostgREST implementations
- Extended `FreezeFrameNote` + `LessonPlaybackManifest`; new durable records: `VideoAsset`, `AudioAsset`, `LessonDeliveryToken`, `AiPackagingJob`

**Wave 2 — Workflow (COMPLETE):**
- Real parent upload → durable storage + `VideoAsset` record on upload
- **Stripe Checkout + webhooks** (env-gated): live mode creates a Checkout Session; webhook verifies HMAC signature, is replay-safe, marks submission paid
- Coach inbox ownership enforcement (cross-coach access → 403)
- **Lesson delivery tokens + email**: approve → generate tokenized parent-safe URL → email magic link; lesson page verifies token (valid → view + mark-viewed; expired/revoked/mismatch → access-denied; not-found → 404)

### 🚧 In Progress

**Wave 3 — Review Studio Polish (largely complete):**
- ✅ Draft-note autosave (localStorage recovery) · re-record a note in place · transcript edit UI (char count + "Edited" badge)
- ✅ Video error recovery overlay + retry · annotation-canvas context-unavailable fallback · retake thumbnail · thumbnail zoom lightbox
- ✅ Mobile touch targets + annotation toolbar mobile layout · `beforeunload` unsaved-changes warning

**Wave 4 — AI (Deepgram + OpenAI) — IN PROGRESS:**
- ✅ Transcription adapter layer (Mock + Deepgram) + worker route `POST /api/submissions/[id]/transcribe`
- ✅ OpenAI packaging adapter layer (guardrail-enforcing prompt: preserves coach wording, cleans filler only, never invents feedback) + worker route `POST /api/submissions/[id]/package`
- ✅ Coach edit AI output `PATCH /api/submissions/[id]/package`
- ✅ Coach approval route `POST /api/submissions/[id]/approve` (transitions to "approved", triggers delivery token + email; idempotent)
- ⏭️ **Next:** coach-facing UI for reviewing/editing AI output + "Approve & Send Lesson" button (Sub-slice 3c)

### 📋 Not Started
- **Wave 5 — Player experience:** lesson chapters, thumbnail nav, transcript display, speed controls, jump-to-note, follow-up CTA, mobile QA
- **Wave 6 — Hardening:** auth/session security review, rate limits, file-size/type validation, privacy controls (deletion + link revocation), expanded coverage, deploy checks (Vercel)
- **UX/UI Polish workstream (coach interface first):** design tokens + shared primitives, dashboard/inbox polish, submission detail, Review Studio chrome, onboarding, earnings, lesson approval, global shell, micro-states, accessibility

See [`docs/TASKS.md`](./docs/TASKS.md) for the granular TODO board and [`docs/NEXT_STEPS_PLAN.md`](./docs/NEXT_STEPS_PLAN.md) for the full 6-wave + UX plan.

---

## 🤖 The Build Loop (how this repo is built)

Two cron jobs drive autonomous development (model: GLM 5.2):
- **Inner Loop** (every 10 min): Check state → `git pull` → run tests → implement the next smallest vertical slice (TDD) → quality gate (`typecheck && lint && test && build`) → commit + push → update state → repeat. Self-pauses both crons at a genuine stopping point.
- **Outer Loop** (hourly): read-only alignment audit against the PRD, guardrails, and drift. Reports to Telegram.

`.hermes/build-state.md` is the resumable state file the loop reads/writes each tick.

---

## 🚀 Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest (681 tests)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # next build
```

Copy `.env.example` → `.env` and set at least `SESSION_SECRET`. Everything else runs in mock mode until you add keys.

### Going Live (flip integrations on)
Add the relevant keys to `.env` — adapters detect them automatically (`lib/env.ts`):

| Integration | Env keys | Unlocks |
|---|---|---|
| Supabase (DB + Storage) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Real persistence + video/audio storage. Run `supabase/migrations/0001_initial_schema.sql` first. |
| Stripe | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Real Checkout + payment webhooks |
| Deepgram | `DEEPGRAM_API_KEY` | Real voice-note transcription |
| OpenAI | `OPENAI_API_KEY` | Real lesson packaging |
| Resend | `RESEND_API_KEY` | Real magic-link lesson emails |

---

## 📁 Project Structure

```
app/                 Next.js routes (pages + /api routes)
components/          React components (auth, coach, review, lesson, pay, upload, site, ui)
lib/                 Domain logic + env-gated adapters
  ├── env.ts         Integration mode detection
  ├── repositories/  Async data layer (in-memory + Supabase impls, env-gated factory)
  ├── storage/       Storage adapter (mock + Supabase)
  ├── payments/      Payment adapter (mock + Stripe)
  ├── transcription/ Transcription adapter (mock + Deepgram)
  ├── packaging/     AI packaging adapter (mock + OpenAI)
  ├── email/         Email adapter (mock + Resend)
  ├── review/        Recording, strokes, events, timecode, draft-notes
  ├── sync/          Swing phase model + frame mapping
  └── lesson/        Playback manifest, delivery-token access
supabase/migrations/ Postgres schema
docs/                Living specs + task board (source of truth)
.hermes/             build-state.md (autonomous loop state)
```

## 📚 Docs
- [PRD](./docs/PRD.md) · [Next Steps Plan](./docs/NEXT_STEPS_PLAN.md) · [Tasks / TODO](./docs/TASKS.md)
- [Tech Spec](./docs/TECH_SPEC.md) · [Data Model](./docs/DATA_MODEL.md) · [API Spec](./docs/API_SPEC.md)
- [Decisions](./docs/DECISIONS.md) · [Assumptions](./docs/ASSUMPTIONS.md) · [Open Questions](./docs/OPEN_QUESTIONS.md)
- [Test Strategy](./docs/TEST_STRATEGY.md) · [Acceptance Criteria](./docs/ACCEPTANCE_CRITERIA.md) · [Privacy & Safety](./docs/PRIVACY_AND_SAFETY.md)

## 🔒 Guardrails (non-negotiable)
Web-first · parent upload without app download · coach-controlled lesson approval · **AI organizes/cleans the coach's words but never invents feedback** · payment or invite code before review · secure magic-link lesson delivery (no parent accounts) · no private coach-to-minor messaging · no marketplace · no native app · MP4 export deferred (interactive playback is v1).
