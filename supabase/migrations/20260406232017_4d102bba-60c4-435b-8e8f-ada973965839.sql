-- Create a view that hides correct_answer for regular users
CREATE OR REPLACE VIEW public.discord_trivia_questions_safe AS
SELECT
  id,
  question,
  wrong_answers,
  category,
  difficulty,
  created_at
FROM public.discord_trivia_questions;

-- Only service role and staff can see full trivia data (including answers)
CREATE POLICY "Staff can read trivia questions"
ON public.discord_trivia_questions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'moderator')
);