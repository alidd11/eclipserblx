ALTER TABLE public.twitter_posts
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;

-- Index for quickly finding queued tweets ready to post
CREATE INDEX IF NOT EXISTS idx_twitter_posts_scheduled 
  ON public.twitter_posts (scheduled_for) 
  WHERE status = 'queued' AND scheduled_for IS NOT NULL;