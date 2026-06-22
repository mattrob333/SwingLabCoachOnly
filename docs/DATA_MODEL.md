# Data Model

**Source:** PRD Section 23 (Core entities) + Wave 1 Foundation implementation.

**Status:** Production schema defined in `supabase/migrations/0001_initial_schema.sql` (496 lines). TypeScript domain types in `lib/repositories/types.ts`, `lib/records/index.ts`, and `lib/lesson/playback.ts`. All columns map 1:1 to TS domain types.

---

## Overview

SwingLab has 9 core tables backed by Supabase Postgres. IDs are TEXT (client-generated, e.g. `"sub_<uuid>"`). Money is stored as INTEGER cents (e.g. `7500` = $75.00). JSONB is used for nested arrays (annotations, highlights, testimonials, manifest). All tables have `created_at` + `updated_at` TIMESTAMPTZ columns with auto-update triggers.

## Enums

| Enum | Values |
|---|---|
| `submission_status` | `pending_payment`, `paid`, `in_review`, `rendering`, `completed` |
| `transcript_status` | `pending`, `transcribing`, `ready`, `error` |
| `ai_packaging_job_status` | `queued`, `running`, `completed`, `failed` |
| `storage_provider` | `mock`, `supabase`, `s3` |

## Tables

### coaches
Public coach profiles. Visible to everyone (homepage, booking page).

| Column | Type | Notes |
|---|---|---|
| `slug` | TEXT PK | URL-safe slug, e.g. `marcus-reed` |
| `name` | TEXT | |
| `title` | TEXT | e.g. "Hitting Coach · Former MiLB" |
| `bio` | TEXT | |
| `location` | TEXT | |
| `price_usd_cents` | INTEGER | USD price in cents (e.g. 4900 = $49) |
| `turnaround` | TEXT | ISO 8601 duration, e.g. `PT24H` |
| `highlights` | JSONB | `string[]` |
| `testimonials` | JSONB | `{ author: string, quote: string }[]` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

**RLS:** Public SELECT. Coach-authenticated INSERT/UPDATE on own row (via `current_coach_slug()` JWT helper).

**TS type:** `Coach` in `lib/repositories/types.ts`.

### submissions
Parent-uploaded swing review requests. Created by anon (parent upload), then coaches review them. Coach owns the row after creation.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Client-generated UUID |
| `coach_slug` | TEXT FK → coaches | |
| `parent_email` | TEXT | |
| `player_age` | INTEGER | CHECK 5–18 |
| `swing_type` | TEXT | |
| `notes` | TEXT | Parent's description |
| `video_url` | TEXT | Nullable |
| `video_file_name` | TEXT | Nullable |
| `status` | submission_status | Default `pending_payment` |
| `follow_up_for` | TEXT FK → submissions(id) | Self-reference for follow-up swings |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** Anon INSERT (payment gate is the barrier, not auth). Coach-authenticated SELECT/UPDATE on own rows.

**TS type:** `Submission` in `lib/repositories/types.ts`.

### earnings
Records the coach's earnings per paid submission.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | e.g. `earn_<uuid>` |
| `submission_id` | TEXT FK → submissions | ON DELETE CASCADE |
| `coach_slug` | TEXT FK → coaches | |
| `amount_usd_cents` | INTEGER | CHECK > 0 |
| `parent_email` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** Coach-authenticated SELECT/INSERT on own rows.

**TS type:** `Earning` in `lib/repositories/types.ts`.

### playback_manifests
Stores the full `LessonPlaybackManifest` as JSONB plus denormalized metadata columns for efficient querying. One manifest per submission.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `submission_id` | TEXT FK → submissions | UNIQUE |
| `coach_slug` | TEXT FK → coaches | |
| `parent_email` | TEXT | |
| `delivery_token_id` | TEXT | Links to lesson_delivery_tokens for magic-link access |
| `manifest` | JSONB | Full `LessonPlaybackManifest` object |
| `version` | INTEGER | Default 1 |
| `status` | TEXT | `draft` or `processed` |
| `processed_at` | TIMESTAMPTZ | Nullable |
| `ai_summary` | TEXT | Nullable — AI-generated parent-friendly summary |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** Coach-authenticated SELECT/INSERT/UPDATE on own rows. Parent can SELECT by delivery token (magic-link access, no account).

**TS type:** `StoredPlaybackManifest` (= `LessonPlaybackManifest & { submissionId: string }`) in `lib/repositories/types.ts`.

### freeze_frame_notes
Normalized per-note rows extracted from the playback manifest. Enables per-note transcript updates, autosave, and Deepgram worker queries.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `manifest_id` | TEXT FK → playback_manifests | ON DELETE CASCADE |
| `submission_id` | TEXT FK → submissions | ON DELETE CASCADE |
| `timecode` | NUMERIC(10,3) | Seconds into the video |
| `audio_url` | TEXT | |
| `audio_duration` | NUMERIC(10,3) | Seconds |
| `thumbnail_url` | TEXT | Nullable |
| `transcript` | TEXT | Legacy field — backward compat |
| `transcript_raw` | TEXT | Deepgram raw output |
| `transcript_edited` | TEXT | Coach-edited version |
| `transcript_status` | transcript_status | Default `pending` |
| `transcript_provider` | TEXT | e.g. `deepgram` |
| `transcript_error` | TEXT | Error message if transcription failed |
| `annotations` | JSONB | `PlaybackAnnotation[]` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** Coach-authenticated SELECT/INSERT/UPDATE on own submissions' notes. Parent can SELECT notes for their delivered manifest (magic-link access).

**TS type:** `FreezeFrameNote` in `lib/lesson/playback.ts`.

### video_assets
Durable records for uploaded swing videos.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | e.g. `vid_<uuid>` |
| `submission_id` | TEXT FK → submissions | ON DELETE CASCADE |
| `coach_slug` | TEXT FK → coaches | |
| `original_filename` | TEXT | |
| `mime_type` | TEXT | |
| `size_bytes` | BIGINT | CHECK > 0 |
| `storage_key` | TEXT | Path in storage bucket |
| `storage_provider` | storage_provider | Default `mock` |
| `duration_sec` | NUMERIC(10,3) | Nullable |
| `uploaded_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** Coach-authenticated SELECT/INSERT on own rows.

**TS type:** `VideoAsset` in `lib/records/index.ts`.

### audio_assets
Durable records for coach voice-over audio per freeze-frame note.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | e.g. `aud_<uuid>` |
| `note_id` | TEXT | References freeze_frame_notes.id |
| `submission_id` | TEXT FK → submissions | ON DELETE CASCADE |
| `coach_slug` | TEXT FK → coaches | |
| `mime_type` | TEXT | |
| `size_bytes` | BIGINT | CHECK > 0 |
| `storage_key` | TEXT | |
| `storage_provider` | storage_provider | Default `mock` |
| `duration_sec` | NUMERIC(10,3) | CHECK > 0 |
| `uploaded_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** Coach-authenticated SELECT/INSERT on own rows.

**TS type:** `AudioAsset` in `lib/records/index.ts`.

### lesson_delivery_tokens
Opaque magic-link tokens for parent lesson access. No parent accounts — the token IS the auth. Expires after 30 days (default). Can be revoked.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | e.g. `tok_<uuid>` |
| `submission_id` | TEXT FK → submissions | ON DELETE CASCADE |
| `token` | TEXT | UNIQUE — opaque URL-safe string |
| `parent_email` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | 30 days from creation |
| `viewed_at` | TIMESTAMPTZ | Nullable — set on first view |
| `revoked_at` | TIMESTAMPTZ | Nullable — set on revocation |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** Coach-authenticated SELECT/INSERT/UPDATE on own submissions' tokens. Parent can SELECT by token string (magic-link auth via `current_parent_token()`).

**TS type:** `LessonDeliveryToken` in `lib/records/index.ts`.

### ai_packaging_jobs
Tracks OpenAI packaging worker state per submission.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | e.g. `aijob_<uuid>` |
| `submission_id` | TEXT FK → submissions | ON DELETE CASCADE |
| `status` | ai_packaging_job_status | Default `queued` |
| `provider` | TEXT | Default `openai` |
| `created_at` | TIMESTAMPTZ | |
| `started_at` | TIMESTAMPTZ | Nullable |
| `completed_at` | TIMESTAMPTZ | Nullable |
| `error` | TEXT | Nullable |
| `input_transcript_count` | INTEGER | Nullable |
| `output_summary` | TEXT | Nullable — AI-generated summary |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** Coach-authenticated SELECT/UPDATE on own submissions' jobs.

**TS type:** `AiPackagingJob` in `lib/records/index.ts`.

## RLS Helper Functions

| Function | Returns | Purpose |
|---|---|---|
| `current_coach_slug()` | TEXT | Extracts coach slug from JWT `user_metadata.coach_slug`. NULL for anon/service_role. |
| `current_parent_token_id()` | TEXT | Extracts delivery token ID from request JWT. |
| `current_parent_token()` | TEXT | Extracts parent token string from request JWT. |

## Indexes (20 total)

- `idx_submissions_coach_slug`, `idx_submissions_status`, `idx_submissions_created_at`, `idx_submissions_follow_up_for`
- `idx_earnings_coach_slug`, `idx_earnings_submission_id`
- `idx_manifests_coach_slug`, `idx_manifests_submission_id`
- `idx_notes_manifest_id`, `idx_notes_submission_id`, `idx_notes_transcript_status` (partial — `pending`/`transcribing` only)
- `idx_video_assets_submission_id`, `idx_video_assets_coach_slug`
- `idx_audio_assets_note_id`, `idx_audio_assets_submission_id`
- `idx_tokens_token`, `idx_tokens_submission_id`, `idx_tokens_expires_at` (partial — non-revoked only)
- `idx_ai_jobs_submission_id`, `idx_ai_jobs_status` (partial — `queued`/`running` only)

## Repository Interface Layer

The four primary domain stores (submissions, coaches, earnings, playback manifests) are accessed through env-gated repository interfaces defined in `lib/repositories/types.ts`:

| Interface | Methods | In-Memory Impl | Supabase Impl |
|---|---|---|---|
| `SubmissionRepository` | create, getById, getFollowUpsFor, getForCoach, markPaid, markInReview, markRendering, markCompleted | `InMemorySubmissionRepository` | `SupabaseSubmissionRepository` (stub) |
| `CoachRepository` | getBySlug, getAllSlugs, upsert | `InMemoryCoachRepository` | `SupabaseCoachRepository` (stub) |
| `EarningRepository` | record, getForSubmission, getForCoach, getTotalForCoach | `InMemoryEarningRepository` | `SupabaseEarningRepository` (stub) |
| `PlaybackManifestRepository` | getForSubmission, save | `InMemoryPlaybackManifestRepository` | `SupabasePlaybackManifestRepository` (stub) |

The factory (`lib/repositories/index.ts`) uses `isLive("database")` to select the impl. Facades in `lib/submissions.ts`, `lib/coaches.ts`, `lib/earnings.ts`, `lib/lesson/playback-store.ts` delegate all free functions through the factory.

**Note:** The Supabase impls are currently stubs that throw "not implemented". Filling them with real PostgREST queries requires converting the repository interfaces from synchronous to async (see DECISIONS.md — "Async Repository Interfaces").
