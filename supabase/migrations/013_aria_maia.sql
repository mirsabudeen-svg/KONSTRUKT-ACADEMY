-- Sprint 9A: ARIA Admin AI + MAIA Marketing AI

BEGIN;

-- ---------------------------------------------------------------------------
-- ARIA tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aria_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  context_type VARCHAR(50),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  response_time_ms INT,
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aria_conversations_admin
  ON public.aria_conversations(admin_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_checked
  ON public.system_health_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_type
  ON public.system_health_logs(check_type, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status
  ON public.maintenance_tasks(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- MAIA tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maia_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  campaign_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  content_type VARCHAR(50) NOT NULL,
  platform VARCHAR(50),
  title TEXT,
  content TEXT NOT NULL,
  tone VARCHAR(30) DEFAULT 'professional',
  target_audience VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft',
  performance_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  goal VARCHAR(50),
  target_audience VARCHAR(50),
  channels JSONB DEFAULT '[]'::jsonb,
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  status VARCHAR(20) DEFAULT 'planning',
  plan_content TEXT,
  content_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  source VARCHAR(50),
  contact_name TEXT,
  notes TEXT,
  converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maia_conversations_admin
  ON public.maia_conversations(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_content_type
  ON public.marketing_content(content_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_content_status
  ON public.marketing_content(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status
  ON public.marketing_campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_enquiries_source
  ON public.marketing_enquiries(source, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.aria_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maia_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage aria conversations" ON public.aria_conversations;
CREATE POLICY "Admins manage aria conversations"
  ON public.aria_conversations FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins view health logs" ON public.system_health_logs;
CREATE POLICY "Admins view health logs"
  ON public.system_health_logs FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage maintenance" ON public.maintenance_tasks;
CREATE POLICY "Admins manage maintenance"
  ON public.maintenance_tasks FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage maia" ON public.maia_conversations;
CREATE POLICY "Admins manage maia"
  ON public.maia_conversations FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage content" ON public.marketing_content;
CREATE POLICY "Admins manage content"
  ON public.marketing_content FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage campaigns" ON public.marketing_campaigns;
CREATE POLICY "Admins manage campaigns"
  ON public.marketing_campaigns FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage enquiries" ON public.marketing_enquiries;
CREATE POLICY "Admins manage enquiries"
  ON public.marketing_enquiries FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Service role manages aria" ON public.aria_conversations;
CREATE POLICY "Service role manages aria"
  ON public.aria_conversations FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages health logs" ON public.system_health_logs;
CREATE POLICY "Service role manages health logs"
  ON public.system_health_logs FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages maintenance tasks" ON public.maintenance_tasks;
CREATE POLICY "Service role manages maintenance tasks"
  ON public.maintenance_tasks FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages maia" ON public.maia_conversations;
CREATE POLICY "Service role manages maia"
  ON public.maia_conversations FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages marketing content" ON public.marketing_content;
CREATE POLICY "Service role manages marketing content"
  ON public.marketing_content FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages marketing campaigns" ON public.marketing_campaigns;
CREATE POLICY "Service role manages marketing campaigns"
  ON public.marketing_campaigns FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages marketing enquiries" ON public.marketing_enquiries;
CREATE POLICY "Service role manages marketing enquiries"
  ON public.marketing_enquiries FOR ALL
  WITH CHECK (true);

COMMIT;
