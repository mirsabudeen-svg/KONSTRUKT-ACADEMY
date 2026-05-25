-- Sprint 3: Trainer Intelligence Tools

BEGIN;

CREATE TABLE IF NOT EXISTS public.trainer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type VARCHAR(30) NOT NULL DEFAULT 'general'
    CHECK (note_type IN ('general', 'concern', 'achievement', 'reminder')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bulk_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_duration_minutes INT;

CREATE INDEX IF NOT EXISTS idx_notes_student ON public.trainer_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_trainer ON public.trainer_notes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_bulk_messages_trainer ON public.bulk_messages(trainer_id);

ALTER TABLE public.trainer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers manage own notes" ON public.trainer_notes;
CREATE POLICY "Trainers manage own notes"
  ON public.trainer_notes FOR ALL
  USING (trainer_id = public.clerk_user_id())
  WITH CHECK (trainer_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Trainers view cohort notes" ON public.trainer_notes;
CREATE POLICY "Trainers view cohort notes"
  ON public.trainer_notes FOR SELECT
  USING (public.is_trainer_or_admin());

DROP POLICY IF EXISTS "Trainers manage own messages" ON public.bulk_messages;
CREATE POLICY "Trainers manage own messages"
  ON public.bulk_messages FOR ALL
  USING (trainer_id = public.clerk_user_id())
  WITH CHECK (trainer_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Service role manages trainer notes" ON public.trainer_notes;
CREATE POLICY "Service role manages trainer notes"
  ON public.trainer_notes FOR ALL
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages bulk messages" ON public.bulk_messages;
CREATE POLICY "Service role manages bulk messages"
  ON public.bulk_messages FOR ALL
  WITH CHECK (true);

COMMIT;
