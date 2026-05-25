-- Sprint 1: XP System, Leveling & Streak Engine

BEGIN;

CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  xp_earned INT NOT NULL,
  module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.streaks (
  student_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
  xp_reward INT NOT NULL DEFAULT 50,
  deadline TIMESTAMPTZ,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_challenges (
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('accepted', 'completed', 'expired')),
  PRIMARY KEY (student_id, challenge_id)
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS total_xp INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level VARCHAR(50) NOT NULL DEFAULT 'Rookie Builder',
  ADD COLUMN IF NOT EXISTS current_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_date DATE;

CREATE INDEX IF NOT EXISTS idx_xp_student ON public.xp_events(student_id);
CREATE INDEX IF NOT EXISTS idx_xp_created ON public.xp_events(created_at);
CREATE INDEX IF NOT EXISTS idx_challenges_cohort ON public.challenges(cohort_id);
CREATE INDEX IF NOT EXISTS idx_student_challenges_student ON public.student_challenges(student_id);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own xp" ON public.xp_events;
CREATE POLICY "Students view own xp"
  ON public.xp_events FOR SELECT
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Service role manages xp" ON public.xp_events;
CREATE POLICY "Service role manages xp"
  ON public.xp_events FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Students view own streak" ON public.streaks;
CREATE POLICY "Students view own streak"
  ON public.streaks FOR SELECT
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Service role manages streaks" ON public.streaks;
CREATE POLICY "Service role manages streaks"
  ON public.streaks FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Students view cohort challenges" ON public.challenges;
CREATE POLICY "Students view cohort challenges"
  ON public.challenges FOR SELECT
  USING (
    cohort_id IN (
      SELECT u.cohort_id FROM public.users u
      WHERE u.id = public.clerk_user_id()
    )
    OR public.is_trainer_or_admin()
  );

DROP POLICY IF EXISTS "Trainers create challenges" ON public.challenges;
CREATE POLICY "Trainers create challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Students view own challenge progress" ON public.student_challenges;
CREATE POLICY "Students view own challenge progress"
  ON public.student_challenges FOR SELECT
  USING (
    student_id = public.clerk_user_id()
    OR public.is_trainer_or_admin()
  );

DROP POLICY IF EXISTS "Students accept challenges" ON public.student_challenges;
CREATE POLICY "Students accept challenges"
  ON public.student_challenges FOR INSERT
  WITH CHECK (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Service role manages student challenges" ON public.student_challenges;
CREATE POLICY "Service role manages student challenges"
  ON public.student_challenges FOR ALL
  WITH CHECK (true);

COMMIT;
