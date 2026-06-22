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

## UX / UI Polish Workstream (runs ALONGSIDE waves — coach interface first)

A continuous, parallel workstream to make the **coach-facing interface** look professional, fast, and baseball-specific. The inner loop should pick up 1 UX polish task per tick whenever the current wave's next functional task is blocked or the slice is small — keep functional waves moving, but steadily raise visual quality. Coach surfaces are the priority (PRD §32: "the coach should always know the next best action").

**Design language (lock these):**
- Clean, professional, sport-specific (not generic SaaS / not fitness-app). Confident, focused, low-clutter.
- Brand: existing SwingLab "clay" primary tokens; ensure consistent light + dark.
- Typography scale, spacing rhythm, and a small set of reusable shadcn/ui components (Card, Badge, Button variants, Tabs, Dialog, Toast, Skeleton, EmptyState).
- Fast feel: skeleton loaders, optimistic UI, snappy transitions (no heavy animation).
- Mobile-first with strong desktop layouts (PRD §21 breakpoints + touch targets).

**Priority polish tasks (coach interface):**
1. **Design tokens + primitives** — finalize color/spacing/typography tokens; build/standardize shared UI primitives (Card, Badge, Button variants, Tabs, Dialog, Toast/Sonner, Skeleton, EmptyState, Avatar).
2. **Coach dashboard / inbox** — polished submission cards (player name, age, batting side, thumbnail, status chip, payment badge, parent question preview), status filters as tabs/segmented control, stat cards, empty states, loading skeletons, responsive list↔detail on desktop.
3. **Submission detail page** — clear hierarchy, video preview framing, player info panel, prominent "Start Review" primary action, secondary actions grouped, status timeline.
4. **Review Studio chrome** — polished control bar, large touch targets, clear recording indicator, tool palette styling, saved-frames strip, autosave/processing status affordances (coordinate with Wave 3).
5. **Coach onboarding** — friendly multi-step form, progress indicator, inline validation, review-products editor styling.
6. **Earnings page** — clean stat cards, payout status, table styling, empty/zero states.
7. **Lesson approval screen** — readable lesson draft layout, editable sections, drill cards, clear "Send Lesson" CTA.
8. **Global shell** — refined SiteHeader/nav (coach context), responsive sidebar on desktop, toasts for actions, consistent page headers + breadcrumbs.
9. **Micro-states everywhere** — loading skeletons, empty states, error states, success toasts, disabled/processing button states.
10. **Accessibility pass** — semantic landmarks, focus states, aria labels, color contrast, keyboard nav (desktop shortcuts already in PRD §21.7).

**Constraints:**
- Do NOT regress functionality or tests. Every UX change keeps the quality gate green.
- Prefer shadcn/ui + Tailwind utility composition over bespoke CSS.
- Keep it coach-first; parent lesson page polish is Wave 5 (player experience).
- No heavy dependencies (no large animation/chart libs unless clearly justified).
- Each polish task ships with at least a render/smoke test where practical.

## Phase 7 — Professional Visual Design Elevation (CURRENT PRIORITY)

The functional UX checklist above (tasks #1–10) is essentially complete — every surface uses shared primitives, toasts, skeletons, and has accessibility basics. This phase is the **aesthetic elevation pass**: make SwingLab look like a polished, premium product a professional hitting coach is proud to send to paying clients. This is now the **top inner-loop priority** alongside finishing Wave 6 deploy checks. Work coach-facing surfaces first, then the public + parent surfaces (since parents pay through them).

**Goal:** elevate from "clean functional app" to "professional, premium, confidence-inspiring product." Sport-specific and modern — NOT generic SaaS template, NOT fitness-app, NOT clinical.

**Design direction to establish first (one foundational tick before per-screen work):**
1. **Refine the design tokens / theme.** Audit `app/globals.css`. The current primary is a clay/red (`oklch(0.55 0.19 28)`) on a near-pure-white/grey neutral scale. Elevate it: introduce a richer, more deliberate neutral ramp (subtle warm or cool tint instead of pure grey), a confident primary + a complementary accent, success/warning/destructive that feel designed (not default Tailwind), and verify light + dark both look intentional. Tune `--radius`, shadows, and border treatments for a more premium feel (softer, layered shadows; hairline borders). Lock a type scale (display/heading/body/caption) with good line-height + tracking. Document the palette in a short `docs/DESIGN_SYSTEM.md`.
2. **Elevate shared primitives** (Card, Button, Badge, etc.) to the refined tokens — better default shadows, hover/active states, focus rings, transitions. One change here lifts every screen.

**Per-surface elevation (after the foundation tick), coach-first:**
3. **Coach dashboard / inbox** — strongest first impression. Refined stat cards (better hierarchy, iconography, subtle gradients/tints per status), polished submission cards with clear visual rhythm, refined filter tabs, a more designed empty state, a proper page header with coach identity. Make it feel like a focused command center.
4. **Review Studio** — the hero screen. Premium control bar, refined recording indicator (clear, calm, unmistakable), well-spaced tool palette, polished saved-frames strip, considered use of the video frame real-estate. This is where the coach spends their time — make it feel like a pro tool.
5. **Submission detail** — clear visual hierarchy, framed video preview, a designed status timeline, grouped primary/secondary actions with a prominent Start Review CTA.
6. **Lesson approval + AI review** — make the AI-assisted draft feel trustworthy and editable; clear sections, readable typography, confident Send CTA.
7. **Public coach page + landing** — parents judge credibility here before paying. Professional hero, coach profile presentation (photo, credentials, review products as polished pricing cards), trust signals, clean submission CTA.
8. **Parent upload + lesson pages** — the paid surfaces. Reassuring, simple, premium. Polished upload flow with clear progress; lesson page that feels like a high-value deliverable (chapters, video framing, homework presented attractively).
9. **Global shell + nav** — refined header/footer, coach-context nav, consistent page headers, breadcrumbs where useful, cohesive spacing system across all routes.
10. **Motion + finish** — tasteful micro-interactions (button/press feedback, card hover, smooth state transitions, skeleton→content fade). Subtle, fast, never gratuitous.

**Phase 7 constraints (same discipline as above):**
- Quality gate stays green on every commit; every visual change ships with at least a render/smoke test where practical.
- shadcn/ui + Tailwind composition; no heavy animation/chart/UI libraries.
- Token/primitive changes first (maximum leverage), then per-screen. Don't hand-tune individual screens before the shared foundation is refined — that creates inconsistency.
- Keep it accessible: contrast ratios, focus-visible, reduced-motion respect.
- Keep it baseball/coach-specific in tone, not generic.

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
