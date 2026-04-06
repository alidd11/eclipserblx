
-- Fix trivia: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can read trivia questions" ON public.discord_trivia_questions;
CREATE POLICY "Authenticated users can read trivia questions"
  ON public.discord_trivia_questions FOR SELECT TO authenticated
  USING (true);

-- Also allow service role (for bot edge functions)
CREATE POLICY "Service role can read trivia questions"
  ON public.discord_trivia_questions FOR SELECT TO service_role
  USING (true);
