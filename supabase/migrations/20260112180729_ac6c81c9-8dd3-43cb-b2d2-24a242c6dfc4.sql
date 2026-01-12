-- Create reactions table for staff chat messages
CREATE TABLE public.staff_chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.staff_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

-- Create reactions table for admin chat messages
CREATE TABLE public.admin_chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.admin_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

-- Enable RLS on both tables
ALTER TABLE public.staff_chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_chat_reactions ENABLE ROW LEVEL SECURITY;

-- Staff chat reactions policies (staff can manage)
CREATE POLICY "Staff can view all staff chat reactions"
  ON public.staff_chat_reactions FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can add their own reactions"
  ON public.staff_chat_reactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Staff can remove their own reactions"
  ON public.staff_chat_reactions FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()) AND auth.uid() = user_id);

-- Admin chat reactions policies (admins only)
CREATE POLICY "Admins can view all admin chat reactions"
  ON public.admin_chat_reactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can add their own reactions"
  ON public.admin_chat_reactions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

CREATE POLICY "Admins can remove their own reactions"
  ON public.admin_chat_reactions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

-- Enable realtime for both reaction tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_chat_reactions;

-- Create indexes for efficient queries
CREATE INDEX idx_staff_chat_reactions_message ON public.staff_chat_reactions(message_id);
CREATE INDEX idx_admin_chat_reactions_message ON public.admin_chat_reactions(message_id);