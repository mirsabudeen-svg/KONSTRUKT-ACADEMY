-- Sprint 6: Hardware Intelligence — print jobs, code simulations, design prompts

BEGIN;

CREATE TABLE IF NOT EXISTS public.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
  module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
  file_url TEXT,
  file_name TEXT,
  estimated_print_minutes INT,
  actual_print_minutes INT,
  material VARCHAR(50) DEFAULT 'PLA',
  weight_grams FLOAT,
  printer VARCHAR(50) DEFAULT 'Bambu_A1_Mini',
  status VARCHAR(30) DEFAULT 'queued',
  validation_passed BOOLEAN,
  validation_issues JSONB DEFAULT '[]'::jsonb,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.code_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  simulation_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.design_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
  what TEXT,
  style TEXT,
  details TEXT,
  generated_prompt TEXT,
  meshy_job_id TEXT,
  result_url TEXT,
  tokens_used INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_status
  ON public.print_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_print_jobs_student
  ON public.print_jobs(student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_simulations_student
  ON public.code_simulations(student_id, module_id);
CREATE INDEX IF NOT EXISTS idx_design_prompts_student
  ON public.design_prompts(student_id, module_id);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own print jobs" ON public.print_jobs;
CREATE POLICY "Students view own print jobs"
  ON public.print_jobs FOR SELECT
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Students insert own print jobs" ON public.print_jobs;
CREATE POLICY "Students insert own print jobs"
  ON public.print_jobs FOR INSERT
  WITH CHECK (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Trainers manage print jobs" ON public.print_jobs;
CREATE POLICY "Trainers manage print jobs"
  ON public.print_jobs FOR ALL
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Service role manages print jobs" ON public.print_jobs;
CREATE POLICY "Service role manages print jobs"
  ON public.print_jobs FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Students manage own simulations" ON public.code_simulations;
CREATE POLICY "Students manage own simulations"
  ON public.code_simulations FOR ALL
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Trainers view simulations" ON public.code_simulations;
CREATE POLICY "Trainers view simulations"
  ON public.code_simulations FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Service role manages simulations" ON public.code_simulations;
CREATE POLICY "Service role manages simulations"
  ON public.code_simulations FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Students manage own prompts" ON public.design_prompts;
CREATE POLICY "Students manage own prompts"
  ON public.design_prompts FOR ALL
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Trainers view design prompts" ON public.design_prompts;
CREATE POLICY "Trainers view design prompts"
  ON public.design_prompts FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Service role manages design prompts" ON public.design_prompts;
CREATE POLICY "Service role manages design prompts"
  ON public.design_prompts FOR ALL
  WITH CHECK (true);

COMMIT;
