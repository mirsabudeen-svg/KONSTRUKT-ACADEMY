-- Sprint 7: Safety & Moderation System

BEGIN;

CREATE TABLE IF NOT EXISTS public.safety_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  flag_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'low'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  source VARCHAR(50) NOT NULL,
  content_snippet TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  active_minutes INT DEFAULT 0,
  idle_minutes INT DEFAULT 0,
  pages_visited JSONB DEFAULT '[]'::jsonb,
  actions_count INT DEFAULT 0,
  break_suggested BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.content_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_type VARCHAR(50) NOT NULL,
  value TEXT NOT NULL,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plagiarism_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
  similarity_score FLOAT DEFAULT 0,
  matched_submissions JSONB DEFAULT '[]'::jsonb,
  ai_generated_probability FLOAT DEFAULT 0,
  flagged BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flags_severity
  ON public.safety_flags(severity, resolved);
CREATE INDEX IF NOT EXISTS idx_flags_student
  ON public.safety_flags(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plagiarism_module
  ON public.plagiarism_checks(module_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_submission
  ON public.plagiarism_checks(submission_id);
CREATE INDEX IF NOT EXISTS idx_session_student
  ON public.session_logs(student_id, session_start DESC);

ALTER TABLE public.safety_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plagiarism_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage safety flags" ON public.safety_flags;
CREATE POLICY "Admins manage safety flags"
  ON public.safety_flags FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Trainers view safety flags" ON public.safety_flags;
CREATE POLICY "Trainers view safety flags"
  ON public.safety_flags FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Trainers update safety flags" ON public.safety_flags;
CREATE POLICY "Trainers update safety flags"
  ON public.safety_flags FOR UPDATE
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Students report safety flags" ON public.safety_flags;
CREATE POLICY "Students report safety flags"
  ON public.safety_flags FOR INSERT
  WITH CHECK (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Service role manages safety flags" ON public.safety_flags;
CREATE POLICY "Service role manages safety flags"
  ON public.safety_flags FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Students view own sessions" ON public.session_logs;
CREATE POLICY "Students view own sessions"
  ON public.session_logs FOR SELECT
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Students manage own sessions" ON public.session_logs;
CREATE POLICY "Students manage own sessions"
  ON public.session_logs FOR ALL
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Trainers view session logs" ON public.session_logs;
CREATE POLICY "Trainers view session logs"
  ON public.session_logs FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Service role manages session logs" ON public.session_logs;
CREATE POLICY "Service role manages session logs"
  ON public.session_logs FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage content filters" ON public.content_filters;
CREATE POLICY "Admins manage content filters"
  ON public.content_filters FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Trainers view content filters" ON public.content_filters;
CREATE POLICY "Trainers view content filters"
  ON public.content_filters FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Service role manages content filters" ON public.content_filters;
CREATE POLICY "Service role manages content filters"
  ON public.content_filters FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Trainers view plagiarism checks" ON public.plagiarism_checks;
CREATE POLICY "Trainers view plagiarism checks"
  ON public.plagiarism_checks FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Students view own plagiarism checks" ON public.plagiarism_checks;
CREATE POLICY "Students view own plagiarism checks"
  ON public.plagiarism_checks FOR SELECT
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Service role manages plagiarism checks" ON public.plagiarism_checks;
CREATE POLICY "Service role manages plagiarism checks"
  ON public.plagiarism_checks FOR ALL
  WITH CHECK (true);

INSERT INTO public.platform_settings (key, value) VALUES
  ('safety', '{
    "contentScanningEnabled": true,
    "plagiarismDetectionEnabled": true,
    "sessionBreakMinutes": 45,
    "idleDetectionMinutes": 15,
    "aiGenerationThreshold": 0.80,
    "similarityThreshold": 0.85,
    "autoBlockHighSeverity": true,
    "notifyTrainerOnFlags": true
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
