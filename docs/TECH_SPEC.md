# Technical Specification

**Status:** Active — reflects Wave 1 Foundation implementation (360 tests green).

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui (base-nova / @base-ui/react) |
| Testing | Vitest + @testing-library/react |
| Database | Supabase Postgres |
| Storage | Supabase Storage (S3-compatible) |
| Auth | Stateless HMAC-SHA256 session cookies (MVP) → Supabase Auth (production) |
| Payments | Stripe Checkout + webhooks (mock in MVP) |
| Transcription | Deepgram (Wave 4) |
| AI Packaging | OpenAI (Wave 4) |
| Email | Resend (Wave 2) |
| Deployment | Vercel |

## Architecture

### Env-Gated Adapter Pattern

Every external integration uses an adapter that selects the real service or a mock fallback based on env key presence. The `lib/env.ts` module provides:

- `isLive(name)` / `isMock(name)` — boolean checks per integration
- `getIntegrationModes()` — returns current mode for all 6 integrations
- `logIntegrationModes()` — warns (never throws) when an integration is in mock mode

| Integration | Required Env Vars | Live Service | Mock Fallback |
|---|---|---|---|
| database | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Postgres (PostgREST via fetch) | In-memory arrays |
| storage | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Storage REST API | Local filesystem (`public/uploads`) |
| transcription | `DEEPGRAM_API_KEY` | Deepgram API | Stub (Wave 4) |
| ai | `OPENAI_API_KEY` | OpenAI API | Stub (Wave 4) |
| payments | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe Checkout + webhooks | Mock pay endpoint |
| email | `RESEND_API_KEY` | Resend API | Console.log stub |

### Repository Layer

```
lib/repositories/
  types.ts                      # Domain types + 4 repository interfaces
  in-memory-submissions.ts      # InMemorySubmissionRepository + SUBMISSIONS array
  supabase-submissions.ts       # SupabaseSubmissionRepository (stub → real impl pending)
  in-memory-coaches.ts          # InMemoryCoachRepository + COACHES array (seeded)
  supabase-coaches.ts           # SupabaseCoachRepository (stub)
  in-memory-earnings.ts         # InMemoryEarningRepository + EARNINGS array
  supabase-earnings.ts          # SupabaseEarningRepository (stub)
  in-memory-playback.ts         # InMemoryPlaybackManifestRepository + PLAYBACK_MANIFESTS
  supabase-playback.ts          # SupabasePlaybackManifestRepository (stub)
  index.ts                      # Factory: get{Domain}Repository() — env-gated, cached singletons
```

The factory caches each repository instance per tick. Tests can reset via `_resetAllRepositoriesForTests()`. Original domain modules (`lib/submissions.ts`, `lib/coaches.ts`, `lib/earnings.ts`, `lib/lesson/playback-store.ts`) are thin facades that re-export types + arrays and delegate all free functions through the factory.

### Storage Adapter

```
lib/storage/
  types.ts                      # StorageAdapter interface, StorageBucket type, UploadedAsset
  mock-storage.ts               # MockStorageAdapter (local filesystem)
  supabase-storage.ts           # SupabaseStorageAdapter (Supabase Storage REST API)
  index.ts                      # Factory: getStorageAdapter() — env-gated
```

Buckets: `videos`, `audio`, `thumbnails`, `manifests`. The Supabase adapter uses `fetch()` directly (no `@supabase/supabase-js` dependency) to keep the bundle lean. Signed URLs are generated on demand (1-hour TTL).

### Auth

Stateless HMAC-SHA256 signed session cookies (7-day, httpOnly, sameSite=lax). Credentials are scrypt-hashed. Swap points: `lib/auth/credentials.ts` and `lib/auth/session.ts`. Will be replaced by Supabase Auth in production.

### Freeze-Frame Lesson Format

The v1 lesson format is an interactive playback manifest (`LessonPlaybackManifest`) — NOT a rendered MP4. The manifest contains:
- `videoUrl` — the original swing video
- `notes: FreezeFrameNote[]` — timecoded voice-over notes with annotations, thumbnails, and transcript fields
- `aiSummary` — AI-generated parent-friendly summary (Wave 4)
- `version` — schema version for forward compatibility

MP4 export is deferred to a future wave.

## Key Design Decisions

### Async Repository Interfaces (PENDING — blocks Supabase impls)

The current repository interfaces are **synchronous** (e.g. `create(input): Submission`). This works for in-memory impls but is incompatible with real PostgREST queries via `fetch()`, which are inherently async. 

**Impact:** The Supabase repository impls cannot be filled in with real queries until the interfaces are converted to async (`create(input): Promise<Submission>`). This cascades to the 4 facade modules and ~29 caller files (API routes, server components, tests). All callers are server-side (API route handlers and server components are already async-capable; client components call API routes, not facades directly).

**Plan:** Convert in a dedicated tick — interfaces → in-memory impls (`async` keyword only) → facades (`async` + `await`) → callers (add `await`). The in-memory change is mechanical (just add `async`); the caller updates are additive (`await` + `async` on enclosing function). See DECISIONS.md for the full rationale.

### Money Storage

All money values are stored as INTEGER cents in Postgres (e.g. `4900` = $49.00) to avoid floating-point issues. Domain types use `number` (dollars) with conversion at the repository mapping layer.

### Client-Generated IDs

All primary keys are TEXT, generated client-side via `createReviewId(prefix)` (e.g. `"sub_<uuid>"`, `"vid_<uuid>"`). This avoids round-trip ID allocation and enables idempotent inserts.

### RLS Strategy

Row-Level Security is enabled on all tables. Access patterns:
- **Public read:** coaches (homepage, booking)
- **Anon insert:** submissions (parent upload — payment gate is the barrier, not auth)
- **Coach-owned CRUD:** via `current_coach_slug()` JWT helper
- **Parent magic-link read:** via `current_parent_token()` / `current_parent_token_id()` JWT helpers (no parent accounts)

## Build Quality Gates

Every commit must pass all four gates:
1. `npx tsc --noEmit` — typecheck
2. `npm run lint` — ESLint
3. `npx vitest run` — unit/integration tests
4. `npm run build` — Next.js production build (authoritative type-resolution + route-generation check)

## File Structure (Key Directories)

```
app/
  api/                          # 13 API route handlers
  coach/                        # Coach pages (dashboard, submission detail, review, lesson, compare)
  upload/                       # Parent upload page
  pay/                          # Parent payment page
  lesson/[id]/                  # Parent lesson playback page
components/
  review/                       # Review Studio (video player, annotation canvas, voice recorder, review studio client)
  coach/                        # Coach components (onboarding, lesson approval, start review)
  lesson/                       # Lesson playback player
  upload/, pay/, auth/          # Form components
lib/
  repositories/                 # Repository interface layer (env-gated)
  storage/                      # Storage adapter (env-gated)
  records/                      # Durable record types (VideoAsset, AudioAsset, LessonDeliveryToken, AiPackagingJob)
  lesson/                       # Lesson playback types + manifest builder + playback store
  auth/                         # Session + credentials
  review/                       # Review event types, ID generation, sync phases
  env.ts                        # Env-gated integration validation
supabase/
  migrations/                   # SQL schema migrations
docs/                           # 17 specification documents
tests/                          # 40 test files, 360 tests
```
