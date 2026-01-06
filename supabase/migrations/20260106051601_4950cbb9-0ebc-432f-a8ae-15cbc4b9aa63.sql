-- Create forum categories table
CREATE TABLE public.forum_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT 'purple',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum threads table
CREATE TABLE public.forum_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum posts table
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- Forum categories policies (anyone can view)
CREATE POLICY "Anyone can view forum categories"
  ON public.forum_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage forum categories"
  ON public.forum_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Forum threads policies
CREATE POLICY "Anyone can view forum threads"
  ON public.forum_threads FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create threads"
  ON public.forum_threads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
  ON public.forum_threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all threads"
  ON public.forum_threads FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Forum posts policies
CREATE POLICY "Anyone can view forum posts"
  ON public.forum_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.forum_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all posts"
  ON public.forum_posts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default forum categories
INSERT INTO public.forum_categories (name, slug, description, icon, color, display_order) VALUES
  ('Announcements', 'announcements', 'Official news and updates from Eclipse', 'megaphone', 'purple', 1),
  ('General Discussion', 'general', 'Chat about anything Roblox UK roleplay related', 'message-circle', 'blue', 2),
  ('Asset Requests', 'requests', 'Request new assets or features', 'sparkles', 'pink', 3),
  ('Showcase', 'showcase', 'Show off your creations using Eclipse assets', 'image', 'green', 4),
  ('Support', 'support', 'Get help with your purchases', 'help-circle', 'orange', 5);

-- Create trigger for updating thread timestamps
CREATE TRIGGER update_forum_threads_updated_at
  BEFORE UPDATE ON public.forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();