-- Add reply_to_id column to staff_chat_messages for quote/reply feature
ALTER TABLE public.staff_chat_messages
ADD COLUMN reply_to_id UUID REFERENCES public.staff_chat_messages(id) ON DELETE SET NULL;

-- Add reply_to_id column to admin_chat_messages for quote/reply feature
ALTER TABLE public.admin_chat_messages
ADD COLUMN reply_to_id UUID REFERENCES public.admin_chat_messages(id) ON DELETE SET NULL;

-- Create indexes for efficient reply lookups
CREATE INDEX idx_staff_chat_messages_reply_to_id ON public.staff_chat_messages(reply_to_id);
CREATE INDEX idx_admin_chat_messages_reply_to_id ON public.admin_chat_messages(reply_to_id);