-- =============================================================================
-- KONSTRUKT Robotics Academy — Foundation Schema (PRD + Database_and_API_Map)
-- Migration: 002_foundation_prd_schema.sql
-- =============================================================================
--
-- Run in Supabase Dashboard → SQL Editor (single execution).
--
-- Prerequisites:
--   • Clerk JWT template named "supabase" with claims: sub, role (authenticated)
--   • Backup existing data if upgrading from 001_schema.sql
--
-- This migration:
--   • Defines Postgres ENUMs for progress, submissions, and print_queue status
--   • Creates cohorts, users, modules, progress, submissions, print_queue
--   • Applies ON DELETE CASCADE on all student/user child FKs
--   • Enables RLS: students → own rows; trainers → their cohort; admins → all
--
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM types (prevents status typos)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('student', 'trainer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.mission_layer AS ENUM ('THINK', 'DESIGN', 'BUILD', 'OPERATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.progress_status AS ENUM (
    'locked',
    'ready',
    'in_progress',
    'pending_review',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.submission_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.print_queue_status AS ENUM (
    'waiting_for_printer',
    'printing',
    'failed',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.submission_type AS ENUM (
    'quiz',
    'prompt_text',
    'stl_file',
    'video_demo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tear down Phase 1 objects (safe re-run on dev; comment out if preserving data)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.print_queue CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.progress CASCADE;
DROP TABLE IF EXISTS public.modules CASCADE;
DROP TABLE IF EXISTS public.cohorts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop legacy helper functions (recreated below)
DROP FUNCTION IF EXISTS public.is_trainer_or_admin();
DROP FUNCTION IF EXISTS public.clerk_user_id();

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

-- Users first (cohort FK added after cohorts exists)
CREATE TABLE public.users (
  id              TEXT PRIMARY KEY,  -- Clerk user id
  role            public.user_role NOT NULL DEFAULT 'student',
  cohort_id       UUID,
  tokens_remaining INT NOT NULL DEFAULT 10 CHECK (tokens_remaining >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.cohorts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  start_date  DATE,
  trainer_id  TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users
  ADD CONSTRAINT users_cohort_id_fkey
  FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id) ON DELETE SET NULL;

CREATE INDEX idx_users_cohort_id ON public.users(cohort_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_cohorts_trainer_id ON public.cohorts(trainer_id);

-- 10-day mission catalog
CREATE TABLE public.modules (
  id                INT PRIMARY KEY CHECK (id >= 1 AND id <= 10),
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  mission_layer     public.mission_layer,
  badge_name        VARCHAR(100) NOT NULL,
  required_hardware TEXT[] NOT NULL DEFAULT '{}',
  sort_order        INT NOT NULL UNIQUE CHECK (sort_order >= 1 AND sort_order <= 10)
);

-- Per-student unlock / completion state
CREATE TABLE public.progress (
  student_id  TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id   INT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  status      public.progress_status NOT NULL DEFAULT 'locked',
  score       INT CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, module_id)
);

CREATE INDEX idx_progress_student_id ON public.progress(student_id);
CREATE INDEX idx_progress_status ON public.progress(status);

-- Learner evidence (quiz, prompts, STL, video)
CREATE TABLE public.submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id        INT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  submission_type  public.submission_type NOT NULL,
  content_url      TEXT,
  status           public.submission_status NOT NULL DEFAULT 'pending',
  trainer_feedback TEXT,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      TEXT REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX idx_submissions_module_id ON public.submissions(module_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);

-- Bambu Lab A1 Mini print pipeline
CREATE TABLE public.print_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  submission_id     UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  status            public.print_queue_status NOT NULL DEFAULT 'waiting_for_printer',
  printer_assigned  VARCHAR(50) NOT NULL DEFAULT 'Bambu_A1_Mini',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_print_queue_student_id ON public.print_queue(student_id);
CREATE INDEX idx_print_queue_status ON public.print_queue(status);
CREATE INDEX idx_print_queue_submission_id ON public.print_queue(submission_id);

-- ---------------------------------------------------------------------------
-- Triggers: auto-update timestamps
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON public.progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_print_queue_updated_at
  BEFORE UPDATE ON public.print_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth helper functions (Clerk JWT → Supabase RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '');
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.id = public.clerk_user_id();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin'::public.user_role;
$$;

CREATE OR REPLACE FUNCTION public.is_trainer_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('trainer'::public.user_role, 'admin'::public.user_role);
$$;

-- Trainer may access a student in a cohort they own; admin may access anyone
CREATE OR REPLACE FUNCTION public.trainer_can_access_student(p_student_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users student
      JOIN public.cohorts c ON c.id = student.cohort_id
      WHERE student.id = p_student_id
        AND c.trainer_id = public.clerk_user_id()
        AND public.current_user_role() = 'trainer'::public.user_role
    );
$$;

CREATE OR REPLACE FUNCTION public.can_read_cohort(p_cohort_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = public.clerk_user_id()
        AND u.cohort_id = p_cohort_id
    )
    OR EXISTS (
      SELECT 1 FROM public.cohorts c
      WHERE c.id = p_cohort_id
        AND c.trainer_id = public.clerk_user_id()
    );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_queue ENABLE ROW LEVEL SECURITY;

-- ---- users ----
CREATE POLICY users_select ON public.users
  FOR SELECT
  USING (
    id = public.clerk_user_id()
    OR public.is_admin()
    OR public.trainer_can_access_student(id)
  );

-- Trainers/admins may update students in their scope (token refill, cohort assign)
CREATE POLICY users_trainer_admin_update ON public.users
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.trainer_can_access_student(id)
  )
  WITH CHECK (
    public.is_admin()
    OR public.trainer_can_access_student(id)
  );

-- ---- cohorts ----
CREATE POLICY cohorts_select ON public.cohorts
  FOR SELECT
  USING (public.can_read_cohort(id));

CREATE POLICY cohorts_admin_insert ON public.cohorts
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY cohorts_admin_update ON public.cohorts
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY cohorts_admin_delete ON public.cohorts
  FOR DELETE
  USING (public.is_admin());

-- Trainers may update cohorts they lead (e.g. start_date)
CREATE POLICY cohorts_trainer_update_own ON public.cohorts
  FOR UPDATE
  USING (trainer_id = public.clerk_user_id())
  WITH CHECK (trainer_id = public.clerk_user_id());

-- ---- modules (read-only catalog for all authenticated users) ----
CREATE POLICY modules_select ON public.modules
  FOR SELECT
  USING (public.clerk_user_id() IS NOT NULL);

CREATE POLICY modules_admin_write ON public.modules
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---- progress ----
CREATE POLICY progress_select ON public.progress
  FOR SELECT
  USING (
    student_id = public.clerk_user_id()
    OR public.trainer_can_access_student(student_id)
    OR public.is_admin()
  );

CREATE POLICY progress_insert_own ON public.progress
  FOR INSERT
  WITH CHECK (student_id = public.clerk_user_id());

CREATE POLICY progress_update_student ON public.progress
  FOR UPDATE
  USING (student_id = public.clerk_user_id())
  WITH CHECK (student_id = public.clerk_user_id());

CREATE POLICY progress_trainer_admin_update ON public.progress
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.trainer_can_access_student(student_id)
  )
  WITH CHECK (
    public.is_admin()
    OR public.trainer_can_access_student(student_id)
  );

-- ---- submissions ----
CREATE POLICY submissions_select ON public.submissions
  FOR SELECT
  USING (
    student_id = public.clerk_user_id()
    OR public.trainer_can_access_student(student_id)
    OR public.is_admin()
  );

CREATE POLICY submissions_insert_own ON public.submissions
  FOR INSERT
  WITH CHECK (
    student_id = public.clerk_user_id()
    AND status = 'pending'::public.submission_status
  );

-- Students may update only while still pending (e.g. fix upload URL)
CREATE POLICY submissions_update_student_pending ON public.submissions
  FOR UPDATE
  USING (
    student_id = public.clerk_user_id()
    AND status = 'pending'::public.submission_status
  )
  WITH CHECK (
    student_id = public.clerk_user_id()
    AND status = 'pending'::public.submission_status
  );

CREATE POLICY submissions_trainer_admin_review ON public.submissions
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.trainer_can_access_student(student_id)
  )
  WITH CHECK (
    public.is_admin()
    OR public.trainer_can_access_student(student_id)
  );

-- ---- print_queue ----
CREATE POLICY print_queue_select ON public.print_queue
  FOR SELECT
  USING (
    student_id = public.clerk_user_id()
    OR public.trainer_can_access_student(student_id)
    OR public.is_admin()
  );

CREATE POLICY print_queue_insert_own ON public.print_queue
  FOR INSERT
  WITH CHECK (student_id = public.clerk_user_id());

CREATE POLICY print_queue_trainer_admin_update ON public.print_queue
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.trainer_can_access_student(student_id)
  )
  WITH CHECK (
    public.is_admin()
    OR public.trainer_can_access_student(student_id)
  );

CREATE POLICY print_queue_trainer_admin_delete ON public.print_queue
  FOR DELETE
  USING (
    public.is_admin()
    OR public.trainer_can_access_student(student_id)
  );

COMMIT;

-- =============================================================================
-- Post-migration: re-run seed (supabase/seed.sql) to populate modules
-- Webhook / ensureStudentProfile will recreate users + progress rows
-- =============================================================================
