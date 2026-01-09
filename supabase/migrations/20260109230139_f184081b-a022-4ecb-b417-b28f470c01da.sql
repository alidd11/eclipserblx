-- Set REPLICA IDENTITY FULL for reliable realtime on staff chat tables
ALTER TABLE public.staff_messages REPLICA IDENTITY FULL;
ALTER TABLE public.staff_message_reads REPLICA IDENTITY FULL;