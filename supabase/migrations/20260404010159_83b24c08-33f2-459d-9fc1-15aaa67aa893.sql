
-- Remove the overly permissive modmail INSERT policy
-- "Staff can insert modmail messages" already exists with proper is_staff() check
DROP POLICY IF EXISTS "Authenticated staff can insert messages" ON public.discord_modmail_messages;
