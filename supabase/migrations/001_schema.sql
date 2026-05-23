-- KONSTRUKT Robotics Academy — core schema + RLS
-- Run in Supabase SQL Editor (or via CLI). Requires Clerk JWT with `sub` = user id.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'trainer', 'admin')),
  tokens_remaining INT NOT NULL DEFAULT 10 CHECK (tokens_remaining >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id INT PRIMARY KEY CHECK (id >= 1 AND id <= 10),
  title TEXT NOT NULL,
  description TEXT,
  badge_name TEXT NOT NULL,
  sort_order INT NOT NULL UNIQUE CHECK (sort_order >= 1 AND sort_order <= 10)
);

CREATE TABLE IF NOT EXISTS progress (
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id INT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'locked'
    CHECK (status IN ('locked', 'in_progress', 'completed')),
  score INT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, module_id)
);

CREATE TABLE IF NOT EXISTS print_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_trainer'
    CHECK (status IN ('pending_trainer', 'approved', 'printing', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '');
$$;

CREATE OR REPLACE FUNCTION public.is_trainer_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = public.clerk_user_id()
      AND u.role IN ('trainer', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_queue ENABLE ROW LEVEL SECURITY;

-- Users: read/update own row; trainers read all
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users FOR SELECT
  USING (id = public.clerk_user_id() OR public.is_trainer_or_admin());

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users FOR UPDATE
  USING (id = public.clerk_user_id())
  WITH CHECK (id = public.clerk_user_id());

-- Modules: curriculum catalog (read-only for all clients with valid JWT)
DROP POLICY IF EXISTS modules_select_all ON modules;
CREATE POLICY modules_select_all ON modules FOR SELECT
  USING (true);

-- Progress: students manage own rows; trainers read all
DROP POLICY IF EXISTS progress_select ON progress;
CREATE POLICY progress_select ON progress FOR SELECT
  USING (student_id = public.clerk_user_id() OR public.is_trainer_or_admin());

DROP POLICY IF EXISTS progress_insert_own ON progress;
CREATE POLICY progress_insert_own ON progress FOR INSERT
  WITH CHECK (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS progress_update_own ON progress;
CREATE POLICY progress_update_own ON progress FOR UPDATE
  USING (student_id = public.clerk_user_id())
  WITH CHECK (student_id = public.clerk_user_id());

-- Print queue: students see own; trainers see all (Phase 4)
DROP POLICY IF EXISTS print_queue_select ON print_queue;
CREATE POLICY print_queue_select ON print_queue FOR SELECT
  USING (student_id = public.clerk_user_id() OR public.is_trainer_or_admin());

DROP POLICY IF EXISTS print_queue_insert_own ON print_queue;
CREATE POLICY print_queue_insert_own ON print_queue FOR INSERT
  WITH CHECK (student_id = public.clerk_user_id());

-- Service role bypasses RLS (webhooks / admin scripts only).
