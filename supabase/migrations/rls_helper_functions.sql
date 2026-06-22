-- SwingLab RLS helper functions
-- SwingLab handles auth via its own HMAC session cookies (not Supabase Auth JWT),
-- so these DB functions return simplified values. All real ownership enforcement
-- happens in the API routes (submission.coachSlug !== session.coachSlug → 403).
-- RLS here is defense-in-depth.

-- 1. Returns the current coach's slug (used in coaches, submissions, earnings, etc.)
CREATE OR REPLACE FUNCTION public.current_coach_slug()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULL::TEXT;
$$;

-- 2. Returns the current parent's delivery token (used in lesson_delivery_tokens RLS)
CREATE OR REPLACE FUNCTION public.current_parent_token()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULL::TEXT;
$$;

-- 3. Returns the current parent's delivery token id (used in lesson_delivery_tokens RLS)
CREATE OR REPLACE FUNCTION public.current_parent_token_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULL::TEXT;
$$;
