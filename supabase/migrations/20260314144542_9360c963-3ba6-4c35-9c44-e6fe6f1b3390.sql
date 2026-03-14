
-- Game news feeds configuration
CREATE TABLE public.game_news_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  feed_url text NOT NULL,
  feed_type text NOT NULL DEFAULT 'rss',
  discord_channel_id text NOT NULL,
  ping_role_id text,
  enabled boolean NOT NULL DEFAULT true,
  check_interval_minutes integer NOT NULL DEFAULT 10,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Track posted articles for deduplication
CREATE TABLE public.game_news_posted (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id uuid NOT NULL REFERENCES public.game_news_feeds(id) ON DELETE CASCADE,
  article_url text NOT NULL,
  article_title text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feed_id, article_url)
);

-- RLS
ALTER TABLE public.game_news_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_news_posted ENABLE ROW LEVEL SECURITY;

-- Only staff can manage feeds
CREATE POLICY "Staff can view feeds" ON public.game_news_feeds
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead_administrator'));

CREATE POLICY "Staff can insert feeds" ON public.game_news_feeds
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead_administrator'));

CREATE POLICY "Staff can update feeds" ON public.game_news_feeds
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead_administrator'));

CREATE POLICY "Staff can delete feeds" ON public.game_news_feeds
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead_administrator'));

-- Posted articles: staff can view, service role handles inserts
CREATE POLICY "Staff can view posted" ON public.game_news_posted
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead_administrator'));

-- Allow anon/service to read feeds and insert posted (for edge function via service role)
CREATE POLICY "Service can read feeds" ON public.game_news_feeds
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Service can read posted" ON public.game_news_posted
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Service can insert posted" ON public.game_news_posted
  FOR INSERT TO anon
  WITH CHECK (true);
