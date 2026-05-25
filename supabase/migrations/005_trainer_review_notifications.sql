  -- Trainer review flow: submission feedback/score + student notifications
  BEGIN;

  ALTER TABLE public.submissions
    ADD COLUMN IF NOT EXISTS feedback TEXT,
    ADD COLUMN IF NOT EXISTS score INT CHECK (score IS NULL OR (score >= 0 AND score <= 100));

  CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    module_id INT REFERENCES public.modules(id) ON DELETE SET NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON public.notifications(student_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Students see own notifications" ON public.notifications;
  CREATE POLICY "Students see own notifications"
    ON public.notifications FOR SELECT
    USING (student_id = public.clerk_user_id());

  DROP POLICY IF EXISTS "Service role inserts notifications" ON public.notifications;
  CREATE POLICY "Service role inserts notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

  DROP POLICY IF EXISTS "Students update own notifications" ON public.notifications;
  CREATE POLICY "Students update own notifications"
    ON public.notifications FOR UPDATE
    USING (student_id = public.clerk_user_id());

  COMMIT;
