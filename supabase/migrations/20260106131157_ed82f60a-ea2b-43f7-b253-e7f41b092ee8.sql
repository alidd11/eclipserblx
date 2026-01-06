-- Allow thread authors to delete their own threads
CREATE POLICY "Users can delete their own threads"
ON public.forum_threads
FOR DELETE
USING (auth.uid() = user_id);