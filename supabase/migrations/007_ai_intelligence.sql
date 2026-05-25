-- Sprint 2: AI Intelligence Layer — tutor memory, code reviews, learning alerts

BEGIN;

CREATE TABLE IF NOT EXISTS public.tutor_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
  memory_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.code_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
  ai_score INT CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100)),
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  hardware_violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  positive_feedback TEXT,
  summary TEXT,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.learning_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trainer_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS ai_warning BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trainer_notes TEXT,
  ADD COLUMN IF NOT EXISTS ai_pre_score INT CHECK (ai_pre_score IS NULL OR (ai_pre_score >= 0 AND ai_pre_score <= 100));

CREATE INDEX IF NOT EXISTS idx_memory_student ON public.tutor_memory(student_id);
CREATE INDEX IF NOT EXISTS idx_memory_student_module ON public.tutor_memory(student_id, module_id);
CREATE INDEX IF NOT EXISTS idx_code_reviews_submission ON public.code_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_code_reviews_student ON public.code_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON public.learning_alerts(resolved, created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_student ON public.learning_alerts(student_id);

ALTER TABLE public.tutor_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own memory" ON public.tutor_memory;
CREATE POLICY "Students view own memory"
  ON public.tutor_memory FOR SELECT
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Service role manages tutor memory" ON public.tutor_memory;
CREATE POLICY "Service role manages tutor memory"
  ON public.tutor_memory FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Students view own reviews" ON public.code_reviews;
CREATE POLICY "Students view own reviews"
  ON public.code_reviews FOR SELECT
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Trainers view cohort code reviews" ON public.code_reviews;
CREATE POLICY "Trainers view cohort code reviews"
  ON public.code_reviews FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Service role manages code reviews" ON public.code_reviews;
CREATE POLICY "Service role manages code reviews"
  ON public.code_reviews FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Trainers view cohort alerts" ON public.learning_alerts;
CREATE POLICY "Trainers view cohort alerts"
  ON public.learning_alerts FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Trainers update cohort alerts" ON public.learning_alerts;
CREATE POLICY "Trainers update cohort alerts"
  ON public.learning_alerts FOR UPDATE
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Service role manages learning alerts" ON public.learning_alerts;
CREATE POLICY "Service role manages learning alerts"
  ON public.learning_alerts FOR ALL
  WITH CHECK (true);

COMMIT;
