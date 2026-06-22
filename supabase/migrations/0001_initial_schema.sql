-- ============================================================================
-- SwingLab — Initial Schema Migration (Wave 1 Task 6)
-- ============================================================================
-- Defines the production Postgres schema for the SwingLab coach platform.
-- All table columns map 1:1 to the TypeScript domain types in:
--   - lib/repositories/types.ts (Submission, Coach, Earning, StoredPlaybackManifest)
--   - lib/records/index.ts (VideoAsset, AudioAsset, LessonDeliveryToken, AiPackagingJob)
--   - lib/lesson/playback.ts (FreezeFrameNote, LessonPlaybackManifest)
--
-- Apply via: supabase db push  (or psql < 0001_initial_schema.sql)
--
-- IDs are TEXT (e.g. "sub_<uuid>") — generated client-side by createReviewId().
-- Money is stored as INTEGER cents (e.g. 7500 = $75.00) to avoid float issues.
-- JSONB is used for nested arrays (annotations, highlights, testimonials, manifest).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM (
    'pending_payment',
    'paid',
    'in_review',
    'rendering',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transcript_status AS ENUM (
    'pending',
    'transcribing',
    'ready',
    'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_packaging_job_status AS ENUM (
    'queued',
    'running',
    'completed',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE storage_provider AS ENUM (
    'mock',
    'supabase',
    's3'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- updated_at trigger function
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- coaches
-- ----------------------------------------------------------------------------
-- Public coach profiles. Visible to everyone (homepage, booking page).
-- RLS: public SELECT; coach-authenticated UPDATE on own row.

CREATE TABLE IF NOT EXISTS public.coaches (
  slug           TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  title          TEXT NOT NULL DEFAULT '',
  bio            TEXT NOT NULL DEFAULT '',
  location       TEXT NOT NULL DEFAULT '',
  price_usd_cents INTEGER NOT NULL DEFAULT 0,
  turnaround     TEXT NOT NULL DEFAULT 'PT24H',
  highlights     JSONB NOT NULL DEFAULT '[]'::jsonb,
  testimonials   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY coaches_public_read ON public.coaches
  FOR SELECT USING (true);

CREATE POLICY coaches_owner_update ON public.coaches
  FOR UPDATE TO authenticated
  USING (slug = current_coach_slug());

CREATE POLICY coaches_owner_insert ON public.coaches
  FOR INSERT TO authenticated
  WITH CHECK (slug = current_coach_slug());

-- ----------------------------------------------------------------------------
-- submissions
-- ----------------------------------------------------------------------------
-- Parent-uploaded swing review requests. Created by anon (parent upload),
-- then coaches review them. Coach owns the row after creation.

CREATE TABLE IF NOT EXISTS public.submissions (
  id              TEXT PRIMARY KEY,
  coach_slug      TEXT NOT NULL REFERENCES public.coaches(slug) ON DELETE RESTRICT,
  parent_email    TEXT NOT NULL,
  player_age      INTEGER NOT NULL CHECK (player_age >= 5 AND player_age <= 18),
  swing_type      TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  video_url       TEXT,
  video_file_name TEXT,
  status          submission_status NOT NULL DEFAULT 'pending_payment',
  follow_up_for   TEXT REFERENCES public.submissions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Parents (anon) can create submissions (payment gate is the barrier, not auth)
CREATE POLICY submissions_anon_insert ON public.submissions
  FOR INSERT WITH CHECK (true);

-- Coaches can read their own submissions
CREATE POLICY submissions_owner_select ON public.submissions
  FOR SELECT TO authenticated
  USING (coach_slug = current_coach_slug());

-- Coaches can update their own submissions (status transitions)
CREATE POLICY submissions_owner_update ON public.submissions
  FOR UPDATE TO authenticated
  USING (coach_slug = current_coach_slug())
  WITH CHECK (coach_slug = current_coach_slug());

CREATE INDEX IF NOT EXISTS idx_submissions_coach_slug ON public.submissions(coach_slug);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_follow_up_for ON public.submissions(follow_up_for) WHERE follow_up_for IS NOT NULL;

-- ----------------------------------------------------------------------------
-- earnings
-- ----------------------------------------------------------------------------
-- Records the coach's earnings per paid submission.

CREATE TABLE IF NOT EXISTS public.earnings (
  id              TEXT PRIMARY KEY,
  submission_id   TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  coach_slug      TEXT NOT NULL REFERENCES public.coaches(slug) ON DELETE RESTRICT,
  amount_usd_cents INTEGER NOT NULL CHECK (amount_usd_cents > 0),
  parent_email    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY earnings_owner_select ON public.earnings
  FOR SELECT TO authenticated
  USING (coach_slug = current_coach_slug());

CREATE POLICY earnings_owner_insert ON public.earnings
  FOR INSERT TO authenticated
  WITH CHECK (coach_slug = current_coach_slug());

CREATE INDEX IF NOT EXISTS idx_earnings_coach_slug ON public.earnings(coach_slug);
CREATE INDEX IF NOT EXISTS idx_earnings_submission_id ON public.earnings(submission_id);

-- ----------------------------------------------------------------------------
-- playback_manifests
-- ----------------------------------------------------------------------------
-- Stores the full LessonPlaybackManifest as JSONB plus denormalized metadata
-- columns for efficient querying. One manifest per submission.

CREATE TABLE IF NOT EXISTS public.playback_manifests (
  id                TEXT PRIMARY KEY,
  submission_id     TEXT NOT NULL UNIQUE REFERENCES public.submissions(id) ON DELETE CASCADE,
  coach_slug        TEXT NOT NULL REFERENCES public.coaches(slug) ON DELETE RESTRICT,
  parent_email      TEXT NOT NULL,
  delivery_token_id TEXT,
  manifest          JSONB NOT NULL DEFAULT '{}'::jsonb,
  version           INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'draft',
  processed_at      TIMESTAMPTZ,
  ai_summary        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playback_manifests ENABLE ROW LEVEL SECURITY;

CREATE POLICY manifests_owner_select ON public.playback_manifests
  FOR SELECT TO authenticated
  USING (coach_slug = current_coach_slug());

CREATE POLICY manifests_owner_insert ON public.playback_manifests
  FOR INSERT TO authenticated
  WITH CHECK (coach_slug = current_coach_slug());

CREATE POLICY manifests_owner_update ON public.playback_manifests
  FOR UPDATE TO authenticated
  USING (coach_slug = current_coach_slug())
  WITH CHECK (coach_slug = current_coach_slug());

-- Parent can read a manifest by delivery token (magic-link access, no account)
CREATE POLICY manifests_parent_read_by_token ON public.playback_manifests
  FOR SELECT
  USING (delivery_token_id IS NOT NULL AND delivery_token_id = current_parent_token_id());

CREATE INDEX IF NOT EXISTS idx_manifests_coach_slug ON public.playback_manifests(coach_slug);
CREATE INDEX IF NOT EXISTS idx_manifests_submission_id ON public.playback_manifests(submission_id);

-- ----------------------------------------------------------------------------
-- freeze_frame_notes
-- ----------------------------------------------------------------------------
-- Normalized per-note rows extracted from the playback manifest. Enables
-- per-note transcript updates, autosave, and Deepgram worker queries.
-- FK to playback_manifests; annotations stored as JSONB.

CREATE TABLE IF NOT EXISTS public.freeze_frame_notes (
  id                  TEXT PRIMARY KEY,
  manifest_id         TEXT NOT NULL REFERENCES public.playback_manifests(id) ON DELETE CASCADE,
  submission_id       TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  timecode            NUMERIC(10,3) NOT NULL DEFAULT 0,
  audio_url           TEXT NOT NULL,
  audio_duration      NUMERIC(10,3) NOT NULL,
  thumbnail_url       TEXT,
  transcript          TEXT,
  transcript_raw      TEXT,
  transcript_edited   TEXT,
  transcript_status   transcript_status NOT NULL DEFAULT 'pending',
  transcript_provider TEXT,
  transcript_error    TEXT,
  annotations         JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.freeze_frame_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_owner_select ON public.freeze_frame_notes
  FOR SELECT TO authenticated
  USING (submission_id IN (
    SELECT id FROM public.submissions WHERE coach_slug = current_coach_slug()
  ));

CREATE POLICY notes_owner_insert ON public.freeze_frame_notes
  FOR INSERT TO authenticated
  WITH CHECK (submission_id IN (
    SELECT id FROM public.submissions WHERE coach_slug = current_coach_slug()
  ));

CREATE POLICY notes_owner_update ON public.freeze_frame_notes
  FOR UPDATE TO authenticated
  USING (submission_id IN (
    SELECT id FROM public.submissions WHERE coach_slug = current_coach_slug()
  ))
  WITH CHECK (submission_id IN (
    SELECT id FROM public.submissions WHERE coach_slug = current_coach_slug()
  ));

-- Parent can read notes for their delivered manifest (magic-link access)
CREATE POLICY notes_parent_read_by_token ON public.freeze_frame_notes
  FOR SELECT
  USING (manifest_id IN (
    SELECT id FROM public.playback_manifests
    WHERE delivery_token_id IS NOT NULL
      AND delivery_token_id = current_parent_token_id()
  ));

CREATE INDEX IF NOT EXISTS idx_notes_manifest_id ON public.freeze_frame_notes(manifest_id);
CREATE INDEX IF NOT EXISTS idx_notes_submission_id ON public.freeze_frame_notes(submission_id);
CREATE INDEX IF NOT EXISTS idx_notes_transcript_status ON public.freeze_frame_notes(transcript_status)
  WHERE transcript_status IN ('pending', 'transcribing');

-- ----------------------------------------------------------------------------
-- video_assets
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.video_assets (
  id                TEXT PRIMARY KEY,
  submission_id     TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  coach_slug        TEXT NOT NULL REFERENCES public.coaches(slug) ON DELETE RESTRICT,
  original_filename TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL CHECK (size_bytes > 0),
  storage_key       TEXT NOT NULL,
  storage_provider  storage_provider NOT NULL DEFAULT 'mock',
  duration_sec      NUMERIC(10,3),
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY video_assets_owner_select ON public.video_assets
  FOR SELECT TO authenticated
  USING (coach_slug = current_coach_slug());

CREATE POLICY video_assets_owner_insert ON public.video_assets
  FOR INSERT TO authenticated
  WITH CHECK (coach_slug = current_coach_slug());

CREATE INDEX IF NOT EXISTS idx_video_assets_submission_id ON public.video_assets(submission_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_coach_slug ON public.video_assets(coach_slug);

-- ----------------------------------------------------------------------------
-- audio_assets
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audio_assets (
  id                TEXT PRIMARY KEY,
  note_id           TEXT NOT NULL,
  submission_id     TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  coach_slug        TEXT NOT NULL REFERENCES public.coaches(slug) ON DELETE RESTRICT,
  mime_type         TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL CHECK (size_bytes > 0),
  storage_key       TEXT NOT NULL,
  storage_provider  storage_provider NOT NULL DEFAULT 'mock',
  duration_sec      NUMERIC(10,3) NOT NULL CHECK (duration_sec > 0),
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY audio_assets_owner_select ON public.audio_assets
  FOR SELECT TO authenticated
  USING (coach_slug = current_coach_slug());

CREATE POLICY audio_assets_owner_insert ON public.audio_assets
  FOR INSERT TO authenticated
  WITH CHECK (coach_slug = current_coach_slug());

CREATE INDEX IF NOT EXISTS idx_audio_assets_note_id ON public.audio_assets(note_id);
CREATE INDEX IF NOT EXISTS idx_audio_assets_submission_id ON public.audio_assets(submission_id);

-- ----------------------------------------------------------------------------
-- lesson_delivery_tokens
-- ----------------------------------------------------------------------------
-- Opaque magic-link tokens for parent lesson access. No parent accounts —
-- the token IS the auth. Expires after 30 days (default). Can be revoked.

CREATE TABLE IF NOT EXISTS public.lesson_delivery_tokens (
  id              TEXT PRIMARY KEY,
  submission_id   TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  parent_email    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  viewed_at       TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_delivery_tokens ENABLE ROW LEVEL SECURITY;

-- Coach can manage tokens for their own submissions
CREATE POLICY tokens_owner_select ON public.lesson_delivery_tokens
  FOR SELECT TO authenticated
  USING (submission_id IN (
    SELECT id FROM public.submissions WHERE coach_slug = current_coach_slug()
  ));

CREATE POLICY tokens_owner_insert ON public.lesson_delivery_tokens
  FOR INSERT TO authenticated
  WITH CHECK (submission_id IN (
    SELECT id FROM public.submissions WHERE coach_slug = current_coach_slug()
  ));

CREATE POLICY tokens_owner_update ON public.lesson_delivery_tokens
  FOR UPDATE TO authenticated
  USING (submission_id IN (
    SELECT id FROM public.submissions WHERE coach_slug = current_coach_slug()
  ));

-- Parent can read a token by the token string itself (magic-link auth)
CREATE POLICY tokens_parent_read_by_token ON public.lesson_delivery_tokens
  FOR SELECT
  USING (token = current_parent_token());

CREATE INDEX IF NOT EXISTS idx_tokens_token ON public.lesson_delivery_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_submission_id ON public.lesson_delivery_tokens(submission_id);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON public.lesson_delivery_tokens(expires_at)
  WHERE revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- ai_packaging_jobs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_packaging_jobs (
  id                    TEXT PRIMARY KEY,
  submission_id         TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  status                ai_packaging_job_status NOT NULL DEFAULT 'queued',
  provider              TEXT NOT NULL DEFAULT 'openai',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  error                 TEXT,
  input_transcript_count INTEGER,
  output_summary        TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_packaging_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_jobs_owner_select ON public.ai_packaging_jobs
  FOR SELECT TO authenticated
  USING (submission_id IN (
    SELECT id FROM public.submissions WHERE coach_slug = current_coach_slug()
  ));

CREATE POLICY ai_jobs_owner_update ON public.ai_packaging_jobs
  FOR UPDATE TO authenticated
  USING (submission_id IN (
    SELECT id FROM public.submissions WHERE coach_slug = current_coach_slug()
  ));

CREATE INDEX IF NOT EXISTS idx_ai_jobs_submission_id ON public.ai_packaging_jobs(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON public.ai_packaging_jobs(status)
  WHERE status IN ('queued', 'running');

-- ----------------------------------------------------------------------------
-- Helper functions for RLS (coach slug from JWT, parent token from request)
-- ----------------------------------------------------------------------------

-- Extracts the coach slug from the authenticated user's JWT metadata.
-- In Supabase Auth, the coach's slug is stored in user_metadata.coach_slug.
-- Returns NULL for anon/service_role (service_role bypasses RLS anyway).
CREATE OR REPLACE FUNCTION public.current_coach_slug()
RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::json->>'coach_slug', ''),
    NULLIF(current_setting('request.jwt.claims', true)::json->'user_metadata'->>'coach_slug', '')
  );
$$ LANGUAGE SQL STABLE;

-- Extracts the parent's delivery token ID from the request context.
-- Used by RLS policies for magic-link parent lesson access.
-- Returns NULL when no token is present (denies access).
CREATE OR REPLACE FUNCTION public.current_parent_token_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'delivery_token_id', '');
$$ LANGUAGE SQL STABLE;

-- Extracts the parent's delivery token string from the request context.
CREATE OR REPLACE FUNCTION public.current_parent_token()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'parent_token', '');
$$ LANGUAGE SQL STABLE;

-- ----------------------------------------------------------------------------
-- updated_at triggers for all tables
-- ----------------------------------------------------------------------------

CREATE TRIGGER set_updated_at_coaches
  BEFORE UPDATE ON public.coaches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_submissions
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_earnings
  BEFORE UPDATE ON public.earnings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_playback_manifests
  BEFORE UPDATE ON public.playback_manifests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_freeze_frame_notes
  BEFORE UPDATE ON public.freeze_frame_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_video_assets
  BEFORE UPDATE ON public.video_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_audio_assets
  BEFORE UPDATE ON public.audio_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_lesson_delivery_tokens
  BEFORE UPDATE ON public.lesson_delivery_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_ai_packaging_jobs
  BEFORE UPDATE ON public.ai_packaging_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
