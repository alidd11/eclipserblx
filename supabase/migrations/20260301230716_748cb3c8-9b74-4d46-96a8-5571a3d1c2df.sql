
-- Fix overly permissive "service role" INSERT policies
-- These tables should only be written to by authenticated staff or edge functions

-- 1. discord_modmail_messages: restrict to authenticated users (staff reply via edge function uses service_role key)
DROP POLICY IF EXISTS "Service role can insert messages" ON public.discord_modmail_messages;
CREATE POLICY "Authenticated staff can insert messages"
ON public.discord_modmail_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. discord_modmail_tickets: restrict to authenticated users
DROP POLICY IF EXISTS "Service role can insert tickets" ON public.discord_modmail_tickets;
CREATE POLICY "Authenticated staff can insert tickets"
ON public.discord_modmail_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. ip_copy_detections: restrict to authenticated users (staff or edge function)
DROP POLICY IF EXISTS "Service role can insert copy detections" ON public.ip_copy_detections;
CREATE POLICY "Authenticated users can insert copy detections"
ON public.ip_copy_detections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. promotion_analytics: restrict to authenticated users
DROP POLICY IF EXISTS "Service role can insert analytics" ON public.promotion_analytics;
CREATE POLICY "Authenticated users can insert promotion analytics"
ON public.promotion_analytics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. promotion_auctions: restrict to authenticated users
DROP POLICY IF EXISTS "Service role can insert auction logs" ON public.promotion_auctions;
CREATE POLICY "Authenticated users can insert auction logs"
ON public.promotion_auctions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
