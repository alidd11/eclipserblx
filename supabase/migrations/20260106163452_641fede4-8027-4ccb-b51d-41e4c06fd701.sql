-- Create forum_chat_messages table for real-time general chat
CREATE TABLE public.forum_chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.forum_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can view chat messages
CREATE POLICY "Anyone can view chat messages"
ON public.forum_chat_messages
FOR SELECT
USING (true);

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages"
ON public.forum_chat_messages
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.forum_chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can delete any messages
CREATE POLICY "Admins can delete any messages"
ON public.forum_chat_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_chat_messages;