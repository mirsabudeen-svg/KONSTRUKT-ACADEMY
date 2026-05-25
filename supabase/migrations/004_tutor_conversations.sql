-- KONSTRUKT AI Tutor — conversations + messages (Clerk JWT RLS)
-- Requires clerk_user_id() from 002_foundation_prd_schema.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.tutor_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id   INT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tutor_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES public.tutor_conversations(id) ON DELETE CASCADE,
  role              VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content           TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_conversations_student_module
  ON public.tutor_conversations(student_id, module_id);

CREATE INDEX IF NOT EXISTS idx_tutor_messages_conversation_id
  ON public.tutor_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_tutor_messages_created_at
  ON public.tutor_messages(created_at);

CREATE OR REPLACE FUNCTION public.set_tutor_conversation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tutor_conversations_updated_at ON public.tutor_conversations;
CREATE TRIGGER trg_tutor_conversations_updated_at
  BEFORE UPDATE ON public.tutor_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_tutor_conversation_updated_at();

ALTER TABLE public.tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tutor_conversations_select_own ON public.tutor_conversations;
CREATE POLICY tutor_conversations_select_own ON public.tutor_conversations
  FOR SELECT
  USING (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS tutor_conversations_insert_own ON public.tutor_conversations;
CREATE POLICY tutor_conversations_insert_own ON public.tutor_conversations
  FOR INSERT
  WITH CHECK (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS tutor_conversations_update_own ON public.tutor_conversations;
CREATE POLICY tutor_conversations_update_own ON public.tutor_conversations
  FOR UPDATE
  USING (student_id = public.clerk_user_id())
  WITH CHECK (student_id = public.clerk_user_id());

DROP POLICY IF EXISTS tutor_messages_select_own ON public.tutor_messages;
CREATE POLICY tutor_messages_select_own ON public.tutor_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.tutor_conversations
      WHERE student_id = public.clerk_user_id()
    )
  );

DROP POLICY IF EXISTS tutor_messages_insert_own ON public.tutor_messages;
CREATE POLICY tutor_messages_insert_own ON public.tutor_messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.tutor_conversations
      WHERE student_id = public.clerk_user_id()
    )
  );

DROP POLICY IF EXISTS tutor_messages_delete_own ON public.tutor_messages;
CREATE POLICY tutor_messages_delete_own ON public.tutor_messages
  FOR DELETE
  USING (
    conversation_id IN (
      SELECT id FROM public.tutor_conversations
      WHERE student_id = public.clerk_user_id()
    )
  );

COMMIT;
