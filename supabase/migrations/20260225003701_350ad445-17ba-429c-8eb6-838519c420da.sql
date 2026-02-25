
-- IP Shield Contact Messages table
CREATE TABLE public.ip_shield_contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_notes TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ip_shield_contact_messages ENABLE ROW LEVEL SECURITY;

-- Users can insert their own messages
CREATE POLICY "Users can submit IP Shield contact messages"
ON public.ip_shield_contact_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own messages
CREATE POLICY "Users can view own IP Shield messages"
ON public.ip_shield_contact_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Staff with ip_shield_staff permission can view all
CREATE POLICY "IP Shield staff can view all messages"
ON public.ip_shield_contact_messages
FOR SELECT
TO authenticated
USING (public.has_permission(auth.uid(), 'ip_shield_staff'));

-- Staff can update messages (assign, respond, change status)
CREATE POLICY "IP Shield staff can update messages"
ON public.ip_shield_contact_messages
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'ip_shield_staff'));

-- Staff can delete messages
CREATE POLICY "IP Shield staff can delete messages"
ON public.ip_shield_contact_messages
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'ip_shield_staff'));

-- Add the ip_shield_staff permission if it doesn't exist
INSERT INTO public.permissions (name, description, category)
VALUES ('ip_shield_staff', 'Access to IP Shield staff dashboard - manage takedowns, custom plans, and contact messages', 'IP Shield')
ON CONFLICT (name) DO NOTHING;

-- Enable realtime for the contact messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ip_shield_contact_messages;
