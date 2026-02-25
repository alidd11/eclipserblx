
-- Email thread types
CREATE TYPE public.ip_email_thread_type AS ENUM ('dmca_takedown', 'abuse_complaint', 'general');
CREATE TYPE public.ip_email_direction AS ENUM ('outbound', 'inbound');
CREATE TYPE public.ip_email_status AS ENUM ('draft', 'sending', 'sent', 'delivered', 'failed', 'bounced');

-- Email threads table
CREATE TABLE public.ip_email_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  subject TEXT NOT NULL,
  thread_type public.ip_email_thread_type NOT NULL DEFAULT 'general',
  takedown_id UUID REFERENCES public.takedown_requests(id) ON DELETE SET NULL,
  complaint_id UUID REFERENCES public.ip_abuse_complaints(id) ON DELETE SET NULL,
  registry_id UUID REFERENCES public.creator_ip_registry(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email messages table
CREATE TABLE public.ip_email_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.ip_email_threads(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  direction public.ip_email_direction NOT NULL DEFAULT 'outbound',
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status public.ip_email_status NOT NULL DEFAULT 'draft',
  resend_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ip_email_threads_creator ON public.ip_email_threads(creator_id);
CREATE INDEX idx_ip_email_threads_type ON public.ip_email_threads(thread_type);
CREATE INDEX idx_ip_email_threads_takedown ON public.ip_email_threads(takedown_id);
CREATE INDEX idx_ip_email_threads_complaint ON public.ip_email_threads(complaint_id);
CREATE INDEX idx_ip_email_messages_thread ON public.ip_email_messages(thread_id);
CREATE INDEX idx_ip_email_messages_status ON public.ip_email_messages(status);

-- Enable RLS
ALTER TABLE public.ip_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_email_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Customers can view their own threads
CREATE POLICY "Users can view own email threads"
  ON public.ip_email_threads FOR SELECT
  USING (auth.uid() = creator_id);

-- RLS: Staff can view all threads
CREATE POLICY "Staff can view all email threads"
  ON public.ip_email_threads FOR SELECT
  USING (public.has_permission(auth.uid(), 'ip_shield_staff'));

-- RLS: Staff can insert threads
CREATE POLICY "Staff can create email threads"
  ON public.ip_email_threads FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(), 'ip_shield_staff'));

-- RLS: Users can create threads (for self-filed cases)
CREATE POLICY "Users can create own email threads"
  ON public.ip_email_threads FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- RLS: Staff can update threads
CREATE POLICY "Staff can update email threads"
  ON public.ip_email_threads FOR UPDATE
  USING (public.has_permission(auth.uid(), 'ip_shield_staff'));

-- RLS: Messages - customers can view messages in their threads
CREATE POLICY "Users can view own thread messages"
  ON public.ip_email_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ip_email_threads t
    WHERE t.id = thread_id AND t.creator_id = auth.uid()
  ));

-- RLS: Messages - staff can view all messages
CREATE POLICY "Staff can view all email messages"
  ON public.ip_email_messages FOR SELECT
  USING (public.has_permission(auth.uid(), 'ip_shield_staff'));

-- RLS: Messages - staff can insert messages
CREATE POLICY "Staff can create email messages"
  ON public.ip_email_messages FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(), 'ip_shield_staff'));

-- RLS: Service role / edge functions can insert messages (for automated emails)
CREATE POLICY "Users can insert messages in own threads"
  ON public.ip_email_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ip_email_threads t
    WHERE t.id = thread_id AND t.creator_id = auth.uid()
  ));

-- Timestamp trigger
CREATE TRIGGER update_ip_email_threads_updated_at
  BEFORE UPDATE ON public.ip_email_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update last_message_at on new message
CREATE OR REPLACE FUNCTION public.update_thread_last_message()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  UPDATE public.ip_email_threads
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_thread_on_new_message
  AFTER INSERT ON public.ip_email_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_last_message();
