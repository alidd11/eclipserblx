-- Enable realtime for bot_installation_codes table
ALTER TABLE public.bot_installation_codes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_installation_codes;