-- Sprint 4: Admin Analytics & Intelligence Center

BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active_students INT DEFAULT 0,
  total_submissions INT DEFAULT 0,
  total_approvals INT DEFAULT 0,
  total_rejections INT DEFAULT 0,
  tokens_used INT DEFAULT 0,
  tutor_conversations INT DEFAULT 0,
  avg_score FLOAT DEFAULT 0,
  UNIQUE(stat_date)
);

CREATE TABLE IF NOT EXISTS public.curriculum_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id INT REFERENCES public.modules(id) ON DELETE CASCADE,
  avg_score FLOAT,
  avg_completion_days INT,
  total_attempts INT,
  rejection_rate FLOAT,
  dropout_rate FLOAT,
  difficulty_flag BOOLEAN DEFAULT FALSE,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.token_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  usage_type VARCHAR(50) NOT NULL,
  tokens_used INT DEFAULT 1,
  module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.token_refill_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stats_date
  ON public.platform_stats(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_token_student
  ON public.token_usage_log(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curriculum_module
  ON public.curriculum_insights(module_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_refill_student
  ON public.token_refill_log(student_id, created_at DESC);

ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_refill_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view platform stats" ON public.platform_stats;
CREATE POLICY "Admins view platform stats"
  ON public.platform_stats FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins view curriculum insights" ON public.curriculum_insights;
CREATE POLICY "Admins view curriculum insights"
  ON public.curriculum_insights FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins view token usage" ON public.token_usage_log;
CREATE POLICY "Admins view token usage"
  ON public.token_usage_log FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Admins view token refills" ON public.token_refill_log;
CREATE POLICY "Admins view token refills"
  ON public.token_refill_log FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings"
  ON public.platform_settings FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Service role manages platform stats" ON public.platform_stats;
CREATE POLICY "Service role manages platform stats"
  ON public.platform_stats FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages curriculum insights" ON public.curriculum_insights;
CREATE POLICY "Service role manages curriculum insights"
  ON public.curriculum_insights FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages token usage log" ON public.token_usage_log;
CREATE POLICY "Service role manages token usage log"
  ON public.token_usage_log FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages token refill log" ON public.token_refill_log;
CREATE POLICY "Service role manages token refill log"
  ON public.token_refill_log FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages platform settings" ON public.platform_settings;
CREATE POLICY "Service role manages platform settings"
  ON public.platform_settings FOR ALL
  WITH CHECK (true);

INSERT INTO public.platform_settings (key, value) VALUES
  ('tokens', '{"defaultForNewStudents":10,"maxPerStudent":20,"autoRefillThreshold":2}'::jsonb),
  ('modules', '{"enabled":[1,2,3,4,5,6,7,8,9,10],"order":[1,2,3,4,5,6,7,8,9,10],"unlockDelayDays":0}'::jsonb),
  ('ai', '{"model":"gpt-4o-mini","tutorMaxResponseLength":500,"codeReviewSensitivity":"medium","proactiveHintDelayDays":3}'::jsonb),
  ('platform', '{"academyName":"KONSTRUKT Academy","contactEmail":"admin@konstrukt.io","supportWhatsApp":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
