-- YouTube podcast uploads tracking
CREATE TABLE public.youtube_podcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  youtube_video_id TEXT,
  youtube_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  privacy_status TEXT NOT NULL DEFAULT 'public',
  category TEXT DEFAULT 'Education',
  tags TEXT[] DEFAULT '{}',
  error_message TEXT,
  uploaded_by UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_podcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage youtube podcasts"
  ON public.youtube_podcasts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_youtube_podcasts_updated_at
  BEFORE UPDATE ON public.youtube_podcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();