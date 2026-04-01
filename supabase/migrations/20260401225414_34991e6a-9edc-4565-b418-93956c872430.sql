INSERT INTO storage.buckets (id, name, public) VALUES ('podcast-videos', 'podcast-videos', false);

CREATE POLICY "Admins can upload podcast videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'podcast-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view podcast videos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'podcast-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access podcast videos"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'podcast-videos');