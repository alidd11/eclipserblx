-- Set REPLICA IDENTITY FULL for chat_messages to ensure realtime works correctly with RLS
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Set REPLICA IDENTITY FULL for chat_conversations for consistency
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;