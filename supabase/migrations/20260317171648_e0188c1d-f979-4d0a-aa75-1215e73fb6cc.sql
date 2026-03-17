
-- Fix search_path on move_to_dlq (must drop due to return type change)
DROP FUNCTION IF EXISTS public.move_to_dlq(text, text, bigint, jsonb);
CREATE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
END;
$$;

-- Tighten game_news_posted INSERT policy
DROP POLICY IF EXISTS "Service can insert posted" ON public.game_news_posted;
CREATE POLICY "Admins can insert posted"
  ON public.game_news_posted
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
