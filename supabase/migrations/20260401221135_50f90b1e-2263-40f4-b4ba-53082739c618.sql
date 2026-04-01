
-- Create twitter_hashtags table
CREATE TABLE public.twitter_hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'niche',
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.twitter_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage hashtags"
  ON public.twitter_hashtags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create twitter_posts table
CREATE TABLE public.twitter_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  hashtags_used TEXT[] NOT NULL DEFAULT '{}',
  tweet_id TEXT,
  post_type TEXT NOT NULL DEFAULT 'scheduled',
  status TEXT NOT NULL DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.twitter_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage posts"
  ON public.twitter_posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_twitter_hashtags_updated_at
  BEFORE UPDATE ON public.twitter_hashtags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_twitter_posts_updated_at
  BEFORE UPDATE ON public.twitter_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pre-seed hashtags
INSERT INTO public.twitter_hashtags (tag, category) VALUES
  ('#RobloxDev', 'niche'),
  ('#RobloxStudio', 'niche'),
  ('#GameDev', 'niche'),
  ('#IndieDev', 'niche'),
  ('#RobloxDevelopers', 'audience'),
  ('#UGCDev', 'audience'),
  ('#RobloxMarketplace', 'audience'),
  ('#Roblox', 'audience'),
  ('#RobloxUGC', 'content'),
  ('#RobloxAssets', 'content'),
  ('#GameAssets', 'content'),
  ('#DigitalStore', 'content'),
  ('#RobloxScripts', 'content'),
  ('#RobloxModels', 'content');
