
-- Add threading and pin support to staff_chat_messages
ALTER TABLE public.staff_chat_messages 
  ADD COLUMN IF NOT EXISTS thread_parent_id uuid REFERENCES public.staff_chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_by uuid,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_staff_chat_thread_parent ON public.staff_chat_messages(thread_parent_id) WHERE thread_parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_chat_pinned ON public.staff_chat_messages(is_pinned) WHERE is_pinned = true;

-- Add threading and pin support to admin_chat_messages
ALTER TABLE public.admin_chat_messages 
  ADD COLUMN IF NOT EXISTS thread_parent_id uuid REFERENCES public.admin_chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_by uuid,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_admin_chat_thread_parent ON public.admin_chat_messages(thread_parent_id) WHERE thread_parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_chat_pinned ON public.admin_chat_messages(is_pinned) WHERE is_pinned = true;

-- Read receipts table
CREATE TABLE IF NOT EXISTS public.chat_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL,
  last_read_message_id uuid,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel)
);

ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all read receipts" ON public.chat_read_receipts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can upsert own read receipts" ON public.chat_read_receipts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own read receipts" ON public.chat_read_receipts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
