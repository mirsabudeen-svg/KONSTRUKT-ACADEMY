-- Sprint 5: WhatsApp & Communication Intelligence

BEGIN;

CREATE TABLE IF NOT EXISTS public.parent_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  email TEXT,
  relationship VARCHAR(30) DEFAULT 'parent'
    CHECK (relationship IN ('parent', 'guardian', 'sibling')),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  portal_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  portal_token_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  parent_contact_id UUID REFERENCES public.parent_contacts(id) ON DELETE SET NULL,
  message_type VARCHAR(50) NOT NULL,
  message_body TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'skipped')),
  external_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  send_whatsapp BOOLEAN DEFAULT FALSE,
  send_notification BOOLEAN DEFAULT TRUE,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  reach_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  task TEXT,
  xp_reward INT DEFAULT 10,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, briefing_date)
);

CREATE TABLE IF NOT EXISTS public.parent_portal_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_contact_id UUID REFERENCES public.parent_contacts(id) ON DELETE CASCADE,
  portal_token TEXT NOT NULL,
  section VARCHAR(50),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.message_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body_template TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS parent_notification_prefs JSONB NOT NULL DEFAULT '{
    "module_completions": true,
    "weekly_reports": true,
    "login_reminders": true,
    "announcements": true
  }'::jsonb;

CREATE INDEX IF NOT EXISTS idx_parent_contacts_student
  ON public.parent_contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_status
  ON public.whatsapp_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefings_date
  ON public.daily_briefings(student_id, briefing_date DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_cohort
  ON public.announcements(cohort_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_views_token
  ON public.parent_portal_views(portal_token, viewed_at DESC);

ALTER TABLE public.parent_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_portal_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own parent contacts" ON public.parent_contacts;
CREATE POLICY "Students view own parent contacts"
  ON public.parent_contacts FOR SELECT
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Students manage own parent contacts" ON public.parent_contacts;
CREATE POLICY "Students manage own parent contacts"
  ON public.parent_contacts FOR ALL
  USING (student_id = public.clerk_user_id())
  WITH CHECK (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Trainers view parent contacts" ON public.parent_contacts;
CREATE POLICY "Trainers view parent contacts"
  ON public.parent_contacts FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Trainers manage announcements" ON public.announcements;
CREATE POLICY "Trainers manage announcements"
  ON public.announcements FOR ALL
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Students view own briefings" ON public.daily_briefings;
CREATE POLICY "Students view own briefings"
  ON public.daily_briefings FOR SELECT
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Students update own briefings" ON public.daily_briefings;
CREATE POLICY "Students update own briefings"
  ON public.daily_briefings FOR UPDATE
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Trainers view whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Trainers view whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Admins manage message templates" ON public.message_templates;
CREATE POLICY "Admins manage message templates"
  ON public.message_templates FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Trainers view message templates" ON public.message_templates;
CREATE POLICY "Trainers view message templates"
  ON public.message_templates FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Service role manages parent contacts" ON public.parent_contacts;
CREATE POLICY "Service role manages parent contacts"
  ON public.parent_contacts FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Service role manages whatsapp messages"
  ON public.whatsapp_messages FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages announcements" ON public.announcements;
CREATE POLICY "Service role manages announcements"
  ON public.announcements FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages daily briefings" ON public.daily_briefings;
CREATE POLICY "Service role manages daily briefings"
  ON public.daily_briefings FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages portal views" ON public.parent_portal_views;
CREATE POLICY "Service role manages portal views"
  ON public.parent_portal_views FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages message templates" ON public.message_templates;
CREATE POLICY "Service role manages message templates"
  ON public.message_templates FOR ALL
  WITH CHECK (true);

INSERT INTO public.message_templates (id, title, body_template) VALUES
  ('module_complete', 'Module Completed',
   '🎉 Great news! {{student_name}} just completed *{{module_title}}* on KONSTRUKT Academy!\n\n📊 Score: {{score}}/100\n🏅 Badge Earned: {{badge_name}}\n\nKeep up the amazing work! 💪\n\nView progress: {{portal_link}}'),
  ('weekly_progress', 'Weekly Progress Report',
   '📊 *Weekly Progress Report*\nStudent: {{student_name}}\nWeek: {{date_range}}\n\n✅ Modules Completed: {{modules_completed}}\n⚡ XP Earned: {{xp_earned}} XP\n🔥 Current Streak: {{streak}} days\n🏅 New Badges: {{badges}}\n📈 Overall Progress: {{progress}}/10 modules\n\nNext Mission: {{next_mission}}\n\nKeep encouraging them! 🚀'),
  ('login_reminder', 'Login Reminder',
   '👋 Hi {{parent_name}}!\n\n{{student_name}} hasn''t visited KONSTRUKT Academy in {{inactive_days}} days.\n\nEncourage them to log in and continue their robotics journey! 🤖\n\nCurrent progress: {{progress}}/10 modules\n\nLogin: {{app_url}}'),
  ('certificate', 'Graduation Certificate',
   '🎓 *CONGRATULATIONS!*\n\n{{student_name}} has officially become a *Certified KONTRAKTOR*! 🏆\n\nThey completed all 10 modules of the KONSTRUKT Robotics Academy program.\n\n🎖️ Final Achievement: Certified Kontraktor\n📊 Total Score: {{total_score}}/1000\n⚡ Total XP: {{total_xp}}\n\nWe''re incredibly proud of their journey!\n\nDownload Certificate: {{certificate_link}}')
ON CONFLICT (id) DO NOTHING;

COMMIT;
